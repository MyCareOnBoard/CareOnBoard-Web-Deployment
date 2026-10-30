import {useEffect, useState} from 'react';
import {GoogleMap, MarkerF, useJsApiLoader} from '@react-google-maps/api';
import {MapPin} from 'lucide-react';
import {apiKey, GOOGLE_MAPS_LOADER_ID, libraries} from '@/providers/GoogleMapsLoader';

type Position = {lat: number; lng: number};

/** Addresses already looked up this session, so reopening a shift doesn't geocode it again. */
const geocodeCache = new Map<string, Position>();

const MAP_OPTIONS: google.maps.MapOptions = {
    disableDefaultUI: true,
    clickableIcons: false,
    keyboardShortcuts: false,
    gestureHandling: 'cooperative',
};

/** Tinted stand-in shown while the map loads, or when there is no map to show. */
function MapPlaceholder() {
    return <div className="grid h-[120px] place-items-center bg-[#e9f1f1] dark:bg-[#16292b]" aria-hidden="true">
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

function LoadedMap({address, lat, lon}: {address: string; lat?: string; lon?: string}) {
    const {isLoaded, loadError} = useJsApiLoader({id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: apiKey, libraries});
    const stored = readPosition(lat, lon);
    const [geocoded, setGeocoded] = useState<Position | null>(() => geocodeCache.get(address) ?? null);

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
    if (!isLoaded || loadError || !position) return <MapPlaceholder/>;
    return <GoogleMap mapContainerClassName="h-[120px] w-full" center={position} zoom={15} options={MAP_OPTIONS}>
        <MarkerF position={position}/>
    </GoogleMap>;
}

/** A small map of the client's address. Falls back to a placeholder without a Maps key or a known position. */
export default function ShiftMap(props: {address: string; lat?: string; lon?: string}) {
    if (!apiKey) return <MapPlaceholder/>;
    return <LoadedMap {...props}/>;
}
