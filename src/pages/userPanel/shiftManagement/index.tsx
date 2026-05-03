import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Clock, MapPin, Calendar, ChevronRight, Plus, Loader2, Database, Tornado } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Shift, ShiftStatus, ShiftActionStatus, formatShiftLocation, listShifts, categorizeShifts, clockIn as apiClockIn, clockOut as apiClockOut } from "@/lib/api/shifts";
import { format } from "date-fns";
import { ClockOutModal } from "./ClockOutModal";
import { ClockInModal } from "./ClockInModal";
import { LocationErrorModal } from "./LocationErrorModal";
import ExpandIcon from "@/assets/icons/arrow-expand-01.svg?react";
import { Routes } from "@/routes/constants";
import { toast } from "sonner";
import { useAuth } from "@/utils/auth/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";

type FirestoreTimestamp = { _seconds: number; _nanoseconds: number };

const toDate = (value: string | FirestoreTimestamp | null | undefined): Date | null => {
  if (!value) return null;
  if (typeof value === "object" && "_seconds" in value) return new Date(value._seconds * 1000);
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
};

const formatClockTime = (value: string | FirestoreTimestamp | null | undefined): string => {
  const d = toDate(value);
  return d ? format(d, 'hh:mm a') : "-";
};

const convertTimeToISODate = (timeStringReplaced: string, dateString: string): Date => {
  const timeString = timeStringReplaced.replace(".", ":");
  const timeMatch = timeString.match(/(\d+):(\d+):?\s*(AM|PM)/i);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const date = new Date(dateString);
  date.setHours(hours, minutes, 0, 0);

  return date;
};

const formatTimeRemaining = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min remaining`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} remaining`;
  }

  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} min remaining`;
};

const calculateRemainingMinutes = (endTime: string, date: string): number => {
  try {
    const now = new Date();
    const endDateTime = convertTimeToISODate(endTime, date);
    const diffInMs = endDateTime.getTime() - now.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return Math.max(0, diffInMinutes);
  } catch (error) {
    console.error('Error calculating remaining minutes:', error);
    return 0;
  }
};

type ShiftPanel = 'today' | 'upcoming' | 'previous';

const getClientName = (client?: { firstName?: string; lastName?: string; name?: string }) => {
  if (!client) return "Unknown Client";
  if (client.firstName && client.lastName) {
    return `${client.firstName} ${client.lastName}`;
  }
  if (client.name) {
    return client.name;
  }
  return "Unknown Client";
};

const getInitialsFromName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
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

const isShiftExpiringSoon = (startTime: string, endTime: string, date: string): boolean => {
  try {
    const now = new Date();
    const startDateTime = convertTimeToISODate(startTime, date);
    const endDateTime = convertTimeToISODate(endTime, date);

    const totalDuration = endDateTime.getTime() - startDateTime.getTime();
    const elapsed = now.getTime() - startDateTime.getTime();

    const threshold = totalDuration * 0.25;
    return elapsed >= threshold;
  } catch (error) {
    console.error('Error calculating if shift is expiring soon:', error);
    return false;
  }
};

const calculateTimeUntilStart = (startTime: string, date: string): string => {
  try {
    const now = new Date();
    const startDateTime = convertTimeToISODate(startTime, date);
    const diffInMs = startDateTime.getTime() - now.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes <= 0) {
      return 'Starting now';
    }

    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;

    if (hours === 0) {
      return `Starts in ${minutes}min`;
    }

    if (minutes === 0) {
      return `Starts in ${hours}h`;
    }

    return `Starts in ${hours}h ${minutes}min`;
  } catch (error) {
    console.error('Error calculating time until start:', error);
    return 'Starting soon';
  }
};

const isShiftPassed = (endTime: string | undefined, date: string): boolean => {
  if (!endTime) return false;

  try {
    const now = new Date();
    const endDateTime = convertTimeToISODate(endTime, date);
    return endDateTime.getTime() < now.getTime();
  } catch (error) {
    console.error('Error checking if shift has passed:', error);
    return false;
  }
};

const isShiftExpired = (shift: Shift): boolean => {
  if (shift.status === ShiftStatus.COMPLETED) return false;
  if (shift.clockedInAt) return false;
  if (!shift.date) return false;

  try {
    const now = new Date();

    // Mirror server: available/pending without clock-in expires 15 minutes after scheduled start
    if (
      (shift.status === ShiftStatus.AVAILABLE || shift.status === ShiftStatus.PENDING) &&
      shift.startTime
    ) {
      const startDateTime = convertTimeToISODate(shift.startTime, shift.date);
      const graceEnd = startDateTime.getTime() + 15 * 60 * 1000;
      if (now.getTime() > graceEnd) {
        return true;
      }
    }

    let endDateTime: Date;

    if (shift.endTime) {
      endDateTime = convertTimeToISODate(shift.endTime, shift.date);
    } else {
      const date = new Date(shift.date);
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59
      );
    }

    return endDateTime.getTime() < now.getTime();
  } catch (error) {
    console.error('Error checking if shift is expired:', error);
    return false;
  }
};

interface ShiftCardProps {
  shift: Shift;
  panel: ShiftPanel;
  showDate?: boolean;
  showAction?: boolean;
  onActionClick?: (shiftId: string) => void;
  isLoading?: boolean;
}

function ShiftCard({
  shift,
  panel,
  showDate = false,
  showAction = true,
  onActionClick,
  isLoading = false
}: ShiftCardProps) {
  const getStatusColor = (status?: string) => {
    if (!status) return "";

    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("expiring") || lowerStatus.includes("remaining")) {
      return "bg-[rgba(213,52,17,0.05)] border-[#d53411] border-[0.5px] text-[#d53411]";
    }
    if (lowerStatus.includes("tomorrow") || lowerStatus.includes("ongoing") || lowerStatus.includes("started")) {
      return "bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] text-[#0eaf52]";
    }
    return "bg-[rgba(178,178,179,0.1)] border-[#b2b2b3] border-[0.5px] text-[#565656]";
  };

  const getActionButton = () => {
    if (!showAction || !shift.actionStatus) return null;
    if (panel === 'today' && isShiftExpired(shift)) return null;

    const buttonConfig = {
      [ShiftActionStatus.CLOCK_IN]: {
        label: "Clock In",
        color: "bg-[#2B82FF] hover:bg-[#1e6ae6]",
      },
      [ShiftActionStatus.CLOCK_OUT]: {
        label: "Clock Out",
        color: "bg-[#D53411] hover:bg-[#b82d0f]",
      },
    };

    const config = buttonConfig[shift.actionStatus];

    return (
      <Button
        onClick={() => onActionClick?.(shift.id)}
        disabled={isLoading}
        className={`${config.color} text-white rounded-full px-4 py-2 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
        {config.label}
      </Button>
    );
  };

  return (
    <div
      className="bg-white/50 backdrop-blur-[20px] rounded-[20px] p-3 lg:p-4 flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 hover:bg-white/70 transition-colors">
      <div className="flex lg:hidden flex-col gap-2.5 w-full">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Client</p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] font-semibold whitespace-nowrap">
              {shift.client?.firstName} {shift.client?.lastName}
            </p>
          </div>

          {showDate ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Date</p>
              <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">
                {format(new Date(shift.date), "dd MMMM")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Location</p>
              <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.client?.address}</p>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">
              {shift.clockedInAt
                ? (panel === 'previous' ? "Clocked In" : "Started at")
                : "Start at"
              }
            </p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">
              {shift.clockedInAt
                ? formatClockTime(shift.clockedInAt)
                : shift.startTime
              }
            </p>
          </div>
        </div>

        {showDate && (
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Location</p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.client?.address}</p>
          </div>
        )}

        {(shift.clockedInAt || shift.clockedOutAt) && showDate && (
          <div className="grid grid-cols-3 gap-2 text-sm">
            {shift.clockedInAt && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Clocked In</p>
                <p
                  className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{formatClockTime(shift.clockedInAt)}</p>
              </div>
            )}

            {shift.clockedOutAt && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Clocked Out</p>
                <p
                  className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{formatClockTime(shift.clockedOutAt)}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {panel === 'today' && (
            <>
              {isShiftExpired(shift) ? (
                <span
                  className="bg-[rgba(213,52,17,0.05)] border-[#d53411] border-[0.5px] border-solid text-[#d53411] text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  Expired
                </span>
              ) : shift.startTime && shift.endTime && shift.date && isShiftExpiringSoon(shift.startTime, shift.endTime, shift.date) && shift.actionStatus === ShiftActionStatus.CLOCK_IN && (
                <span
                  className="bg-[rgba(213,52,17,0.05)] border-[#d53411] border-[0.5px] border-solid text-[#d53411] text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  Expiring Soon
                </span>
              )}

              {(shift.status === ShiftStatus.ONGOING || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && (
                <span
                  className="bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] border-solid text-[#0eaf52] text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  Ongoing Shift
                </span>
              )}

              {shift.timeRemaining !== undefined && (shift.status === ShiftStatus.ONGOING || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && (
                <span
                  className={`${shift.timeRemaining <= 5 ? 'bg-[rgba(213,52,17,0.05)] border-[#d53411] text-[#d53411]' : 'bg-[rgba(14,175,82,0.05)] border-[#0eaf52] text-[#0eaf52]'} border-[0.5px] border-solid text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap`}>
                  {formatTimeRemaining(shift.timeRemaining)}
                </span>
              )}
            </>
          )}

          {panel === 'upcoming' && (
            <>
              {shift.startTime && (
                <span
                  className="bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] border-solid text-[#0eaf52] text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  {calculateTimeUntilStart(shift.startTime, shift.date)}
                </span>
              )}
            </>
          )}

          {panel === 'previous' && (
            <>
              {shift.status === ShiftStatus.COMPLETED && shift.sessionDuration && (
                <span
                  className="bg-[rgba(178,178,179,0.1)] border-[#b2b2b3] border-[0.5px] border-solid text-[#565656] text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  {shift.sessionDuration}
                </span>
              )}

              {shift.status === ShiftStatus.EXPIRED && (
                <span
                  className="bg-[rgba(213,52,17,0.05)] border-[#d53411] border-[0.5px] border-solid text-[#d53411] text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  Expired
                </span>
              )}
            </>
          )}
          {showAction && <div className="mt-1">{getActionButton()}</div>}
        </div>

      </div>

      <div className="items-center hidden w-full gap-6 lg:flex">
        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
          {shift.client?.profileImage && (
            <AvatarImage
              src={shift.client.profileImage}
              alt={getClientName(shift.client)}
              className="object-cover w-full h-full aspect-auto"
            />
          )}
          <AvatarFallback
            className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-xl font-bold">
            {getInitialsFromName(getClientName(shift.client))}
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center flex-1 min-w-0 gap-16">
          <div className="flex flex-col gap-1.5 shrink-0">
            <p className="text-[16px] font-semibold text-[#10141a] leading-[1.6] whitespace-nowrap">
              {shift.client?.firstName} {shift.client?.lastName}
            </p>
            <p className="text-[14px] text-[#808081] leading-[1.4] whitespace-nowrap">Client</p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-2">
            {panel === 'previous' && (
              <div className="flex flex-col shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">Date</p>
                <p className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">
                  {format(new Date(shift.date), "dd MMMM")}
                </p>
              </div>
            )}

            <div className="flex flex-col shrink-0 gap-1">
              <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">Location</p>
              <p className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.client?.address}</p>
            </div>

            {shift.startTime && (
              <div className="flex flex-col shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">
                  {shift.clockedInAt
                    ? (panel === 'previous' ? "Clocked In" : "Started at")
                    : "Start at"
                  }
                </p>
                <p className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">
                  {shift.clockedInAt
                    ? formatClockTime(shift.clockedInAt)
                    : panel === 'today'
                      ? shift.startTime
                      : `${format(new Date(shift.date), 'dd MMMM yyyy')} ${shift.startTime}`
                  }
                </p>
              </div>
            )}

            {shift.clockedInAt && !shift.startTime && (
              <div className="flex flex-col shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">
                  {panel === 'previous' ? "Clocked In" : (shift.clockedOutAt ? "Clocked In" : "Started at")}
                </p>
                <p
                  className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">{formatClockTime(shift.clockedInAt)}</p>
              </div>
            )}

            {shift.clockedOutAt && (
              <div className="flex flex-col shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">Clocked Out</p>
                <p
                  className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">{formatClockTime(shift.clockedOutAt)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {panel === 'today' && (
            <>
              {isShiftExpired(shift) ? (
                <span
                  className="bg-[rgba(213,52,17,0.05)] border-[#d53411] border-[0.5px] border-solid text-[#d53411] text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  Expired
                </span>
              ) : shift.startTime && shift.endTime && shift.date && isShiftExpiringSoon(shift.startTime, shift.endTime, shift.date) && shift.actionStatus === ShiftActionStatus.CLOCK_IN && (
                <span
                  className="bg-[rgba(213,52,17,0.05)] border-[#d53411] border-[0.5px] border-solid text-[#d53411] text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  Expiring Soon
                </span>
              )}

              {(shift.status === ShiftStatus.ONGOING || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && (
                <span
                  className="bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] border-solid text-[#0eaf52] text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  Ongoing Shift
                </span>
              )}

              {shift.timeRemaining !== undefined && (shift.status === ShiftStatus.ONGOING || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && (
                <span
                  className={`${shift.timeRemaining <= 5 ? 'bg-[rgba(213,52,17,0.05)] border-[#d53411] text-[#d53411]' : 'bg-[rgba(14,175,82,0.05)] border-[#0eaf52] text-[#0eaf52]'} border-[0.5px] border-solid text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap`}>
                  {formatTimeRemaining(shift.timeRemaining)}
                </span>
              )}
            </>
          )}

          {panel === 'upcoming' && (
            <>
              {shift.startTime && (
                <span
                  className="bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] border-solid text-[#0eaf52] text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  {calculateTimeUntilStart(shift.startTime, shift.date)}
                </span>
              )}
            </>
          )}

          {panel === 'previous' && (
            <>
              {shift.status === ShiftStatus.COMPLETED && shift.sessionDuration && (
                <span
                  className="bg-[rgba(178,178,179,0.1)] border-[#b2b2b3] border-[0.5px] border-solid text-[#565656] text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  {shift.sessionDuration} session
                </span>
              )}

              {shift.status === ShiftStatus.EXPIRED && (
                <span
                  className="bg-[rgba(213,52,17,0.05)] border-[#d53411] border-[0.5px] border-solid text-[#d53411] text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
                  Expired
                </span>
              )}
            </>
          )}
          {showAction && <div className="shrink-0">{getActionButton()}</div>}
        </div>

      </div>
    </div>
  );
}

interface ShiftSectionProps {
  title: string;
  subtitle: string;
  shifts: Shift[];
  panel: ShiftPanel;
  backgroundColor: string;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
  showExpandButton?: boolean;
  showDate?: boolean;
  maxVisibleShifts?: number;
  showAction?: boolean;
  onActionClick?: (shiftId: string) => void;
  isLoading?: boolean;
}

function ShiftSection({
  title,
  subtitle,
  shifts,
  panel,
  backgroundColor,
  isExpanded = false,
  onExpandToggle,
  showExpandButton = true,
  showDate = false,
  maxVisibleShifts = 2,
  showAction = true,
  onActionClick,
  isLoading = false,
}: ShiftSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Calculate pagination
  const totalPages = Math.ceil(shifts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const displayShifts = isExpanded
    ? shifts.slice(startIndex, endIndex)
    : shifts.slice(0, maxVisibleShifts);

  const handleExpandToggle = () => {
    setCurrentPage(1);
    onExpandToggle?.();
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div
      className={`${backgroundColor} backdrop-blur border border-white/30 rounded-[30px] p-5 relative`}
    >
      <div className="flex flex-col items-start justify-between gap-3 mb-6 sm:flex-row">
        <div>
          <h3
            className="text-[18px] lg:text-[20px] font-medium text-[#10141a] leading-[1.6] whitespace-nowrap">{title}</h3>
          <p className="text-[12px] lg:text-[14px] text-[#808081] leading-[1.4] mt-1">{subtitle}</p>
        </div>

        {showExpandButton && onExpandToggle && (
          <Button
            onClick={handleExpandToggle}
            className="bg-white/80 hover:bg-white backdrop-blur-[22px] text-[#808081] rounded-full px-4 py-2 h-auto text-[12px] font-normal shadow-sm transition-all duration-200 flex items-center gap-2"
          >
            <ExpandIcon
              className={`transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
              style={{ width: "16px", height: "16px" }}
            />
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {displayShifts.length > 0 ? (
          displayShifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              panel={panel}
              showDate={showDate}
              showAction={showAction}
              onActionClick={onActionClick}
              isLoading={isLoading}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-[14px] text-[#808081]">No shifts available</p>
          </div>
        )}
      </div>

      {isExpanded && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
            className="bg-white/50 backdrop-blur border border-white/30 rounded-full p-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70"
          >
            <ChevronRight size={20} className="rotate-180" />
          </Button>
          <span className="text-[16px] font-medium text-[#10141a] min-w-[60px] text-center">
            {currentPage}<span className="text-[14px] text-[#808081]">/{totalPages}</span>
          </span>
          <Button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            size="sm"
            variant="outline"
            className="bg-white/50 backdrop-blur border border-white/30 rounded-full p-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ShiftManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [previousExpanded, setPreviousExpanded] = useState(false);
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [previousShifts, setPreviousShifts] = useState<Shift[]>([]);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInShiftId, setClockInShiftId] = useState<string | null>(null);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [clockOutShiftId, setClockOutShiftId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string>("Getting location...");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [showLocationErrorModal, setShowLocationErrorModal] = useState(false);
  const [locationDistance, setLocationDistance] = useState<number | null>(null);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const { reverseGeocode } = useReverseGeocode();

  const currentDate = new Date();

  const initiateTimeRemaining = () => {
    if (todayShift) {
      setTimeRemaining(calculateRemainingMinutes(todayShift.endTime || '', todayShift.date))
    }
  }

  useEffect(() => {
    if (user?.profile?.id) {
      loadShifts();
    }
  }, [user?.profile?.id]);

  useEffect(() => {
    initiateTimeRemaining();

    const interval = setInterval(() => {
      initiateTimeRemaining();
    }, 60000);

    return () => clearInterval(interval);
  }, [todayShift]);

  const loadShifts = async () => {
    const agencyId = user?.agencyId;
    const employeeId = user?.profile?.id;

    if (!agencyId) {
      console.warn('No user ID available for fetching shifts');
      return;
    }

    try {
      setShiftsLoading(true);

      // Single API call to get all shifts
      const response = await listShifts({
        employeeId: employeeId,
        agencyId: agencyId,
        limit: 100,
        client: true, // Populate client data
      });

      if (response.success) {
        // Categorize shifts client-side
        const { current, upcoming, previous } = categorizeShifts(response.shifts);
        setTodayShift(current);
        setUpcomingShifts(upcoming);
        setPreviousShifts(previous);
      }
    } catch (error: any) {
      console.error('Failed to load shifts:', error);
      toast.error('Failed to load shifts', {
        description: error?.response?.data?.error || 'Please try again later'
      });
    } finally {
      setShiftsLoading(false);
    }
  };

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

  const handleShiftAction = async (shiftId: string) => {
    const shift = todayShift?.id === shiftId ? todayShift : null;
    if (!shift) return;

    if (shift.actionStatus === ShiftActionStatus.CLOCK_IN) {
      if (locationError || !userCoords) {
        toast.error('Location unavailable', {
          description: 'Please enable location services and try again'
        });
        return;
      }

      const [isLocationMatch, distance] = checkLocationMatch(userCoords, shift.location);
      if (!isLocationMatch) {
        setShowLocationErrorModal(true);
        setLocationDistance(distance);
        return;
      }
      setClockInShiftId(shiftId);
      setShowClockInModal(true);
      return;
    }

    if (shift.actionStatus === ShiftActionStatus.CLOCK_OUT) {
      if (locationError || !userCoords) {
        toast.error('Location unavailable', {
          description: 'Please enable location services to clock out',
        });
        return;
      }
      const [isLocationMatch, distance] = checkLocationMatch(userCoords, shift.location);
      if (!isLocationMatch) {
        setShowLocationErrorModal(true);
        setLocationDistance(distance);
        return;
      }
      setClockOutShiftId(shiftId);
      setShowClockOutModal(true);
      return;
    }
  };

  const handleClockInConfirm = async () => {
    if (!clockInShiftId) return;

    const shiftToClockIn = todayShift?.id === clockInShiftId ? todayShift : null;
    if (!shiftToClockIn) return;

    if (!userCoords) {
      toast.error('Location unavailable', {
        description: 'Cannot clock in without GPS coordinates',
      });
      return;
    }

    try {
      setShiftsLoading(true);
      const response = await apiClockIn(clockInShiftId, {
        latitude: userCoords.lat,
        longitude: userCoords.lng,
      });

      if (response?.success) {
        setTodayShift(response.shift);
        await loadShifts();
        toast.success('Clocked in successfully');
        setShowClockInModal(false);
        setClockInShiftId(null);
      }
    } catch (error: any) {
      console.error('Failed to clock in:', error);
      toast.error('Clock in failed', {
        description: error?.response?.data?.error || 'Please try again'
      });
    } finally {
      setShiftsLoading(false);
    }
  };

  const handleClockOutConfirm = async () => {
    if (!clockOutShiftId) return;

    const shiftToClockOut = todayShift?.id === clockOutShiftId ? todayShift : null;
    if (!shiftToClockOut) return;

    if (!userCoords) {
      toast.error('Location unavailable', {
        description: 'Cannot clock out without GPS coordinates',
      });
      return;
    }

    try {
      setShiftsLoading(true);
      const response = await apiClockOut(clockOutShiftId, {
        latitude: userCoords.lat,
        longitude: userCoords.lng,
      });

      if (response?.success) {
        setPreviousShifts((prev) => [response.shift, ...prev]);
        setTodayShift(null);
        setShowClockOutModal(false);
        setClockOutShiftId(null);
        toast.success('Clocked out successfully');

        const agencyId = user?.agencyId;
        const employeeId = user?.profile?.id;
        if (agencyId && employeeId) {
          await loadShifts();
        }
      }
    } catch (error: any) {
      console.error('Failed to clock out:', error);
      toast.error('Clock out failed', {
        description: error?.response?.data?.error || 'Please try again'
      });
    } finally {
      setShiftsLoading(false);
    }
  };

  const filteredUpcomingShifts = useMemo(() => {
    return upcomingShifts.filter(shift => {
      if (isShiftPassed(shift.endTime, shift.date)) {
        return false;
      }
      if (todayShift && shift.id === todayShift.id) {
        return false;
      }
      return true;
    });
  }, [upcomingShifts, todayShift]);

  return (
    <div className="min-h-[calc(100vh-200px)] px-2 sm:px-0">
      <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center lg:mb-8">
        <h1
          className="text-[28px] sm:text-[32px] lg:text-[40px] font-semibold leading-[1.6] text-[#10141a] whitespace-nowrap">
          Shift Management
        </h1>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate(Routes.userPanel.manualShiftManagement)}
            className="bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-2 lg:py-3 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={20} />
            Manual Timesheet
          </Button>
        </div>
      </div>

      <div className="bg-white/30 backdrop-blur border border-white/30 rounded-[20px] p-3 lg:p-5 relative">
        <div
          className="flex bg-white/0 backdrop-blur rounded-[20px] min-h-[46px] mb-4 lg:mb-6 items-start flex-wrap gap-3 sm:gap-4 lg:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="bg-white/50 backdrop-blur-[8px] border border-white/30 rounded-full p-2.5 sm:p-3 w-[38px] h-[38px] sm:w-[43px] sm:h-[43px] flex items-center justify-center shrink-0">
              <Calendar size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <p
                className="text-[14px] sm:text-[16px] font-semibold text-[#10141a] leading-[1.4] whitespace-nowrap">Today</p>
              <p className="text-[12px] sm:text-[14px] font-medium text-[#808081] leading-[1.4] whitespace-nowrap">
                {format(currentDate, "dd MMMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="bg-white/50 backdrop-blur-[8px] border border-white/30 rounded-full p-2.5 sm:p-3 w-[38px] h-[38px] sm:w-[43px] sm:h-[43px] flex items-center justify-center shrink-0">
              <Clock size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <p
                className="text-[14px] sm:text-[16px] font-semibold text-[#10141a] leading-[1.4] whitespace-nowrap">Time</p>
              <p className="text-[12px] sm:text-[14px] font-medium text-[#808081] leading-[1.4] whitespace-nowrap">
                {format(currentDate, "hh:mm a").toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="bg-white/50 backdrop-blur-[8px] border border-white/30 rounded-full p-2.5 sm:p-3 w-[38px] h-[38px] sm:w-[43px] sm:h-[43px] flex items-center justify-center shrink-0">
              <MapPin size={18} className={`sm:w-5 sm:h-5 ${locationError ? "text-red-500" : ""}`} />
            </div>
            <div className="max-w-[200px] sm:max-w-[250px]">
              <p
                className="text-[14px] sm:text-[16px] font-semibold text-[#10141a] leading-[1.4] whitespace-nowrap">Location</p>
              <p
                className={`text-[12px] sm:text-[14px] font-medium leading-[1.4] truncate ${locationError ? "text-red-500" : "text-[#808081]"}`}>
                {userLocation}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {shiftsLoading ? (
            <div
              className="bg-[rgba(14,175,82,0.1)] backdrop-blur border border-white/30 rounded-[30px] p-5 min-h-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#0eaf52]" />
                <p className="text-[14px] text-[#808081]">Loading shifts...</p>
              </div>
            </div>
          ) : todayShift ? (
            <ShiftSection
              title="Current Shift"
              subtitle="This is your current active shift."
              shifts={[{ ...todayShift, timeRemaining: timeRemaining !== null ? timeRemaining : undefined }]}
              panel="today"
              backgroundColor="bg-[rgba(14,175,82,0.1)]"
              showExpandButton={false}
              maxVisibleShifts={1}
              onActionClick={handleShiftAction}
              isLoading={shiftsLoading}
            />
          ) : null}

          {!shiftsLoading && (
            <ShiftSection
              title="Upcoming Shifts"
              subtitle="These are your shifts for the day."
              shifts={filteredUpcomingShifts}
              panel="upcoming"
              backgroundColor="bg-[rgba(43,130,255,0.1)]"
              isExpanded={upcomingExpanded}
              onExpandToggle={() => setUpcomingExpanded(!upcomingExpanded)}
              showDate
              showAction={false}
              isLoading={shiftsLoading}
            />
          )}

          {!shiftsLoading && (
            <ShiftSection
              title="Previous Shifts"
              subtitle="These are your Previous shifts"
              shifts={previousShifts}
              panel="previous"
              backgroundColor="bg-white/30"
              isExpanded={previousExpanded}
              onExpandToggle={() => setPreviousExpanded(!previousExpanded)}
              showDate
              showAction={false}
              isLoading={shiftsLoading}
            />
          )}
        </div>
      </div>

      <ClockOutModal
        isOpen={showClockOutModal}
        onConfirm={handleClockOutConfirm}
        onCancel={() => setShowClockOutModal(false)}
        isLoading={shiftsLoading}
      />

      <ClockInModal
        isOpen={showClockInModal}
        onConfirm={handleClockInConfirm}
        onCancel={() => {
          setShowClockInModal(false);
          setClockInShiftId(null);
        }}
        isLoading={shiftsLoading}
      />

      <LocationErrorModal
        isOpen={showLocationErrorModal}
        onClose={() => setShowLocationErrorModal(false)}
        userLocation={userLocation}
        locationDistance={locationDistance ?? 0}
        shiftLocation={formatShiftLocation(todayShift?.location) || ''}
      />
    </div>
  );
}

