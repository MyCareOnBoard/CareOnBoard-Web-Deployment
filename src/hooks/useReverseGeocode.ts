export type ReverseGeocodeResult = {
    formattedAddress: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    lat: number;
    lng: number;
};

function parseAddressComponents(
    components: Array<{ long_name: string; types: string[] }>
): { street: string; city: string; state: string; zipCode: string } {
    const get = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name ?? "";

    const streetNumber = get("street_number");
    const route = get("route");
    const street = [streetNumber, route].filter(Boolean).join(" ");
    const city =
        get("locality") ||
        get("sublocality") ||
        get("sublocality_level_1") ||
        get("administrative_area_level_3");
    const state = get("administrative_area_level_1");
    const zipCode = get("postal_code");

    return { street, city, state, zipCode };
}

export function useReverseGeocode() {
    const reverseGeocode = async (
        lat: number,
        lng: number
    ): Promise<ReverseGeocodeResult | null> => {
        const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
        if (!apiKey) return null;

        const url = new URL(
            "https://maps.googleapis.com/maps/api/geocode/json"
        );
        url.searchParams.set("latlng", `${lat},${lng}`);
        url.searchParams.set("key", apiKey);

        const response = await fetch(url.toString());
        if (!response.ok) return null;

        const data = await response.json();
        if (data.status !== "OK" || !data.results?.[0]) return null;

        const result = data.results[0];
        const components = result.address_components ?? [];
        const parsed = parseAddressComponents(components);

        return {
            formattedAddress: result.formatted_address ?? "",
            ...parsed,
            lat,
            lng,
        };
    };

    return { reverseGeocode };
}
