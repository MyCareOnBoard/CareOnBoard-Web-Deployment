import { LoadScript } from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";

const libraries: Libraries = ["places"];

export function GoogleMapsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? "";

    if (!apiKey) {
        return <>{children}</>;
    }

    return (
        <LoadScript
            googleMapsApiKey={apiKey}
            libraries={libraries}
        >
            {children}
        </LoadScript>
    );
}
