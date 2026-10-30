import {useEffect, useMemo, useState} from 'react';
import {GoogleMap, MarkerF, useJsApiLoader} from '@react-google-maps/api';
import {MapPin} from 'lucide-react';
import {cn} from '@/lib/utils';
import {apiKey, GOOGLE_MAPS_LOADER_ID, libraries} from '@/providers/GoogleMapsLoader';

export type Position = {lat: number; lng: number};

/** Addresses already looked up this session, so reopening a shift doesn't geocode it again. */
const geocodeCache = new Map<string, Position>();

const MAP_OPTIONS: google.maps.MapOptions = {
    disableDefaultUI: true,
    clickableIcons: false,
    keyboardShortcuts: false,
    gestureHandling: 'cooperative',
};

// The Routes library (google.maps.routes) is newer than our @types/google.maps, so type the bits we use.
interface ComputedRoute {
    distanceMeters?: number;
    durationMillis?: number;
    viewport?: google.maps.LatLngBounds;
    createPolylines: () => google.maps.Polyline[];
}
interface RoutesLibrary {
    Route: {computeRoutes: (request: Record<string, unknown>) => Promise<{routes?: ComputedRoute[]}>};
}

/** "2.3 mi · 9 min drive" from the route's distance and time. */
function describeRoute(route: ComputedRoute) {
    if (route.distanceMeters === undefined || route.durationMillis === undefined) return null;
    const miles = route.distanceMeters / 1609.344;
    const minutes = Math.max(1, Math.round(route.durationMillis / 60_000));
    const time = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi · ${time} drive`;
}

/** Straight-line distance in miles, for when a driving route isn't available. */
function milesBetween(a: Position, b: Position) {
    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Tinted stand-in shown while the map loads, or when there is no map to show. */
function MapPlaceholder({tall}: {tall?: boolean}) {
    return <div className={cn('grid place-items-center bg-[#e9f1f1] dark:bg-[#16292b]', tall ? 'h-[240px]' : 'h-[120px]')} aria-hidden="true">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#007679]/15 text-[#007679] dark:text-[#7fe0e2]">
            <MapPin className="h-6 w-6"/>
        </span>
    </div>;
}

/** Turns stored "lat"/"lon" strings into a map position, or null when either is missing. */
function readPosition(lat?: string, lon?: string): Position | null {
    const position = {lat: Number(lat), lng: Number(lon)};
    return lat && lon && Number.isFinite(position.lat) && Number.isFinite(position.lng) ? position : null;
}

interface Props {
    address: string;
    lat?: string;
    lon?: string;
    /** Where the viewer is; with `showRoute`, the map shows the way from here to the address. */
    origin?: Position | null;
    showRoute?: boolean;
    /** "2.3 mi · 9 mins drive", or a straight-line distance when no driving route is available. */
    onRouteSummary?: (summary: string | null) => void;
}

function LoadedMap({address, lat, lon, origin, showRoute, onRouteSummary}: Props) {
    const {isLoaded, loadError} = useJsApiLoader({id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: apiKey, libraries});
    // Memoised: GoogleMap re-centres whenever `center` is a new object.
    const stored = useMemo(() => readPosition(lat, lon), [lat, lon]);
    const [geocoded, setGeocoded] = useState<Position | null>(() => geocodeCache.get(address) ?? null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [routeSummary, setRouteSummary] = useState<string | null>(null);
    const [routeFailed, setRouteFailed] = useState(false);

    // No saved coordinates: look the address up once the Maps script is ready.
    useEffect(() => {
        if (stored || !isLoaded || !address || geocodeCache.has(address)) return;
        let cancelled = false;
        new google.maps.Geocoder().geocode({address}, (results, status) => {
            const location = status === 'OK' ? results?.[0]?.geometry.location : undefined;
            if (!location) return;
            const position = {lat: location.lat(), lng: location.lng()};
            geocodeCache.set(address, position);
            if (!cancelled) setGeocoded(position);
        });
        return () => { cancelled = true; };
    }, [stored, isLoaded, address]);

    const position = stored ?? geocoded;
    // Plain numbers, so effects don't re-run on every render's fresh position objects.
    const fromLat = showRoute ? origin?.lat : undefined;
    const fromLng = showRoute ? origin?.lng : undefined;
    const toLat = position?.lat;
    const toLng = position?.lng;
    const routeWanted = isLoaded && fromLat !== undefined && fromLng !== undefined && toLat !== undefined && toLng !== undefined;

    // Draw a driving route with the Routes API. If the key can't use it, fall back to both pins and the distance.
    useEffect(() => {
        setRouteSummary(null);
        setRouteFailed(false);
        if (!routeWanted || !map) return;
        let cancelled = false;
        let drawn: google.maps.Polyline[] = [];
        (async () => {
            try {
                const {Route} = await google.maps.importLibrary('routes') as unknown as RoutesLibrary;
                const {routes} = await Route.computeRoutes({
                    origin: {lat: fromLat!, lng: fromLng!},
                    destination: {lat: toLat!, lng: toLng!},
                    travelMode: 'DRIVING',
                    fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
                });
                const route = routes?.[0];
                if (!route) throw new Error('No route');
                if (cancelled) return;
                drawn = route.createPolylines();
                drawn.forEach(line => { line.setOptions({strokeColor: '#007679', strokeWeight: 5, strokeOpacity: 0.9}); line.setMap(map); });
                if (route.viewport) map.fitBounds(route.viewport, 32);
                setRouteSummary(describeRoute(route));
            } catch (error) {
                if (!cancelled) {
                    console.warn('Route unavailable, showing distance instead:', error);
                    setRouteFailed(true);
                }
            }
        })();
        return () => {
            cancelled = true;
            drawn.forEach(line => line.setMap(null));
        };
    }, [routeWanted, map, fromLat, fromLng, toLat, toLng]);

    useEffect(() => {
        if (!onRouteSummary) return;
        if (routeSummary) onRouteSummary(routeSummary);
        else if (routeFailed && routeWanted) {
            const miles = milesBetween({lat: fromLat!, lng: fromLng!}, {lat: toLat!, lng: toLng!});
            onRouteSummary(`${miles.toFixed(1)} mi away in a straight line`);
        } else onRouteSummary(null);
    }, [routeSummary, routeFailed, routeWanted, fromLat, fromLng, toLat, toLng, onRouteSummary]);

    // With the route on, frame both pins (a drawn route then fits itself); off again, back to the address.
    useEffect(() => {
        if (!map || toLat === undefined || toLng === undefined) return;
        if (fromLat !== undefined && fromLng !== undefined) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({lat: fromLat, lng: fromLng});
            bounds.extend({lat: toLat, lng: toLng});
            map.fitBounds(bounds, 40);
        } else if (fromLat === undefined) {
            map.setCenter({lat: toLat, lng: toLng});
            map.setZoom(15);
        }
    }, [map, fromLat, fromLng, toLat, toLng]);

    if (!isLoaded || loadError || !position) return <MapPlaceholder tall={showRoute}/>;
    const showYou = fromLat !== undefined && fromLng !== undefined;
    return <GoogleMap mapContainerClassName={cn('w-full', showRoute ? 'h-[240px]' : 'h-[120px]')}
        center={position} zoom={15} options={MAP_OPTIONS} onLoad={setMap} onUnmount={() => setMap(null)}>
        <MarkerF position={position}/>
        {showYou && <MarkerF position={{lat: fromLat, lng: fromLng}} title="You" icon={{
            path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#2b82ff', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2,
        }}/>}
    </GoogleMap>;
}

/** A small map of the client's address, optionally with the way there. Falls back to a placeholder without a Maps key. */
export default function ShiftMap(props: Props) {
    if (!apiKey) return <MapPlaceholder/>;
    return <LoadedMap {...props}/>;
}
