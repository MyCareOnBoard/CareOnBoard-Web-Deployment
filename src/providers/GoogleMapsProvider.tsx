import {
    createContext,
    lazy,
    Suspense,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

const GoogleMapsLoader = lazy(() => import("./GoogleMapsLoader"));
const hasApiKey = Boolean(import.meta.env.VITE_GOOGLE_PLACES_API_KEY);
const ignoreGoogleMapsDemand = () => undefined;
const GoogleMapsDemandContext = createContext<() => void>(ignoreGoogleMapsDemand);

/** Requests the shared Maps loader when a Places-dependent consumer mounts. */
export function useGoogleMapsDemand(): void {
    const requestGoogleMaps = useContext(GoogleMapsDemandContext);

    useEffect(() => {
        requestGoogleMaps();
    }, [requestGoogleMaps]);
}

/**
 * Loads the Google Maps JS API (Places) once for the whole app.
 *
 * The implementation lives in a lazy sibling so non-map routes do not evaluate
 * the Google Maps package and children never suspend while it loads.
 */
export function GoogleMapsProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [requested, setRequested] = useState(false);
    const requestGoogleMaps = useCallback(() => setRequested(true), []);

    return (
        <GoogleMapsDemandContext.Provider value={requestGoogleMaps}>
            {requested && hasApiKey ? (
                <Suspense fallback={null}>
                    <GoogleMapsLoader />
                </Suspense>
            ) : null}
            {children}
        </GoogleMapsDemandContext.Provider>
    );
}
