import {useEffect, useMemo, useRef, useState} from 'react';
import {GoogleMap, MarkerF, PolylineF, useJsApiLoader} from '@react-google-maps/api';
import {LocateFixed, MapPin} from 'lucide-react';
import {apiKey, GOOGLE_MAPS_LOADER_ID, libraries} from '@/providers/GoogleMapsLoader';
import {cn} from '@/lib/utils';
import type {LatLng} from '../rides';

// Light grey map, as in the design, so the route and pins stand out.
const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
    {elementType: 'geometry', stylers: [{color: '#f2f3f3'}]},
    {elementType: 'labels.icon', stylers: [{visibility: 'off'}]},
    {elementType: 'labels.text.fill', stylers: [{color: '#7b8689'}]},
    {elementType: 'labels.text.stroke', stylers: [{color: '#f5f5f5'}]},
    {featureType: 'poi', elementType: 'geometry', stylers: [{color: '#e9ecec'}]},
    {featureType: 'poi.park', elementType: 'geometry', stylers: [{color: '#dfe8e4'}]},
    {featureType: 'road', elementType: 'geometry', stylers: [{color: '#ffffff'}]},
    {featureType: 'road.highway', elementType: 'geometry', stylers: [{color: '#e3e6e7'}]},
    {featureType: 'transit', stylers: [{visibility: 'off'}]},
    {featureType: 'water', elementType: 'geometry', stylers: [{color: '#c9d9d8'}]},
];

const MAP_OPTIONS: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    gestureHandling: 'cooperative',
    styles: LIGHT_STYLE,
};

/** New Jersey, for when we don't know where the caregiver is yet. */
const FALLBACK_CENTER: LatLng = {lat: 40.73, lng: -74.17};

// Teal drop pin with a person inside, like the design's start marker.
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46"><path d="M18 45c-1-4-14-14-14-27a14 14 0 0 1 28 0c0 13-13 23-14 27Z" fill="#00a3a7" stroke="#fff" stroke-width="2"/><circle cx="18" cy="16" r="8" fill="none" stroke="#fff" stroke-width="2"/><circle cx="18" cy="14" r="2.6" fill="#fff"/><path d="M13.5 21a5 5 0 0 1 9 0" stroke="#fff" stroke-width="2" fill="none"/></svg>`;
const PIN_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PIN_SVG)}`;

interface Props {
    /** Where the caregiver is now. */
    position: LatLng | null;
    /** The current ride's path so far; empty when no ride is running. */
    path: LatLng[];
    /** The ride is moving, so draw on from the last point to where the caregiver is. */
    live?: boolean;
    /** Why we can't show the caregiver's location, if we can't. */
    locationNote?: string | null;
    className?: string;
}

function Placeholder({className}: {className?: string}) {
    return <div className={className}>
        <div className="grid h-full w-full place-items-center bg-[#eef1f1] dark:bg-[#16292b]" aria-hidden="true">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#007679]/15 text-[#007679] dark:text-[#7fe0e2]">
                <MapPin className="h-6 w-6"/>
            </span>
        </div>
    </div>;
}

function LoadedMap({position, path, live = false, locationNote, className}: Props) {
    const {isLoaded, loadError} = useJsApiLoader({id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: apiKey, libraries});
    const [map, setMap] = useState<google.maps.Map | null>(null);
    // The drawn route: the saved legs, then (while moving) on to where the caregiver is now.
    const route = useMemo(() => (live && path.length && position ? [...path, position] : path), [live, path, position]);
    const start = path[0] ?? null;
    const lat = position?.lat;
    const lng = position?.lng;
    const routeKey = route.map(point => `${point.lat},${point.lng}`).join('|');

    // Frame the whole route when there is one, else follow the caregiver.
    // The first fix zooms in to street level so the caregiver can see where they are.
    const zoomedIn = useRef(false);
    useEffect(() => {
        if (!map) return;
        if (route.length > 1) {
            const bounds = new google.maps.LatLngBounds();
            route.forEach(point => bounds.extend(point));
            map.fitBounds(bounds, 48);
        } else if (lat !== undefined && lng !== undefined) {
            map.panTo({lat, lng});
            if (!zoomedIn.current) map.setZoom(15);
        }
        if (lat !== undefined) zoomedIn.current = true;
        // routeKey stands in for `route`, which is a new array on every position update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, routeKey, lat, lng]);

    const [initialCenter] = useState(() => position ?? path[0] ?? FALLBACK_CENTER);
    const [initialZoom] = useState(position ? 15 : 11);
    if (!isLoaded || loadError) return <Placeholder className={className}/>;
    return <div className={cn('relative', className)}>
        <GoogleMap mapContainerClassName="h-full w-full" center={initialCenter} zoom={initialZoom}
            options={MAP_OPTIONS} onLoad={setMap} onUnmount={() => setMap(null)}>
            {route.length > 1 && <PolylineF path={route} options={{strokeColor: '#20a35c', strokeWeight: 4, strokeOpacity: 0.95}}/>}
            {start && <MarkerF position={start} title="Ride start" icon={{url: PIN_URL, scaledSize: new google.maps.Size(36, 46), anchor: new google.maps.Point(18, 45)}}/>}
            {!start && position && <MarkerF position={position} title="You are here" icon={{url: PIN_URL, scaledSize: new google.maps.Size(36, 46), anchor: new google.maps.Point(18, 45)}}/>}
            {start && position && <>
                <MarkerF position={position} clickable={false} icon={{
                    path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#00d2d6', fillOpacity: 0.25, strokeWeight: 0,
                }}/>
                <MarkerF position={position} title="You are here" icon={{
                    path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#00d2d6', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2,
                }}/>
            </>}
        </GoogleMap>
        {position && <button type="button" onClick={() => { map?.panTo(position); map?.setZoom(15); }} aria-label="Show my location" title="Show my location"
            className="absolute left-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-[8px] bg-white text-[#007679] shadow-[0_1px_4px_rgba(16,40,44,0.2)] transition-colors hover:bg-[#f3f5f6]">
            <LocateFixed className="h-5 w-5" aria-hidden="true"/>
        </button>}
        {locationNote && <p role="status" className="absolute inset-x-3 top-3 mx-auto max-w-[420px] rounded-[8px] bg-white/95 px-3 py-2 text-center text-[13px] text-[#3d4a50] shadow-[0_1px_4px_rgba(16,40,44,0.2)]">
            {locationNote}
        </p>}
    </div>;
}

/** The mileage map: where you are and, during a ride, the way you've come. */
export default function MileageMap(props: Props) {
    if (!apiKey) return <Placeholder className={props.className}/>;
    return <LoadedMap {...props}/>;
}
