import {useCallback, useEffect, useRef, useState} from 'react';
import {addDays} from 'date-fns';
import {CalendarPlus, Loader2, MapPin, Search} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import {cn} from '@/lib/utils';
import {useAuth} from '@/utils/auth';
import {useGooglePlacesAutocomplete} from '@/hooks/useGooglePlacesAutocomplete';
import {useReverseGeocode} from '@/hooks/useReverseGeocode';
import {searchClients, type Client} from '@/lib/api/clients';
import {
    createShift, deleteShift, formatShiftLocation, listAssignedTimesheetClients, listShifts, updateShift,
    ShiftActionStatus, ShiftStatus, ShiftType, SubmissionStatus,
    type AssignedTimesheetClient, type AssignedTimesheetLocation, type CreateShiftRequest,
    type ServiceLocationSource, type Shift, type ShiftLocation,
} from '@/lib/api/shifts';
import DigitalSignatureModal from '@/pages/applicant/application/components/DigitalSignature';
import {useCheckSignatureStatusQuery, useSignDocumentMutation} from '@/pages/applicant/application/api';
import ConfirmShiftModal from './components/ConfirmShiftModal';
import SuccessModal from './components/SuccessModal';
import SignatureDropzone from './components/SignatureDropzone';
import WeekEntries from './components/WeekEntries';
import ClientLocationPicker, {assignedClientLabel, OTHER_LOCATION_ID} from './components/ClientLocationPicker';
import {Hint} from '@/pages/userPanel/records/RecordsKit';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';
import {
    buildManualShiftRequests, dateFromKey, daysToFix, emptyWeek, hasEntries, matchDraftLocation, weekFrom, weeksFromDrafts,
    type PayrollLocationSource, type Signature, type TimesheetWeek,
} from './timesheetEntries';

type SignatureTarget = 'client' | 'user';

const SIGNATURE_CONTEXT: Record<SignatureTarget, string> = {
    client: 'manual-timesheet-client',
    user: 'manual-timesheet-user',
};

const inputClass = 'h-11 w-full rounded-[8px] border border-[#e3e8ea] bg-white px-3 text-[14px] text-[#10141a] placeholder:text-[#8a979d] focus-visible:border-[#007679] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]';
const labelClass = 'mb-1.5 block text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]';
const menuClass = 'absolute z-50 mt-1 max-h-[220px] w-full overflow-y-auto rounded-[8px] border border-[#e3e8ea] bg-white shadow-lg dark:border-white/15 dark:bg-[#11191c]';
const optionClass = 'block w-full cursor-pointer border-b border-[#edf2f3] px-3.5 py-2.5 text-left text-sm text-[#10141a] last:border-b-0 hover:bg-[#f2fafa] dark:border-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/5';

/** Support coordinators manage their clients by name; field staff only see a short id. */
const canSeeClientNames = (user?: {applicantType?: string; role?: string} | null) =>
    user?.applicantType === 'support_coordinator' || user?.role === 'support_coordinator';

const clientLabel = (client: Partial<Client>, showNames: boolean) => {
    if (showNames && client.firstName && client.lastName) return `${client.firstName} ${client.lastName}`;
    return client.id ? shortClientId(client.id) ?? '' : '';
};

const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';

const errorMessage = (error: unknown, fallback: string) =>
    (error as {response?: {data?: {error?: string}}})?.response?.data?.error || fallback;

export type TimesheetState = ReturnType<typeof useTimesheetState>;

/**
 * The form's data, kept outside the form so it survives the dialog re-mounting
 * its content (it does when the signature pad opens) and closing/reopening.
 * Saved drafts and stored signatures load the first time `enabled` is true.
 */
export function useTimesheetState({enabled}: {enabled: boolean}) {
    const {user} = useAuth();
    const [loadingDrafts, setLoadingDrafts] = useState(false);
    const [client, setClient] = useState<{id: string; label: string}>({id: '', label: ''});
    const [location, setLocation] = useState('');
    // Structured location, stored the way the agency panel stores it.
    const [selectedLocation, setSelectedLocation] = useState<ShiftLocation | null>(null);
    // Field staff pick client + location together from their assigned clients.
    const [pickedLocationId, setPickedLocationId] = useState<string | null>(null);
    const [payrollSource, setPayrollSource] = useState<PayrollLocationSource | null>(null);
    const [draftLocationSource, setDraftLocationSource] = useState<ServiceLocationSource | null>(null);
    const [assignedClients, setAssignedClients] = useState<AssignedTimesheetClient[]>([]);
    const [assignedLoading, setAssignedLoading] = useState(false);
    const [assignedError, setAssignedError] = useState(false);
    const [assignedLoaded, setAssignedLoaded] = useState(false);
    const [assignedRequest, setAssignedRequest] = useState(0);
    const [weeks, setWeeks] = useState<TimesheetWeek[]>([emptyWeek()]);
    const [clientSignature, setClientSignature] = useState<Signature | null>(null);
    const [userSignature, setUserSignature] = useState<Signature | null>(null);
    const [signatureTarget, setSignatureTarget] = useState<SignatureTarget | null>(null);
    const loadedFor = useRef<string | null>(null);
    const showNames = canSeeClientNames(user);

    // Field staff only: the clients they're assigned to through client services.
    useEffect(() => {
        if (!enabled || showNames || !user?.id) return;
        const controller = new AbortController();
        setAssignedLoading(true);
        setAssignedError(false);
        listAssignedTimesheetClients({signal: controller.signal})
            .then(clients => { setAssignedClients(clients); setAssignedLoaded(true); })
            .catch(() => { if (!controller.signal.aborted) setAssignedError(true); })
            .finally(() => { if (!controller.signal.aborted) setAssignedLoading(false); });
        return () => controller.abort();
    }, [enabled, showNames, user?.id, assignedRequest]);

    const {data: savedClientSignature} = useCheckSignatureStatusQuery(SIGNATURE_CONTEXT.client, {skip: !enabled || !user?.uid});
    const {data: savedUserSignature} = useCheckSignatureStatusQuery(SIGNATURE_CONTEXT.user, {skip: !enabled || !user?.uid});

    // Restore saved drafts once per signed-in user.
    useEffect(() => {
        if (!enabled || !user?.agencyId || !user?.id || loadedFor.current === user.id) return;
        loadedFor.current = user.id;
        let cancelled = false;
        setLoadingDrafts(true);
        listShifts({
            agencyId: user.agencyId,
            employeeId: user.id,
            type: ShiftType.MANUAL,
            submissionStatus: SubmissionStatus.DRAFT,
            client: true,
            limit: 100,
        }).then(response => {
            if (cancelled) return;
            const drafts = response.shifts.filter(shift => shift.type === ShiftType.MANUAL && shift.submissionStatus === SubmissionStatus.DRAFT);
            if (drafts.length === 0) return;
            const first = drafts[0];
            const draftClient = first.client as Client | undefined;
            const clientId = draftClient?.id || first.clientId || '';
            if (clientId) setClient({id: clientId, label: clientLabel({...draftClient, id: clientId}, showNames)});
            setLocation(formatShiftLocation(first.location) || '');
            if (first.location && typeof first.location === 'object') setSelectedLocation(first.location as ShiftLocation);
            setDraftLocationSource(first.serviceLocationSource ?? null);
            setPickedLocationId(null);
            const [week1, week2] = weeksFromDrafts(drafts);
            setWeeks(week2.entries.length > 0 ? [week1, week2] : [week1]);
        }).catch(() => {
            // Drafts are a convenience; the form still works without them.
            loadedFor.current = null;
        }).finally(() => {
            if (!cancelled) setLoadingDrafts(false);
        });
        return () => {
            cancelled = true;
            // Unmounted before the drafts arrived: try again next time.
            if (loadedFor.current === user.id) loadedFor.current = null;
        };
    }, [enabled, user?.agencyId, user?.id, showNames]);

    // Prefill signatures already stored for this user.
    useEffect(() => {
        if (savedClientSignature?.success && savedClientSignature.data) {
            const {signatureType, signatureData} = savedClientSignature.data;
            setClientSignature({signatureType, signatureData});
        }
    }, [savedClientSignature]);
    useEffect(() => {
        if (savedUserSignature?.success && savedUserSignature.data) {
            const {signatureType, signatureData} = savedUserSignature.data;
            setUserSignature({signatureType, signatureData});
        }
    }, [savedUserSignature]);

    const reset = useCallback(() => {
        setWeeks([emptyWeek()]);
        setClient({id: '', label: ''});
        setLocation('');
        setSelectedLocation(null);
        setPickedLocationId(null);
        setPayrollSource(null);
        setDraftLocationSource(null);
        setClientSignature(null);
        setUserSignature(null);
    }, []);

    // Once both have loaded, match a restored draft to one of the assigned client's locations.
    useEffect(() => {
        if (showNames || !assignedLoaded || !client.id || pickedLocationId !== null) return;
        const assigned = assignedClients.find(item => item.id === client.id);
        if (!assigned) {
            // The draft's client is no longer assigned to them: make them pick again.
            setClient({id: '', label: ''});
            return;
        }
        const match = matchDraftLocation(assigned.locations, draftLocationSource, location);
        setPickedLocationId(match?.id ?? OTHER_LOCATION_ID);
        setPayrollSource(match?.source && match.payrollSourceFrom ? {source: match.source, from: match.payrollSourceFrom} : null);
    }, [showNames, assignedLoaded, assignedClients, client.id, pickedLocationId, draftLocationSource, location]);

    const pickAssigned = useCallback((picked: AssignedTimesheetClient, pickedLocation: AssignedTimesheetLocation | null) => {
        setClient({id: picked.id, label: assignedClientLabel(picked.id)});
        setDraftLocationSource(null);
        if (pickedLocation) {
            setPickedLocationId(pickedLocation.id);
            setLocation(pickedLocation.display);
            setSelectedLocation(pickedLocation.location);
            setPayrollSource(pickedLocation.source && pickedLocation.payrollSourceFrom
                ? {source: pickedLocation.source, from: pickedLocation.payrollSourceFrom} : null);
        } else {
            setPickedLocationId(OTHER_LOCATION_ID);
            setLocation('');
            setSelectedLocation(null);
            setPayrollSource(null);
        }
    }, []);

    return {
        loadingDrafts, client, setClient, location, setLocation, selectedLocation, setSelectedLocation,
        pickedLocationId, payrollSource, pickAssigned,
        assignedClients, assignedLoading, assignedError, reloadAssigned: () => setAssignedRequest(count => count + 1),
        weeks, setWeeks, clientSignature, setClientSignature, userSignature, setUserSignature,
        signatureTarget, setSignatureTarget, reset,
    };
}

interface Props {
    state: TimesheetState;
    /** In the dialog the fields scroll and Save / Submit sit in a pinned footer. */
    pinnedFooter?: boolean;
    /** Called after a successful submission once the success message is closed. */
    onSubmitted?: () => void;
}

/**
 * Bi-weekly manual timesheet: client, location, one or two weeks of check in/out
 * times and both signatures. Saving keeps the rows as drafts; submitting finalizes them.
 */
export default function ManualTimesheetForm({state, onSubmitted, pinnedFooter = false}: Props) {
    const {toast} = useToast();
    const {user} = useAuth();
    const {
        loadingDrafts, client, setClient, location, setLocation, selectedLocation, setSelectedLocation,
        pickedLocationId, payrollSource, pickAssigned, assignedClients, assignedLoading, assignedError, reloadAssigned,
        weeks, setWeeks, clientSignature, setClientSignature, userSignature, setUserSignature,
        signatureTarget, setSignatureTarget,
    } = state;
    // Field staff carry one program; scope client search to it (DSP -> ddd, Caregiver -> hha).
    const clientType = user?.applicantType === 'support_coordinator' || user?.role === 'support_coordinator'
        ? 'sc' : user?.applicantType === 'hha' || user?.role === 'hha' ? 'hha' : 'ddd';
    const showNames = canSeeClientNames(user);
    const employeeName = user?.fullName || 'You';
    const agencyName = user?.agency?.name || '';

    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    // What's typed in the client box; the chosen client is shown by its label.
    const [clientQuery, setClientQuery] = useState<string | null>(null);

    const [clientResults, setClientResults] = useState<Client[]>([]);
    const [clientMenuOpen, setClientMenuOpen] = useState(false);
    const [searchingClients, setSearchingClients] = useState(false);
    const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clientSearchId = useRef(0);
    const clientBoxRef = useRef<HTMLDivElement>(null);
    const locationBoxRef = useRef<HTMLDivElement>(null);
    const locationAutocomplete = useGooglePlacesAutocomplete();
    const {setShowSuggestions} = locationAutocomplete;

    const [signDocument] = useSignDocumentMutation();
    const {reverseGeocode} = useReverseGeocode();

    // Close the client and location menus on outside clicks.
    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (locationBoxRef.current && !locationBoxRef.current.contains(target)) setShowSuggestions(false);
            if (clientBoxRef.current && !clientBoxRef.current.contains(target)) setClientMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
        };
    }, [setShowSuggestions]);

    const fail = (title: string, description: string) => toast({title, description, variant: 'destructive'});

    const searchForClients = useCallback((query: string) => {
        if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
        if (query.trim().length < 2 || !user?.agencyId) {
            setClientMenuOpen(false);
            setClientResults([]);
            return;
        }
        const agencyId = user.agencyId;
        clientSearchTimer.current = setTimeout(async () => {
            const searchId = ++clientSearchId.current;
            setSearchingClients(true);
            setClientMenuOpen(true);
            try {
                const clients = await searchClients(query, agencyId, clientType);
                if (searchId === clientSearchId.current) setClientResults(clients);
            } catch {
                if (searchId === clientSearchId.current) setClientResults([]);
            } finally {
                if (searchId === clientSearchId.current) setSearchingClients(false);
            }
        }, 300);
    }, [user?.agencyId, clientType]);

    const chooseClient = (picked: Client) => {
        setClient({id: picked.id, label: clientLabel(picked, showNames)});
        setClientQuery(null);
        setClientMenuOpen(false);
        setClientResults([]);
        // The client's address is the usual place of service.
        if (!location.trim() && picked.address) {
            setLocation(picked.address);
            setSelectedLocation(null);
        }
    };

    const chooseSuggestion = async (placeId: string) => {
        const details = await locationAutocomplete.selectSuggestion(placeId);
        if (!details) return;
        setLocation(details.formattedAddress);
        setSelectedLocation({
            address: details.formattedAddress,
            countyState: [details.county, details.state].filter(Boolean).join(' / '),
            zipCode: details.zipCode,
            latlon: {lat: String(details.lat), lon: String(details.lng)},
        });
    };

    const locateMe = () => {
        if (!navigator.geolocation) return fail('Location unavailable', "Your browser doesn't share its location.");
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(async ({coords: {latitude, longitude}}) => {
            const latlon = {lat: String(latitude), lon: String(longitude)};
            const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            try {
                const result = await reverseGeocode(latitude, longitude);
                const address = result?.formattedAddress || coords;
                setLocation(address);
                setSelectedLocation({address, countyState: result?.state || undefined, zipCode: result?.zipCode || undefined, latlon});
            } catch {
                setLocation(coords);
                setSelectedLocation({address: coords, latlon});
            } finally {
                setGettingLocation(false);
            }
        }, error => {
            setGettingLocation(false);
            fail('Location error', error.code === error.PERMISSION_DENIED
                ? 'Location permission is off. Allow it in your browser, or type the address.'
                : "We couldn't get your location. Type the address instead.");
        });
    };

    const setWeek = (index: number, week: TimesheetWeek) => setWeeks(current => current.map((item, i) => i === index ? week : item));

    const addSecondWeek = () => setWeeks(current => {
        const start = current[0]?.startDate;
        return [current[0], start ? weekFrom(addDays(dateFromKey(start), 7)) : emptyWeek()];
    });

    /** Shared checks for save and submit. Returns false (after telling the user) when the form isn't ready. */
    const validate = (action: 'save' | 'submit') => {
        if (!user?.id || !user?.agencyId) {
            fail('Sign in again', 'Your account details are incomplete. Sign out and back in, then try again.');
            return false;
        }
        if (!client.id) {
            fail(showNames ? 'Choose a client' : 'Choose a client and location',
                showNames ? `Search for and pick the client before you ${action}.` : `Pick the client and where you worked before you ${action}.`);
            return false;
        }
        if (location.trim().length < 3) {
            fail('Add a location', `Enter where the shifts took place before you ${action}.`);
            return false;
        }
        const broken = daysToFix(weeks);
        if (broken.length > 0) {
            fail('Check your times', `Add both a check in and a different check out time for ${broken.join(', ')}.`);
            return false;
        }
        if (!hasEntries(weeks)) {
            fail('No timesheet entries', `Add check in and check out times for at least one day before you ${action}.`);
            return false;
        }
        return true;
    };

    const requests = (status: Partial<CreateShiftRequest> & {actionStatus?: ShiftActionStatus}): CreateShiftRequest[] =>
        buildManualShiftRequests({
            weeks,
            employeeId: user?.id || '',
            agencyId: user?.agencyId || '',
            clientId: client.id,
            location: selectedLocation || location.trim(),
            payrollSource: showNames ? null : payrollSource,
            clientSignature,
            userSignature,
        }).map(request => ({...request, ...status}));

    const loadDrafts = async (): Promise<Shift[]> => {
        const response = await listShifts({
            agencyId: user?.agencyId,
            employeeId: user?.id,
            type: ShiftType.MANUAL,
            submissionStatus: SubmissionStatus.DRAFT,
            limit: 100,
        });
        return response.shifts;
    };

    /** Updates the draft saved for each date, creates the rest, and deletes drafts no longer on the form. */
    const writeShifts = async (rows: CreateShiftRequest[], drafts: Shift[]) => {
        const dates = new Set(rows.map(row => row.date));
        const writes = rows.map(row => {
            const draft = drafts.find(item => item.date === row.date);
            if (!draft) return createShift(row);
            return updateShift(draft.id, {
                location: row.location,
                startTime: row.startTime,
                endTime: row.endTime,
                clockedInAt: row.clockedInAt,
                clockedOutAt: row.clockedOutAt,
                week: row.week,
                day: row.day,
                sessionDuration: row.sessionDuration,
                signatureInfo: row.signatureInfo,
                status: row.status,
                submissionStatus: row.submissionStatus,
                type: row.type,
                ...(row.serviceLocationSource ? {serviceLocationSource: row.serviceLocationSource} : {}),
            });
        });
        const removals = drafts.filter(draft => !dates.has(draft.date)).map(draft => deleteShift(draft.id));
        const [written, removed] = await Promise.all([Promise.allSettled(writes), Promise.allSettled(removals)]);
        return {
            saved: written.filter(result => result.status === 'fulfilled').length,
            failed: [...written, ...removed].filter(result => result.status === 'rejected').length,
        };
    };

    /** Stores a signature; a 409 means one is already stored for that context. */
    const uploadSignature = async (target: SignatureTarget, signature: Signature | null) => {
        if (!signature) return;
        try {
            await signDocument({context: SIGNATURE_CONTEXT[target], data: signature}).unwrap();
        } catch (error) {
            if ((error as {status?: number})?.status !== 409) throw error;
        }
    };

    const handleSave = async () => {
        if (!validate('save')) return;
        setSaving(true);
        try {
            // Signatures are optional on drafts, so a failed upload doesn't block saving.
            await Promise.allSettled([uploadSignature('client', clientSignature), uploadSignature('user', userSignature)]);
            const {saved, failed} = await writeShifts(
                requests({status: ShiftStatus.PENDING, submissionStatus: SubmissionStatus.DRAFT, type: ShiftType.MANUAL}),
                await loadDrafts(),
            );
            if (failed > 0) {
                fail('Some days were not saved', `${saved} saved, ${failed} failed. Save again to retry.`);
            } else {
                toast({title: 'Progress saved', description: 'Your timesheet is saved as a draft.', variant: 'success'});
            }
        } catch (error) {
            fail('Save failed', errorMessage(error, "We couldn't save your timesheet. Try again."));
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = () => {
        if (!clientSignature || !userSignature) {
            fail('Signatures required', 'Add both the client signature and your signature before submitting.');
            return;
        }
        if (validate('submit')) setConfirmOpen(true);
    };

    const handleConfirmSubmit = async () => {
        setSubmitting(true);
        try {
            try {
                await uploadSignature('client', clientSignature);
                await uploadSignature('user', userSignature);
            } catch {
                setConfirmOpen(false);
                fail('Signature upload failed', "We couldn't upload the signatures. Try again.");
                return;
            }
            let drafts: Shift[] = [];
            try {
                drafts = await loadDrafts();
            } catch {
                // Without the drafts list every row is created new; old drafts stay until the next save.
            }
            const rows = requests({
                status: ShiftStatus.COMPLETED,
                submissionStatus: SubmissionStatus.SUBMITTED,
                actionStatus: ShiftActionStatus.CLOCK_IN,
                type: ShiftType.MANUAL,
            });
            const {saved, failed} = await writeShifts(rows, drafts);
            setConfirmOpen(false);
            if (saved === 0) {
                fail('Submission failed', "None of the days were submitted. Try again.");
                return;
            }
            if (failed > 0) {
                fail('Partly submitted', `${saved} of ${rows.length} days were submitted. Open the timesheet again to resend the rest.`);
            }
            state.reset();
            setClientQuery(null);
            setSuccessOpen(true);
        } catch (error) {
            setConfirmOpen(false);
            fail('Submission failed', errorMessage(error, "We couldn't submit your timesheet. Try again."));
        } finally {
            setSubmitting(false);
        }
    };

    const saveSignature = (signature: Signature) => {
        if (signatureTarget === 'client') setClientSignature(signature);
        if (signatureTarget === 'user') setUserSignature(signature);
        setSignatureTarget(null);
    };

    const busy = saving || submitting;
    const signatureError = (message: string) => fail('Signature not added', message);

    const actions = <div className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-end',
        pinnedFooter && 'shrink-0 border-t border-[#edf1f2] px-5 py-4 sm:px-6 dark:border-white/10')}>
        <button type="button" onClick={handleSave} disabled={busy}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#e3e8ea] bg-white px-5 text-[14px] font-semibold text-[#10141a] hover:bg-[#f3f5f6] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>}
            {saving ? 'Saving…' : 'Save progress'}
        </button>
        <button type="button" onClick={handleSubmit} disabled={busy}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#003839] px-5 text-[14px] font-semibold text-white hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#19b5b8]">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>}
            Submit timesheet
        </button>
    </div>;

    return <>
        <div className={pinnedFooter ? 'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5 pt-4 sm:px-6 [&>*]:shrink-0' : 'flex flex-col gap-6'}>
            {loadingDrafts && <p role="status" className="flex items-center gap-2 text-sm text-[#5d6b73] dark:text-[#9aa4a8]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/> Loading your saved progress…
            </p>}

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-end">
                <div className="flex min-h-11 items-center gap-3 rounded-t-[6px] border-b-2 border-[#00a3a7] bg-[#e3f6f6] px-3 py-2 dark:bg-[#00a3a7]/15">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e5484d] text-[13px] font-semibold text-white" aria-hidden="true">{initials(employeeName)}</span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">{employeeName}</span>
                        {agencyName && <span className="block truncate text-xs text-[#5d6b73] dark:text-[#9aa4a8]">{agencyName}</span>}
                    </span>
                </div>

                {showNames ? <div ref={clientBoxRef} className="relative">
                    <label htmlFor="timesheet-client" className={labelClass}>Client name</label>
                    <div className="relative">
                        <input id="timesheet-client" value={clientQuery ?? client.label} autoComplete="off" placeholder="Search client here"
                            role="combobox" aria-expanded={clientMenuOpen} aria-controls="timesheet-client-options" aria-autocomplete="list"
                            onChange={event => { setClientQuery(event.target.value); setClient({id: '', label: ''}); searchForClients(event.target.value); }}
                            onFocus={() => { if (clientResults.length > 0) setClientMenuOpen(true); }}
                            onKeyDown={event => { if (event.key === 'Escape') setClientMenuOpen(false); }}
                            className={cn(inputClass, 'pr-10')}/>
                        <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#34434c] dark:text-[#c9d3d6]" aria-hidden="true"/>
                    </div>
                    {clientMenuOpen && <div id="timesheet-client-options" role="listbox" aria-label="Clients" className={menuClass}>
                        {searchingClients
                            ? <p className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-[#5d6b73] dark:text-[#9aa4a8]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/> Searching…</p>
                            : clientResults.length === 0
                                ? <p className="px-3.5 py-2.5 text-sm text-[#5d6b73] dark:text-[#9aa4a8]">No clients match "{clientQuery}"</p>
                                : clientResults.map(result => <button key={result.id} type="button" role="option" aria-selected={result.id === client.id}
                                    onClick={() => chooseClient(result)} className={optionClass}>
                                    <span className="block font-medium">{clientLabel(result, showNames)}</span>
                                    {result.address && <span className="mt-0.5 block truncate text-xs text-[#5d6b73] dark:text-[#9aa4a8]">{result.address}</span>}
                                </button>)}
                    </div>}
                </div> : <ClientLocationPicker clients={assignedClients} loading={assignedLoading} error={assignedError}
                    value={client.id && pickedLocationId ? {clientId: client.id, locationId: pickedLocationId} : null}
                    onChange={pickAssigned} onRetry={reloadAssigned}/>}

                {(showNames || pickedLocationId === OTHER_LOCATION_ID) && <div ref={locationBoxRef} className={cn('relative', !showNames && 'md:col-span-3')}>
                    <label htmlFor="timesheet-location" className={labelClass}>{showNames ? 'Location' : 'Where did you work?'}</label>
                    <div className="relative">
                        <input id="timesheet-location" value={location} autoComplete="off" placeholder="Search for location here"
                            onChange={event => { setLocation(event.target.value); setSelectedLocation(null); locationAutocomplete.handleInputChange(event.target.value); }}
                            onFocus={() => { if (locationAutocomplete.suggestions.length > 0) setShowSuggestions(true); }}
                            onKeyDown={event => { if (event.key === 'Escape') setShowSuggestions(false); }}
                            className={cn(inputClass, 'pr-11')}/>
                        <button type="button" onClick={locateMe} disabled={gettingLocation}
                            aria-label="Use my current location" title="Use my current location"
                            className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-[#34434c] hover:bg-[#f1f6f7] disabled:cursor-wait dark:text-[#c9d3d6] dark:hover:bg-white/5">
                            {gettingLocation ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true"/> : <MapPin className="h-5 w-5" aria-hidden="true"/>}
                        </button>
                    </div>
                    {locationAutocomplete.showSuggestions && locationAutocomplete.suggestions.length > 0 && <div className={menuClass}>
                        {locationAutocomplete.suggestions.map(suggestion => <button key={suggestion.placeId} type="button"
                            onClick={() => chooseSuggestion(suggestion.placeId)} className={cn(optionClass, 'flex items-start gap-2')}>
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#007679]" aria-hidden="true"/>
                            <span className="line-clamp-2">{suggestion.description}</span>
                        </button>)}
                    </div>}
                </div>}
            </div>

            {weeks.map((week, index) => <WeekEntries key={index} weekNumber={index + 1} week={week}
                onChange={next => setWeek(index, next)}
                onRemove={index > 0 ? () => setWeeks(current => current.slice(0, index)) : undefined}/>)}

            {weeks.length === 1 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-[#e3f6f6] px-3 py-2.5 dark:bg-[#00a3a7]/15">
                <p className="flex items-center gap-2.5 text-[14px] font-semibold text-[#005759] dark:text-[#bdf0f1]">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#00a3a7] text-white" aria-hidden="true"><CalendarPlus className="h-4 w-4"/></span>
                    Got another week to record?
                </p>
                <button type="button" onClick={addSecondWeek}
                    className="inline-flex h-9 cursor-pointer items-center rounded-[6px] bg-white px-4 text-[13px] font-semibold text-[#10141a] shadow-[0_1px_2px_rgba(16,40,44,0.08)] hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:bg-[#1b232b] dark:text-[#f4f6f7] dark:hover:bg-white/5">
                    Set up here
                </button>
            </div>}

            <section aria-labelledby="timesheet-signatures" className="flex flex-col gap-3">
                <h3 id="timesheet-signatures" className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Signature module</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <SignatureDropzone label="client signature" signature={clientSignature} onChange={setClientSignature}
                        onError={signatureError} onDraw={() => setSignatureTarget('client')}/>
                    <SignatureDropzone label="your signature" signature={userSignature} onChange={setUserSignature}
                        onError={signatureError} onDraw={() => setSignatureTarget('user')}/>
                </div>
            </section>

            <Hint>A progress note summarizes the activities done with the client during this period. The timesheet <strong>must</strong> be submitted with progress notes, or pay for the period will be reduced.</Hint>

            {!pinnedFooter && actions}
        </div>
        {pinnedFooter && actions}

        <DigitalSignatureModal
            key={signatureTarget ?? 'none'}
            isOpen={signatureTarget !== null}
            setIsOpen={open => { if (!open) setSignatureTarget(null); }}
            onSave={saveSignature}
            skipBackend
            nested
            useCase={signatureTarget ? SIGNATURE_CONTEXT[signatureTarget] : 'general'}
        />
        <ConfirmShiftModal open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={handleConfirmSubmit} loading={submitting}/>
        <SuccessModal open={successOpen} onOpenChange={open => {
            setSuccessOpen(open);
            if (!open) onSubmitted?.();
        }}/>
    </>;
}
