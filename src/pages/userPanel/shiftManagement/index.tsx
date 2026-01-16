import {useState, useEffect} from "react";
import {useNavigate} from "react-router";
import {Clock, MapPin, Calendar, ChevronRight, Plus, Loader2, Database, Tornado} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Shift, ShiftStatus, ShiftActionStatus, formatShiftLocation} from "@/lib/api/shifts";
// ShiftSectionProps is defined locally below
import {format} from "date-fns";
import {ClockOutModal} from "./ClockOutModal";
import {LocationErrorModal} from "./LocationErrorModal";
import ExpandIcon from "@/assets/icons/arrow-expand-01.svg?react";
import {Routes} from "@/routes/constants";
import {
  getTodayShifts,
  clockIn as apiClockIn,
  shiftStarted as apiShiftStarted,
  clockOut as apiClockOut,
  getAvailableShifts,
  getPreviousShifts,
} from "@/lib/api/shifts";
import {toast} from "sonner";
import {useAuth} from "@/utils/auth/context/AuthContext";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

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

// Helper function to get client name
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

const checkLocationMatch = (userLocation: string, shiftLocation?: Shift["location"] | null): boolean => {
  const normalizedUserLocation = userLocation.toLowerCase().trim();
  const normalizedShiftLocation = formatShiftLocation(shiftLocation).toLowerCase().trim();

  return normalizedUserLocation === normalizedShiftLocation;
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
    console.log("shift", shift.actionStatus);
    if (!showAction || !shift.actionStatus) return null;

    const buttonConfig = {
      [ShiftActionStatus.CLOCK_IN]: {
        label: "Clock In",
        color: "bg-[#2B82FF] hover:bg-[#1e6ae6]",
      },
      [ShiftActionStatus.SHIFT_STARTED]: {
        label: "Shift Started",
        color: "bg-[#0EAF52] hover:bg-[#0c9645]",
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
        {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Clock size={16}/>}
        {config.label}
      </Button>
    );
  };

  return (
    <div
      className="bg-white/50 backdrop-blur-[20px] rounded-[20px] p-3 lg:p-4 flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 hover:bg-white/70 transition-colors">
      {/* Mobile & Tablet Layout */}
      <div className="flex lg:hidden flex-col gap-2.5 w-full">
        {/* Info Grid - No Avatar on Mobile */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          {/* Client Name */}
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Client</p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] font-semibold whitespace-nowrap">
              {shift.client?.firstName} {shift.client?.lastName}
            </p>
          </div>

          {/* Date or Location */}
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

          {/* Time */}
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">
              {shift.clockedInAt
                ? (panel === 'previous' ? "Clocked In" : "Started at")
                : "Start at"
              }
            </p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">
              {shift.clockedInAt
                ? format(new Date(shift.clockedInAt), 'hh:mm a')
                : shift.startTime
              }
            </p>
          </div>
        </div>

        {/* Location row (if date is shown in first row) */}
        {showDate && (
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Location</p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.client?.address}</p>
          </div>
        )}

        {/* Clock In/Out times for previous shifts */}
        {(shift.clockedInAt || shift.clockedOutAt) && showDate && (
          <div className="grid grid-cols-3 gap-2 text-sm">
            {shift.clockedInAt && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Clocked In</p>
                <p
                  className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{format(new Date(shift.clockedInAt), 'hh:mm a')}</p>
              </div>
            )}

            {shift.clockedOutAt && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Clocked Out</p>
                <p
                  className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{format(new Date(shift.clockedOutAt), 'hh:mm a')}</p>
              </div>
            )}
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {panel === 'today' && (
            <>
              {shift.startTime && shift.endTime && shift.date && isShiftExpiringSoon(shift.startTime, shift.endTime, shift.date) && shift.actionStatus === ShiftActionStatus.CLOCK_IN && (
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
          {/* Action Button - Mobile */}
          {showAction && <div className="mt-1">{getActionButton()}</div>}
        </div>

      </div>

      {/* Desktop Layout */}
      <div className="items-center hidden w-full gap-6 lg:flex">
        {/* Client Avatar */}
        <Avatar className="w-[52.5px] h-[60px] rounded-lg shrink-0">
          {shift.client?.profileImage && (
            <AvatarImage
              src={shift.client.profileImage}
              alt={getClientName(shift.client)}
              className="object-cover w-full h-full aspect-auto"
            />
          )}
          <AvatarFallback
            className="w-full h-full rounded-lg bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-xl font-bold">
            {getInitialsFromName(getClientName(shift.client))}
          </AvatarFallback>
        </Avatar>

        {/* Shift Details */}
        <div className="flex items-center flex-1 min-w-0 gap-16">
          {/* Client Name */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <p className="text-[16px] font-semibold text-[#10141a] leading-[1.6] whitespace-nowrap">
              {shift.client?.firstName} {shift.client?.lastName}
            </p>
            <p className="text-[14px] text-[#808081] leading-[1.4] whitespace-nowrap">Client</p>
          </div>

          {/* Info Grid */}
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
                    ? format(new Date(shift.clockedInAt), 'hh:mm a')
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
                  className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">{format(new Date(shift.clockedInAt), 'hh:mm a')}</p>
              </div>
            )}

            {shift.clockedOutAt && (
              <div className="flex flex-col shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">Clocked Out</p>
                <p
                  className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">{format(new Date(shift.clockedOutAt), 'hh:mm a')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {panel === 'today' && (
            <>
              {shift.startTime && shift.endTime && shift.date && isShiftExpiringSoon(shift.startTime, shift.endTime, shift.date) && shift.actionStatus === ShiftActionStatus.CLOCK_IN && (
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
          {/* Action Button - Desktop */}
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

  // Display shifts based on expanded state
  const displayShifts = isExpanded
    ? shifts.slice(startIndex, endIndex)
    : shifts.slice(0, maxVisibleShifts);

  // Reset to page 1 when expanding/collapsing
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
              style={{width: "16px", height: "16px"}}
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
            <ChevronRight size={20} className="rotate-180"/>
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
            <ChevronRight size={20}/>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ShiftManagementPage() {
  const {user} = useAuth();
  const navigate = useNavigate();
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [previousExpanded, setPreviousExpanded] = useState(false);
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [previousShifts, setPreviousShifts] = useState<Shift[]>([]);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [clockOutShiftId, setClockOutShiftId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string>("Getting location...");
  const [locationError, setLocationError] = useState(false);
  const [showLocationErrorModal, setShowLocationErrorModal] = useState(false);
  const [todayLoading, setTodayLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [previousLoading, setPreviousLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const currentDate = new Date();

  const initiateTimeRemaining = () => {
    if (todayShift) {
      setTimeRemaining(calculateRemainingMinutes(todayShift.endTime || '', todayShift.date))
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadShifts();
    }
  }, [user?.id]);

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

    const loadTodayShifts = async () => {
      try {
        setTodayLoading(true);
        const todayResponse = await getTodayShifts(agencyId, employeeId);
        if (todayResponse.success) {
          setTodayShift(todayResponse.shift);
        }
      } catch (error: any) {
        console.error('Failed to load today shifts:', error);
        toast.error('Failed to load today shifts', {
          description: error?.response?.data?.error || 'Please try again later'
        });
      } finally {
        setTodayLoading(false);
      }
    };

    const loadUpcomingShifts = async () => {
      try {
        setUpcomingLoading(true);
        const upcomingResponse = await getAvailableShifts(undefined, agencyId, employeeId);
        if (upcomingResponse.success) {
          setUpcomingShifts(upcomingResponse.shifts);
        }
      } catch (error: any) {
        console.error('Failed to load upcoming shifts:', error);
        toast.error('Failed to load upcoming shifts', {
          description: error?.response?.data?.error || 'Please try again later'
        });
      } finally {
        setUpcomingLoading(false);
      }
    };

    const loadPreviousShifts = async () => {
      try {
        setPreviousLoading(true);
        const previousResponse = await getPreviousShifts(30, agencyId, employeeId);
        if (previousResponse.success) {
          setPreviousShifts(previousResponse.shifts);
        }
      } catch (error: any) {
        console.error('Failed to load previous shifts:', error);
        toast.error('Failed to load previous shifts', {
          description: error?.response?.data?.error || 'Please try again later'
        });
      } finally {
        setPreviousLoading(false);
      }
    };

    await Promise.all([
      loadTodayShifts(),
      loadUpcomingShifts(),
      loadPreviousShifts()
    ]);
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const {latitude, longitude} = position.coords;

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();

            if (data.address) {
              const address = [
                data.address.road || data.address.suburb,
                data.address.city || data.address.town || data.address.village,
                data.address.state
              ]
                .filter(Boolean)
                .join(", ");

              setUserLocation(address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            } else {
              setUserLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }
          } catch (error) {
            setUserLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        },
        (error) => {
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
          maximumAge: 300000
        }
      );
    } else {
      setUserLocation("Geolocation not supported");
      setLocationError(true);
    }
  }, []);

  const handleShiftAction = async (shiftId: string) => {
    const shift = todayShift?.id === shiftId ? todayShift : null;
    if (!shift) return;

    if (shift.actionStatus === ShiftActionStatus.CLOCK_IN) {
      if (locationError || userLocation === "Getting location...") {
        toast.error('Location unavailable', {
          description: 'Please enable location services and try again'
        });
        return;
      }

      if (!checkLocationMatch(userLocation, shift.location)) {
        setShowLocationErrorModal(true);
        return;
      }
    }

    try {
      setShiftsLoading(true);
      let response;

      if (shift.actionStatus === ShiftActionStatus.CLOCK_IN) {
        response = await apiClockIn(shiftId);
      } else if (shift.actionStatus === ShiftActionStatus.SHIFT_STARTED) {
        response = await apiShiftStarted(shiftId, user?.uid);
      } else if (shift.actionStatus === ShiftActionStatus.CLOCK_OUT) {
        setClockOutShiftId(shiftId);
        setShowClockOutModal(true);
        return;
      }

      if (response?.success) {
        setTodayShift(response.shift);
        toast.success('Action completed successfully');
      }
    } catch (error: any) {
      console.error('Failed to perform shift action:', error);
      toast.error('Action failed', {
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

    try {
      setShiftsLoading(true);
      const response = await apiClockOut(clockOutShiftId);

      if (response?.success) {
        setPreviousShifts((prev) => [response.shift, ...prev]);
        setTodayShift(null);
        setShowClockOutModal(false);
        setClockOutShiftId(null);
        toast.success('Clocked out successfully');

        const agencyId = user?.agencyId;
        const employeeId = user?.id;
        if (agencyId && employeeId) {
          const todayResponse = await getTodayShifts(agencyId, employeeId);
          if (todayResponse.success) {
            setTodayShift(todayResponse.shift);
          }
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
            <Plus size={20}/>
            Manual Timesheet
          </Button>
        </div>
      </div>

      <div className="bg-white/30 backdrop-blur border border-white/30 rounded-[20px] p-3 lg:p-5 relative">
        {/* Info Bar - Visible on all screens, wraps responsively */}
        <div
          className="flex bg-white/0 backdrop-blur rounded-[20px] min-h-[46px] mb-4 lg:mb-6 items-start flex-wrap gap-3 sm:gap-4 lg:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="bg-white/50 backdrop-blur-[8px] border border-white/30 rounded-full p-2.5 sm:p-3 w-[38px] h-[38px] sm:w-[43px] sm:h-[43px] flex items-center justify-center shrink-0">
              <Calendar size={18} className="sm:w-5 sm:h-5"/>
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
              <Clock size={18} className="sm:w-5 sm:h-5"/>
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
              <MapPin size={18} className={`sm:w-5 sm:h-5 ${locationError ? "text-red-500" : ""}`}/>
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
          {todayLoading ? (
            <div
              className="bg-[rgba(14,175,82,0.1)] backdrop-blur border border-white/30 rounded-[30px] p-5 min-h-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#0eaf52]"/>
                <p className="text-[14px] text-[#808081]">Loading today's shifts...</p>
              </div>
            </div>
          ) : todayShift ? (
            <ShiftSection
              title="Today's Shift"
              subtitle="These are your shifts for the day."
              shifts={[{...todayShift, timeRemaining: timeRemaining !== null ? timeRemaining : undefined}]}
              panel="today"
              backgroundColor="bg-[rgba(14,175,82,0.1)]"
              showExpandButton={false}
              maxVisibleShifts={1}
              onActionClick={handleShiftAction}
              isLoading={shiftsLoading}
            />
          ) : null}

          {upcomingLoading ? (
            <div
              className="bg-[rgba(43,130,255,0.1)] backdrop-blur border border-white/30 rounded-[30px] p-5 min-h-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#2B82FF]"/>
                <p className="text-[14px] text-[#808081]">Loading upcoming shifts...</p>
              </div>
            </div>
          ) : (
            <ShiftSection
              title="Upcoming Shifts"
              subtitle="These are your shifts for the day."
              shifts={upcomingShifts}
              panel="upcoming"
              backgroundColor="bg-[rgba(43,130,255,0.1)]"
              isExpanded={upcomingExpanded}
              onExpandToggle={() => setUpcomingExpanded(!upcomingExpanded)}
              showDate
              showAction={false}
              isLoading={shiftsLoading}
            />
          )}

          {previousLoading ? (
            <div
              className="bg-white/30 backdrop-blur border border-white/30 rounded-[30px] p-5 min-h-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#808081]"/>
                <p className="text-[14px] text-[#808081]">Loading previous shifts...</p>
              </div>
            </div>
          ) : (
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

      {/* Clock Out Confirmation Modal */}
      <ClockOutModal
        isOpen={showClockOutModal}
        onConfirm={handleClockOutConfirm}
        onCancel={() => setShowClockOutModal(false)}
        isLoading={shiftsLoading}
      />

      {/* Location Error Modal */}
      <LocationErrorModal
        isOpen={showLocationErrorModal}
        onClose={() => setShowLocationErrorModal(false)}
        userLocation={userLocation}
        shiftLocation={formatShiftLocation(todayShift?.location) || ''}
      />
    </div>
  );
}

