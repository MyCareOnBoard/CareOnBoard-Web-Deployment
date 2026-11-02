import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router';
import {PlusCircle} from 'lucide-react';
import {Routes} from '@/routes/constants';
import {mileageApi, type MileageRide, type MileageSegment} from '@/lib/api/mileage';
import {useToast} from '@/hooks/use-toast';
import {useAuth} from '@/utils/auth';
import {useEmployeeShifts} from '@/hooks/useEmployeeShifts';
import {useGetEmployeeDocumentsQuery} from '@/pages/userPanel/dashboard/api';
import {toDateKey} from '@/pages/userPanel/dashboard/overviewStats';
import {cn} from '@/lib/utils';
import DriverLicenseRequiredDialog from './components/DriverLicenseRequiredDialog';
import MileageMap from './components/MileageMap';
import TrackMileageDialog, {type TripDraft} from './components/TrackMileageDialog';
import {ConfirmRideDialog, PRIMARY_BUTTON, type RideAction} from './components/RideDialogs';
import {CARD, CurrentRideCard, EmptyRides, OverviewCard, PastRidesCard, RideCardsSkeleton, UpcomingRidesCard} from './components/RideCards';
import {groupRides, liveDistance, routePath, type LatLng} from './rides';

const toLatLng = (position: GeolocationPosition): LatLng => ({lat: position.coords.latitude, lng: position.coords.longitude});

/** One location fix for starting or stopping a ride. */
function currentPosition() {
    return new Promise<LatLng>((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("This device can't share its location."));
            return;
        }
        navigator.geolocation.getCurrentPosition(position => resolve(toLatLng(position)), error => {
            reject(new Error(error.code === error.PERMISSION_DENIED
                ? 'Allow location access for this site so we can track the distance.'
                : "We couldn't find your location. Check that location is on and try again."));
        }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000});
    });
}

const errorText = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

const done: Record<RideAction, {title: string; description: string}> = {
    start: {title: 'Ride started', description: "We're tracking distance from your location."},
    resume: {title: 'Ride resumed', description: "We're tracking distance again."},
    pause: {title: 'Ride paused', description: "Tap play when you're ready to carry on."},
    finish: {title: 'Ride finished', description: 'The distance has been added to your total.'},
    cancel: {title: 'Ride cancelled', description: 'The trip was taken off your schedule.'},
};

function shiftWindow(now: Date) {
    return {
        startDate: toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)),
        endDate: toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)),
    };
}

export default function MileagePage() {
    const navigate = useNavigate();
    const {toast} = useToast();
    const {user} = useAuth();
    const [rides, setRides] = useState<MileageRide[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<{action: RideAction; ride: MileageRide} | null>(null);
    const [trackOpen, setTrackOpen] = useState(false);
    const [draft, setDraft] = useState<TripDraft | null>(null);
    const [licensePrompt, setLicensePrompt] = useState(false);
    const [segments, setSegments] = useState<MileageSegment[]>([]);
    const [position, setPosition] = useState<LatLng | null>(null);

    // Clients for the trip form come from the caregiver's own shifts, by id only.
    const [now] = useState(() => new Date());
    const {startDate, endDate} = useMemo(() => shiftWindow(now), [now]);
    const {shifts} = useEmployeeShifts({agencyId: user?.agencyId, employeeId: user?.profile?.id, startDate, endDate});
    const clientIds = useMemo(() => [...new Set(shifts.map(shift => shift.clientId).filter((id): id is string => Boolean(id)))], [shifts]);

    const {data: documents = []} = useGetEmployeeDocumentsQuery();
    const hasLicense = useMemo(() => {
        const doc = documents.find(item => item.documentType === 'driver-license');
        if (!doc || doc.status === 'expired') return false;
        if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) return false;
        return doc.status === 'available' || doc.status === 'expiring-soon';
    }, [documents]);

    const fetchRides = useCallback(async () => {
        try {
            const response = await mileageApi.list({limit: 100});
            setRides(response.data ?? []);
            setTotal(response.totalMileage ?? 0);
            setLoadError(false);
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { fetchRides(); }, [fetchRides]);

    const {current, upcoming, past} = useMemo(() => groupRides(rides), [rides]);
    const active = current && (current.status === 'in_progress' || current.status === 'paused') ? current : null;
    const running = active?.status === 'in_progress';

    // The active ride's legs, for the route on the map and the live distance.
    const activeKey = active ? `${active.id}:${active.status}:${active.segmentCount ?? 0}` : '';
    useEffect(() => {
        if (!active) {
            setSegments([]);
            return;
        }
        let stale = false;
        mileageApi.getSegments(active.id)
            .then(response => { if (!stale) setSegments(response.data ?? []); })
            .catch(() => { if (!stale) setSegments([]); });
        return () => { stale = true; };
        // activeKey changes whenever the ride starts, pauses or gains a leg.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeKey]);

    // Follow the caregiver on the map during a ride, or whenever they've already allowed location.
    // We never prompt for location just for opening the page.
    useEffect(() => {
        if (!navigator.geolocation) return;
        let watchId: number | null = null;
        let cancelled = false;
        const watch = () => {
            if (cancelled || watchId !== null) return;
            watchId = navigator.geolocation.watchPosition(next => setPosition(toLatLng(next)), () => undefined,
                {enableHighAccuracy: Boolean(active), maximumAge: 15000, timeout: 30000});
        };
        if (active) watch();
        else navigator.permissions?.query({name: 'geolocation'}).then(status => { if (status.state === 'granted') watch(); }).catch(() => undefined);
        return () => {
            cancelled = true;
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [Boolean(active)]); // eslint-disable-line react-hooks/exhaustive-deps

    const path = useMemo(() => routePath(segments), [segments]);
    const distance = active ? liveDistance(segments, running ? position : null) : null;

    const openTrack = (next: TripDraft | null = null) => {
        if (!hasLicense) {
            setLicensePrompt(true);
            return;
        }
        setDraft(next);
        setTrackOpen(true);
    };

    const runAction = async () => {
        if (!pending) return;
        const {action, ride} = pending;
        setBusy(true);
        try {
            if (action === 'start' || action === 'resume') {
                const here = await currentPosition();
                setPosition(here);
                await mileageApi.start(ride.id, {startLocation: {latitude: here.lat, longitude: here.lng}});
            } else if (action === 'pause' || (action === 'finish' && ride.status === 'in_progress')) {
                // Completing only works on a paused ride, so finishing a moving ride pauses it first.
                const here = await currentPosition();
                setPosition(here);
                await mileageApi.stop(ride.id, {endLocation: {latitude: here.lat, longitude: here.lng}});
                if (action === 'finish') await mileageApi.complete(ride.id);
            } else if (action === 'finish') {
                await mileageApi.complete(ride.id);
            } else {
                await mileageApi.cancel(ride.id, {cancelReason: 'Cancelled by caregiver'});
            }
            toast(done[action]);
            setPending(null);
        } catch (error) {
            toast({title: "That didn't work", variant: 'destructive', description: errorText(error, 'Please try again.')});
        } finally {
            setBusy(false);
            fetchRides();
        }
    };

    const empty = !loading && !loadError && !rides.length;

    return <div className="flex min-h-[calc(100vh-200px)] flex-col">
        <div className="flex flex-1 flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Mileage</h1>
                {!loading && !empty && <button type="button" onClick={() => openTrack()} className={cn(PRIMARY_BUTTON, 'h-10 w-auto')}>
                    <PlusCircle className="h-4 w-4" aria-hidden="true"/> Log mileage
                </button>}
            </div>

            <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <MileageMap position={position} path={path} live={running}
                    className="h-[300px] overflow-hidden rounded-[12px] border border-[#e8edef] sm:h-[400px] lg:h-auto lg:min-h-[600px] dark:border-white/10"/>

                <aside aria-label="Your mileage" className="flex flex-col gap-3">
                    <OverviewCard total={total} loading={loading}/>
                    {loading ? <RideCardsSkeleton/>
                        : loadError ? <p role="alert" className={cn(CARD, 'text-center text-[13px] text-[#b3371c] dark:text-[#f3a08c]')}>
                            We couldn&apos;t load your rides.{' '}
                            <button type="button" onClick={() => { setLoading(true); fetchRides(); }} className="cursor-pointer font-semibold underline">Try again</button>
                        </p>
                        : empty ? <EmptyRides onLog={() => openTrack()}/>
                        : <>
                            {current && <CurrentRideCard ride={current} distance={distance} busy={busy} onAction={(action, ride) => setPending({action, ride})}/>}
                            <UpcomingRidesCard rides={upcoming} locked={Boolean(active)} busy={busy} onAction={(action, ride) => setPending({action, ride})}/>
                            <PastRidesCard rides={past} onRepeat={ride => openTrack({
                                type: ride.clientId ? 'client' : 'agency', purpose: ride.purpose ?? '', clientId: ride.clientId, notes: ride.notes ?? '',
                            })}/>
                        </>}
                </aside>
            </div>
        </div>

        <TrackMileageDialog open={trackOpen} onOpenChange={setTrackOpen} onCreated={fetchRides} clientIds={clientIds} draft={draft}/>
        <ConfirmRideDialog action={pending?.action ?? null} busy={busy} onConfirm={runAction} onClose={() => { if (!busy) setPending(null); }}/>
        <DriverLicenseRequiredDialog open={licensePrompt} onOpenChange={setLicensePrompt}
            onGoToDocuments={() => { setLicensePrompt(false); navigate(Routes.userPanel.dashboard); }}/>
    </div>;
}
