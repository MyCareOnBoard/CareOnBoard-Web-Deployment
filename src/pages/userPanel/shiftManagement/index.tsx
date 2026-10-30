import ShiftNoteStatus from '@/pages/shared/notes/ShiftNoteStatus';
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { CalendarDays, CirclePlus, Loader2 } from "lucide-react";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { Shift, ShiftActionStatus, ShiftStatus, formatShiftLocation, categorizeShifts, clockIn as apiClockIn, clockOut as apiClockOut } from "@/lib/api/shifts";
import { convertTimeToISODate } from "@/lib/shift-expiry";
import { ClockOutModal } from "./ClockOutModal";
import { ClockInModal } from "./ClockInModal";
import { LocationErrorModal } from "./LocationErrorModal";
import { PersonalCareNoteModal } from "./components/PersonalCareNoteModal";
import DayStrip from "./components/DayStrip";
import DayTimeline from "./components/DayTimeline";
import CurrentShiftCard, { useClockInOpen } from "./components/CurrentShiftCard";
import { DaySummaryCard, NextShiftCard } from "./components/DayPanel";
import { daySummary, nextUpcomingShift } from "./timeline";
import { useNow } from "./useNow";
import ShiftDetailsDialog from "./components/ShiftDetailsDialog";
import ManualTimesheetDialog from "@/pages/userPanel/manualShiftManagement/ManualTimesheetDialog";
import { createEmployeeActivityLog } from "@/lib/api/employees";
import { getClientBasicInfo } from "@/lib/notes/clientBasicInfo";
import { HHA_PERSONAL_CARE } from "@/lib/notes/noteTypes";
import { toast } from "sonner";
import { useAuth } from "@/utils/auth/context/AuthContext";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useEmployeeShifts } from "@/hooks/useEmployeeShifts";
import { toDateKey } from "@/pages/userPanel/dashboard/overviewStats";

/** Days shown in the strip, and how many of them sit before the selected day. */
const STRIP_DAYS = 9;
const DAYS_BEFORE = 2;

// date-fns `format` throws RangeError on an unparseable value. Shift timestamps
// from the API are occasionally malformed (or absent), so format defensively —
// a single bad value must not crash the whole page.
const safeFormat = (value: string | null | undefined, pattern: string): string => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : format(d, pattern);
};

const calculateRemainingMinutes = (endTime: string, date: string): number => {
  try {
    const endDateTime = convertTimeToISODate(endTime, date);
    return Math.max(0, Math.floor((endDateTime.getTime() - Date.now()) / 60_000));
  } catch (error) {
    console.error('Error calculating remaining minutes:', error);
    return 0;
  }
};

const GEOFENCE_RADIUS_METERS = 91.44; // 300 ft — must match server CLOCK_GEOFENCE_RADIUS_METERS default

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const checkLocationMatch = (
  userCoords: { lat: number; lng: number } | null,
  shiftLocation?: Shift["location"] | null
): [boolean, number] => {
  if (!shiftLocation) return [false, 0];
  if (!userCoords) return [false, 0];

  const shiftLatLon = shiftLocation.latlon;

  if (shiftLatLon?.lat && shiftLatLon?.lon) {
    const shiftLat = parseFloat(shiftLatLon.lat);
    const shiftLon = parseFloat(shiftLatLon.lon);

    if (!isNaN(shiftLat) && !isNaN(shiftLon)) {
      const distance = calculateDistance(userCoords.lat, userCoords.lng, shiftLat, shiftLon);
      return [distance <= GEOFENCE_RADIUS_METERS, Math.round(distance)];
    }
  }

  return [false, 0];
};

export default function ShiftManagementPage() {
  const { user } = useAuth();
  const [noteSearchParams, setNoteSearchParams] = useSearchParams();
  const selectedNoteShift = noteSearchParams.get('shiftId');
  const openShiftNote = (shiftId: string) => setNoteSearchParams(previous => { const next = new URLSearchParams(previous); next.set('shiftId', shiftId); return next; });

  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [windowStart, setWindowStart] = useState(() => addDays(startOfDay(new Date()), -DAYS_BEFORE));
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [timesheetOpen, setTimesheetOpen] = useState(false);

  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [showPersonalCareModal, setShowPersonalCareModal] = useState(false);
  const [personalCareActivityLogId, setPersonalCareActivityLogId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string>("Getting location...");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [showLocationErrorModal, setShowLocationErrorModal] = useState(false);
  const [locationDistance, setLocationDistance] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const { reverseGeocode } = useReverseGeocode();

  // Shifts for the visible strip, and separately today's, which drive the
  // Clock in / Clock out bar whichever days the strip shows.
  const stripShifts = useEmployeeShifts({
    agencyId: user?.agencyId, employeeId: user?.profile?.id, client: true,
    startDate: toDateKey(windowStart), endDate: toDateKey(addDays(windowStart, STRIP_DAYS - 1)),
  });
  const todayKey = toDateKey(new Date());
  const todayShifts = useEmployeeShifts({
    agencyId: user?.agencyId, employeeId: user?.profile?.id, client: true,
    startDate: todayKey, endDate: todayKey,
  });
  const currentShift = useMemo(() => categorizeShifts(todayShifts.shifts).current, [todayShifts.shifts]);
  const clockInWindow = useClockInOpen(currentShift);
  const clockInLocked = currentShift?.actionStatus === ShiftActionStatus.CLOCK_IN && !clockInWindow.open;
  const reloadShifts = () => { stripShifts.reload(); todayShifts.reload(); };
  const now = useNow();
  const currentRunning = currentShift?.status === ShiftStatus.ONGOING || currentShift?.actionStatus === ShiftActionStatus.CLOCK_OUT;
  // The shift after the one in the Clock in / Clock out card (or the next one at all when there is none).
  const nextShift = useMemo(
    () => nextUpcomingShift(todayShifts.shifts, now, currentShift?.actionStatus ? currentShift.id : undefined),
    [todayShifts.shifts, now, currentShift],
  );
  const upNextId = currentShift?.actionStatus && !currentRunning ? currentShift.id : nextShift?.id;

  const selectedKey = toDateKey(selectedDay);
  const dayShifts = useMemo(() => stripShifts.shifts.filter(shift => shift.date === selectedKey), [stripShifts.shifts, selectedKey]);
  const summary = useMemo(() => daySummary(dayShifts, now), [dayShifts, now]);

  const selectDay = (date: Date) => {
    const day = startOfDay(date);
    setSelectedDay(day);
    const offset = differenceInCalendarDays(day, windowStart);
    if (offset < 0 || offset >= STRIP_DAYS) setWindowStart(addDays(day, -DAYS_BEFORE));
  };

  useEffect(() => {
    const update = () => setTimeRemaining(currentShift ? calculateRemainingMinutes(currentShift.endTime || '', currentShift.date) : null);
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [currentShift]);

  useEffect(() => {
    let cancelled = false;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });

          try {
            const result = await reverseGeocode(latitude, longitude);
            if (cancelled) return;
            setUserLocation(
              result?.formattedAddress ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            );
          } catch {
            if (cancelled) return;
            setUserLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        },
        (error) => {
          if (cancelled) return;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setUserLocation("Location access denied");
              break;
            case error.POSITION_UNAVAILABLE:
              setUserLocation("Location unavailable");
              break;
            case error.TIMEOUT:
              setUserLocation("Location request timeout");
              break;
            default:
              setUserLocation("Location error");
          }
          setLocationError(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setUserLocation("Geolocation not supported");
      setLocationError(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  /** Checks location for the current shift, then opens the Clock in / Clock out confirmation. */
  const handleShiftAction = () => {
    const shift = currentShift;
    if (!shift?.actionStatus) return;
    if (clockInLocked) {
      toast.error('Too early to clock in', { description: 'Clock in opens 5 minutes before the shift starts.' });
      return;
    }
    setOpenShift(null);

    if (locationError || !userCoords) {
      toast.error('Location unavailable', {
        description: shift.actionStatus === ShiftActionStatus.CLOCK_IN
          ? 'Please enable location services and try again'
          : 'Please enable location services to clock out',
      });
      return;
    }

    const [isLocationMatch, distance] = checkLocationMatch(userCoords, shift.location);
    if (!isLocationMatch) {
      setShowLocationErrorModal(true);
      setLocationDistance(distance);
      return;
    }
    if (shift.actionStatus === ShiftActionStatus.CLOCK_IN) setShowClockInModal(true);
    else setShowClockOutModal(true);
  };

  const handleClockInConfirm = async () => {
    if (!currentShift) return;

    if (!userCoords) {
      toast.error('Location unavailable', {
        description: 'Cannot clock in without GPS coordinates',
      });
      return;
    }

    try {
      setActionBusy(true);
      const response = await apiClockIn(currentShift.id, {
        latitude: userCoords.lat,
        longitude: userCoords.lng,
      });

      if (response?.success) {
        reloadShifts();
        toast.success('Clocked in successfully');
        setShowClockInModal(false);
      }
    } catch (error: any) {
      console.error('Failed to clock in:', error);
      toast.error('Clock in failed', {
        description: error?.response?.data?.error || 'Please try again'
      });
    } finally {
      setActionBusy(false);
    }
  };

  // Opens the personal-care checklist for a clocked-out shift. The backend
  // upserts by shiftId, so this returns the log created at scheduling time (or
  // creates one as a fallback if that ever failed) — the note is always reachable.
  const openPersonalCareNote = async (
    shift: Shift,
    clockedInAt?: string | null,
    clockedOutAt?: string | null,
  ) => {
    try {
      const info = getClientBasicInfo(shift.client);
      const res = await createEmployeeActivityLog({
        activityType: HHA_PERSONAL_CARE,
        shiftId: shift.id,
        employeeId: shift.employeeId || user?.profile?.id || "",
        agencyId: shift.agencyId || user?.agencyId || "",
        description: "",
        metadata: {
          individual: info.name,
          clientName: info.name,
          clientDob: info.dob,
          clientAddress: info.address,
          clientPhone: info.phone,
          serviceCode: shift.serviceCode || "",
          agencyName: user?.agency?.name || "",
          shiftDate: safeFormat(shift.date, "MMM d, yyyy"),
          shiftStartTime: shift.startTime || "",
          shiftEndTime: shift.endTime || "",
          clockedInAt: safeFormat(clockedInAt ?? shift.clockedInAt, "hh:mm a"),
          clockedOutAt: safeFormat(clockedOutAt ?? shift.clockedOutAt, "hh:mm a"),
        },
      });
      const activityLogId = res?.data?.id;
      if (activityLogId) {
        setPersonalCareActivityLogId(activityLogId);
        setShowPersonalCareModal(true);
      }
    } catch (error) {
      console.error('Failed to open personal care note for shift:', shift.id, error);
    }
  };

  const handleClockOutConfirm = async () => {
    const shiftToClockOut = currentShift;
    if (!shiftToClockOut) return;

    if (!userCoords) {
      toast.error('Location unavailable', {
        description: 'Cannot clock out without GPS coordinates',
      });
      return;
    }

    try {
      setActionBusy(true);
      const response = await apiClockOut(shiftToClockOut.id, {
        latitude: userCoords.lat,
        longitude: userCoords.lng,
      });

      if (response?.success) {
        setShowClockOutModal(false);
        toast.success('Clocked out successfully');
        reloadShifts();

        // Personal-care shifts prompt the aide to fill the checklist right away.
        if (shiftToClockOut.notesType === HHA_PERSONAL_CARE) {
          await openPersonalCareNote(
            shiftToClockOut,
            shiftToClockOut.clockedInAt,
            response.shift?.clockedOutAt,
          );
        }
      }
    } catch (error: any) {
      console.error('Failed to clock out:', error);
      toast.error('Clock out failed', {
        description: error?.response?.data?.error || 'Please try again'
      });
    } finally {
      setActionBusy(false);
    }
  };

  const isOpenShiftCurrent = openShift !== null && openShift.id === currentShift?.id && Boolean(currentShift?.actionStatus);
  const loadingDay = stripShifts.loading && dayShifts.length === 0;
  const isToday = selectedKey === todayKey;

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col gap-5">
      <h1 className="sr-only">Shift management</h1>

      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section aria-label="Schedule" className="relative flex min-w-0 flex-col gap-5 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
          <DayStrip windowStart={windowStart} days={STRIP_DAYS} selected={selectedDay} onSelect={selectDay}/>

          {stripShifts.error ? (
            <p role="alert" className="py-16 text-center text-sm text-[#b3371c] dark:text-[#f3a08c]">
              We couldn't load your shifts.{' '}
              <button type="button" onClick={stripShifts.reload} className="cursor-pointer font-semibold underline">Try again</button>
            </p>
          ) : loadingDay ? (
            <div role="status" className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-[#5d6b73] dark:text-[#9aa4a8]">
              <Loader2 className="h-8 w-8 animate-spin text-[#00a3a7] motion-reduce:animate-none" aria-hidden="true" />
              Loading shifts…
            </div>
          ) : dayShifts.length === 0 ? (
            <div className="mx-auto flex max-w-[380px] flex-col items-center justify-center gap-2 py-16 text-center">
              <CalendarDays className="h-9 w-9 text-[#8a99a3]" aria-hidden="true" />
              <p className="mt-1 text-base font-bold text-[#34434c] dark:text-[#e3e9eb]">
                {isToday ? 'No shifts scheduled yet' : `No shifts on ${format(selectedDay, 'EEEE, MMM d')}`}
              </p>
              <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
                Your assigned shifts will appear here once they're scheduled. Check back later for updates to your schedule.
              </p>
            </div>
          ) : (
            <DayTimeline shifts={dayShifts} showNow={isToday} nextShiftId={isToday ? upNextId : undefined} onOpen={setOpenShift}/>
          )}
        </section>

        {/* On phones the panel splits around the schedule: Clock in / Clock out and the next shift above it,
            the day summary and manual timesheet below. From lg it is one column on the right. */}
        <aside aria-label="Your day" className="contents lg:flex lg:flex-col lg:gap-4">
          {!stripShifts.error && !loadingDay && dayShifts.length > 0 && <div className="order-last lg:order-none">
            <DaySummaryCard label={isToday ? 'Today' : format(selectedDay, 'EEE, MMM d')} summary={summary}
              future={selectedKey > todayKey} shiftCount={dayShifts.length}/>
          </div>}
          {currentShift?.actionStatus && <div className="order-first lg:order-none">
            <CurrentShiftCard
              shift={currentShift}
              minutesLeft={timeRemaining}
              userLocation={userLocation}
              locationError={locationError}
              busy={actionBusy}
              onAction={handleShiftAction}
            />
          </div>}
          {nextShift && <div className="order-first lg:order-none">
            <NextShiftCard shift={nextShift} now={now} onOpen={setOpenShift}/>
          </div>}
          <button type="button" onClick={() => setTimesheetOpen(true)}
            className="order-last inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#007679] bg-white px-5 text-[15px] font-bold text-[#005759] transition-colors hover:bg-[#e3f6f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] lg:order-none dark:border-[#00a3a7] dark:bg-transparent dark:text-[#7fe0e2] dark:hover:bg-[#00a3a7]/10">
            <CirclePlus className="h-4 w-4" aria-hidden="true" /> Add manual timesheet
          </button>
        </aside>
      </div>

      <ShiftDetailsDialog
        shift={openShift}
        onClose={() => setOpenShift(null)}
        actionLabel={isOpenShiftCurrent ? (currentShift?.actionStatus === ShiftActionStatus.CLOCK_IN ? 'Clock in' : 'Clock out') : undefined}
        onAction={isOpenShiftCurrent ? handleShiftAction : undefined}
        actionDisabled={clockInLocked}
        onNote={shiftId => { setOpenShift(null); openShiftNote(shiftId); }}
        onAddHours={() => { setOpenShift(null); setTimesheetOpen(true); }}
        upNext={openShift !== null && openShift.id === upNextId}
        userPosition={userCoords}
        viewer={{ agencyId: user?.agencyId, viewerId: user?.uid, employeeId: user?.profile?.id }}
      />

      <ManualTimesheetDialog open={timesheetOpen} onOpenChange={setTimesheetOpen} onSubmitted={reloadShifts} />

      {selectedNoteShift && user?.agencyId && user?.uid ? <ShiftNoteStatus key={`${user.uid}:${user.agencyId}:${selectedNoteShift}`} shiftId={selectedNoteShift} agencyId={user.agencyId} viewerId={user.uid} employeeId={user.profile?.id} /> : null}

      <ClockOutModal
        isOpen={showClockOutModal}
        onConfirm={handleClockOutConfirm}
        onCancel={() => setShowClockOutModal(false)}
        isLoading={actionBusy}
      />

      <PersonalCareNoteModal
        isOpen={showPersonalCareModal}
        activityLogId={personalCareActivityLogId}
        onClose={() => {
          setShowPersonalCareModal(false);
          setPersonalCareActivityLogId(null);
        }}
        onSubmitted={() => {
          setShowPersonalCareModal(false);
          setPersonalCareActivityLogId(null);
        }}
      />

      <ClockInModal
        isOpen={showClockInModal}
        onConfirm={handleClockInConfirm}
        onCancel={() => setShowClockInModal(false)}
        isLoading={actionBusy}
      />

      <LocationErrorModal
        isOpen={showLocationErrorModal}
        onClose={() => setShowLocationErrorModal(false)}
        userLocation={userLocation}
        locationDistance={locationDistance ?? 0}
        shiftLocation={formatShiftLocation(currentShift?.location) || ''}
      />
    </div>
  );
}
