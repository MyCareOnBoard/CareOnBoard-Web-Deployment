import { useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";

// Shared with every useJsApiLoader call: the loader throws if called again with different options.
export const GOOGLE_MAPS_LOADER_ID = "google-map-script";
export const libraries: Libraries = ["places"];
export const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? "";

/** Loads the Google Maps script without blocking the application tree. */
export default function GoogleMapsLoader() {
  const { loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
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
