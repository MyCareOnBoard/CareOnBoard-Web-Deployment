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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        if (!google?.maps?.Geocoder) {
            return null;
        }

        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder();

            geocoder.geocode(
                { location: { lat, lng } },
                (results: any[] | null, status: string) => {
                    if (status !== "OK" || !results?.[0]) {
                        console.warn("Geocoding failed:", status);
                        resolve(null);
                        return;
                    }

                    const result = results[0];
                    const components = result.address_components ?? [];
                    const parsed = parseAddressComponents(components);

                    resolve({
                        formattedAddress: result.formatted_address ?? "",
                        ...parsed,
                        lat,
                        lng,
                    });
                }
            );
        });
    };

    return { reverseGeocode };
}
