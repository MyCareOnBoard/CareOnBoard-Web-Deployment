import { useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";

const libraries: Libraries = ["places"];
const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? "";

/**
 * Loads the Google Maps JS API (Places) once for the whole app.
 *
 * Uses `useJsApiLoader` instead of the `<LoadScript>` component: under React 18
 * StrictMode, `<LoadScript>` re-mounts and re-injects the script on every render,
 * which produces a mount-time "Maximum update depth exceeded" loop on every page.
 * The hook loads the script a single time and caches it globally.
 *
 * Map consumers (the autocomplete/reverse-geocode hooks) read `window.google`
 * directly and guard the not-yet-loaded state, so children render immediately
 * rather than waiting on the script.
 */
function GoogleMapsLoader() {
    const { loadError } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: apiKey,
        libraries,
    });

    useEffect(() => {
        if (loadError) {
            console.error(
                "Google Maps failed to load — address autocomplete and current-location will be unavailable:",
                loadError,
            );
        }
    }, [loadError]);

    return null;
}

export function GoogleMapsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {apiKey ? <GoogleMapsLoader /> : null}
            {children}
        </>
    );
}
