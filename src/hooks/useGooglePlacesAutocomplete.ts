import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 3;
const MAX_SUGGESTIONS = 5;

export type AddressSuggestion = {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
};

export type AddressDetails = {
    formattedAddress: string;
    street: string;
    city: string;
    county: string;
    state: string;
    zipCode: string;
    country: string;
    lat: number;
    lng: number;
};

export type UseGooglePlacesAutocompleteReturn = {
    suggestions: AddressSuggestion[];
    isSearching: boolean;
    showSuggestions: boolean;
    setShowSuggestions: (show: boolean) => void;
    handleInputChange: (query: string) => void;
    selectSuggestion: (placeId: string) => Promise<AddressDetails | null>;
    clearSuggestions: () => void;
};

type PlacePrediction = {
    placePrediction: {
        placeId: string;
        text: { text: string };
        structuredFormat?: {
            mainText?: { text: string };
            secondaryText?: { text: string };
        };
    };
};

type Place = {
    id: string;
    addressComponents?: Array<{
        longText: string;
        shortText: string;
        types: string[];
    }>;
    formattedAddress?: string;
    location?: { lat: () => number; lng: () => number };
    fetchFields: (options: { fields: string[] }) => Promise<{ place: Place }>;
};

type PlaceConstructor = new (options: { id: string }) => Place;

type AutocompleteSuggestionClass = {
    fetchAutocompleteSuggestions: (request: {
        input: string;
        sessionToken?: unknown;
    }) => Promise<{ suggestions: PlacePrediction[] }>;
};

declare global {
    interface Window {
        google?: {
            maps?: {
                importLibrary?: (library: string) => Promise<{
                    AutocompleteSuggestion: AutocompleteSuggestionClass;
                    Place: PlaceConstructor;
                }>;
            };
        };
    }
}

function parseAddressComponents(
    components: Array<{ longText: string; shortText: string; types: string[] }>
): { street: string; city: string; county: string; state: string; zipCode: string; country: string } {
    const get = (type: string) =>
        components.find((c) => c.types.includes(type))?.longText ?? "";

    const streetNumber = get("street_number");
    const route = get("route");
    const street = [streetNumber, route].filter(Boolean).join(" ");
    const city =
        get("locality") ||
        get("sublocality") ||
        get("sublocality_level_1") ||
        get("administrative_area_level_3");
    const county = get("administrative_area_level_2");
    const state = get("administrative_area_level_1");
    const zipCode = get("postal_code");
    const country = get("country");

    return { street, city, county, state, zipCode, country };
}

async function fetchPlaceDetails(
    placeId: string
): Promise<AddressDetails | null> {
    if (!window.google?.maps?.importLibrary) {
        return null;
    }

    try {
        const { Place } = await window.google.maps.importLibrary("places");
        const place = new Place({ id: placeId });
        
        await place.fetchFields({
            fields: ["addressComponents", "formattedAddress", "location"],
        });

        const components = place.addressComponents ?? [];
        const parsed = parseAddressComponents(components);
        const lat = place.location?.lat() ?? 0;
        const lng = place.location?.lng() ?? 0;

        return {
            formattedAddress: place.formattedAddress ?? "",
            ...parsed,
            lat,
            lng,
        };
    } catch (error) {
        console.error("Failed to fetch place details:", error);
        return null;
    }
}

export function useGooglePlacesAutocomplete(): UseGooglePlacesAutocompleteReturn {
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
        setShowSuggestions(false);
    }, []);

    const handleInputChange = useCallback((query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < MIN_QUERY_LENGTH) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            if (!window.google?.maps?.importLibrary) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            try {
                setIsSearching(true);
                const { AutocompleteSuggestion } = await window.google.maps.importLibrary("places");
                
                const { suggestions: predictions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input: query,
                });

                const list = predictions.slice(0, MAX_SUGGESTIONS).map((p) => ({
                    placeId: p.placePrediction.placeId,
                    description: p.placePrediction.text.text,
                    mainText:
                        p.placePrediction.structuredFormat?.mainText?.text ??
                        p.placePrediction.text.text,
                    secondaryText:
                        p.placePrediction.structuredFormat?.secondaryText?.text ?? "",
                }));

                setSuggestions(list);
                setShowSuggestions(list.length > 0);
            } catch (error) {
                console.error("Failed to fetch autocomplete suggestions:", error);
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsSearching(false);
            }
        }, DEBOUNCE_MS);
    }, []);

    const selectSuggestion = useCallback(
        async (placeId: string): Promise<AddressDetails | null> => {
            clearSuggestions();
            return fetchPlaceDetails(placeId);
        },
        [clearSuggestions]
    );

    return {
        suggestions,
        isSearching,
        showSuggestions,
        setShowSuggestions,
        handleInputChange,
        selectSuggestion,
        clearSuggestions,
    };
}
