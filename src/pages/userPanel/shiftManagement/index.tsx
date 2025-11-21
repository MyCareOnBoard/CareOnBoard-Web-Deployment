import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Clock, MapPin, Calendar, ChevronRight, Plus, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Shift, ShiftStatus, ShiftActionStatus } from "./types";
import { format } from "date-fns";
import { ClockOutModal } from "./ClockOutModal";
import ExpandIcon from "@/assets/icons/arrow-expand-01.svg?react";
import { Routes } from "@/routes/constants";
import {
  getTodayShifts,
  clockIn as apiClockIn,
  clockOut as apiClockOut,
  updateShiftStatus,
  seedShifts,
  getAvailableShifts,
  getPreviousShifts,
} from "@/lib/api/shift-management";
import { toast } from "sonner";
import { useAuth } from "@/utils/auth/context/AuthContext";

const convertTimeToISODate = (timeString: string, dateString: string): Date => {
  const timeMatch = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
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

const calculateRemainingMinutes = (clockedInAt: string, endTime: string, date: string): number => {
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

const calculateTimeUntilStart = (startTime: string, date: string): string => {
  try {
    const now = new Date();
    const startDateTime = convertTimeToISODate(startTime, date);
    const diffInMs = startDateTime.getTime() - now.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMinutes <= 0) {
      return 'Available now';
    }
    
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    
    if (hours === 0) {
      return `Available in ${minutes}min`;
    }
    
    if (minutes === 0) {
      return `Available in ${hours}h`;
    }
    
    return `Available in ${hours}h ${minutes}min`;
  } catch (error) {
    console.error('Error calculating time until start:', error);
    return 'Available soon';
  }
};

interface ShiftCardProps {
  shift: Shift;
  showDate?: boolean;
  showAction?: boolean;
  onActionClick?: (shiftId: string) => void;
  isLoading?: boolean;
}

function ShiftCard({ shift, showDate = false, showAction = true, onActionClick, isLoading = false }: ShiftCardProps) {
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
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
        {config.label}
      </Button>
    );
  };

  return (
    <div className="bg-white/50 backdrop-blur-[20px] rounded-[20px] p-3 lg:p-4 flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 hover:bg-white/70 transition-colors">
      {/* Mobile & Tablet Layout */}
      <div className="flex lg:hidden flex-col gap-2.5 w-full">
        {/* Info Grid - No Avatar on Mobile */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          {/* Client Name */}
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Client</p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] font-semibold whitespace-nowrap">
              {shift.client.name}
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
              <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.location}</p>
            </div>
          )}

          {/* Time */}
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Time</p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">
              {shift.clockedInAt || shift.availableAt || shift.startTime}
            </p>
          </div>
        </div>

        {/* Location row (if date is shown in first row) */}
        {showDate && (
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Location</p>
            <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.location}</p>
          </div>
        )}

        {/* Clock In/Out times for previous shifts */}
        {(shift.clockedInAt || shift.clockedOutAt) && showDate && (
          <div className="grid grid-cols-3 gap-2 text-sm">
            {shift.clockedInAt && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Clock In</p>
                <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.clockedInAt}</p>
              </div>
            )}

            {shift.clockedOutAt && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] text-[#808081] leading-[1.4] whitespace-nowrap">Clock Out</p>
                <p className="text-[13px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.clockedOutAt}</p>
              </div>
            )}
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">

          {(shift.actionStatus === ShiftActionStatus.SHIFT_STARTED || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && (
            <span className="bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] border-solid text-[#0eaf52] text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
              Ongoing Shift
            </span>
          )}

          {shift.timeRemaining !== undefined && (shift.actionStatus === ShiftActionStatus.SHIFT_STARTED || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && (
            <span className={`${shift.timeRemaining <= 5 ? 'bg-[rgba(213,52,17,0.05)] border-[#d53411] text-[#d53411]' : 'bg-[rgba(14,175,82,0.05)] border-[#0eaf52] text-[#0eaf52]'} border-[0.5px] border-solid text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap`}>
              {formatTimeRemaining(shift.timeRemaining)}
            </span>
          )}

          {shift.status === ShiftStatus.PENDING && shift.startTime && (
            <span className="bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] border-solid text-[#0eaf52] text-[11px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
              {calculateTimeUntilStart(shift.startTime, shift.date)}
            </span>
          )}

          {shift.additionalStatus && !(shift.actionStatus === ShiftActionStatus.SHIFT_STARTED || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && shift.status !== ShiftStatus.PENDING && (
            <span
              className={`text-[11px] font-semibold py-1 px-2 rounded-[60px] border-solid leading-normal text-center whitespace-nowrap ${getStatusColor(shift.additionalStatus)}`}
            >
              {shift.additionalStatus}
            </span>
          )}
        {/* Action Button - Mobile */}
        {showAction && <div className="mt-1">{getActionButton()}</div>}
        </div>

      </div>

      {/* Desktop Layout */}
      <div className="items-center hidden w-full gap-6 lg:flex">
        {/* Client Avatar */}
        <div className="w-[52.5px] h-[60px] rounded-[8px] overflow-hidden flex-shrink-0">
          {shift.client.avatar ? (
            <img
              src={shift.client.avatar}
              alt={shift.client.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-xl font-bold">
              {shift.client.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Shift Details */}
        <div className="flex items-center flex-1 min-w-0 gap-16">
          {/* Client Name */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <p className="text-[16px] font-semibold text-[#10141a] leading-[1.6] whitespace-nowrap">
              {shift.client.name}
            </p>
            <p className="text-[14px] text-[#808081] leading-[1.4] whitespace-nowrap">Client</p>
          </div>

          {/* Info Grid */}
          <div className="flex flex-wrap gap-x-16 gap-y-2">
            {shift.clockedInAt && (
              <div className="flex flex-col flex-shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">Date</p>
                <p className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">
                  {format(new Date(shift.date), "dd MMMM")}
                </p>
              </div>
            )}

            <div className="flex flex-col flex-shrink-0 gap-1">
              <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">Location</p>
              <p className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">{shift.location}</p>
            </div>

            {shift.availableAt && (
              <div className="flex flex-col flex-shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">
                  {shift.clockedInAt ? "Started at" : "Available at"}
                </p>
                <p className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">
                  {shift.clockedInAt || format(new Date(shift.availableAt), 'dd MMMM yyyy hh:mm a')}
                </p>
              </div>
            )}

            {shift.clockedInAt && !shift.availableAt && (
              <div className="flex flex-col flex-shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">
                  {shift.clockedOutAt ? "Clocked In" : "Started at"}
                </p>
                <p className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">{format(new Date(shift.clockedInAt), 'hh:mm a')}</p>
              </div>
            )}

            {shift.clockedOutAt && (
              <div className="flex flex-col flex-shrink-0 gap-1">
                <p className="text-[12px] text-[#808081] leading-[1.4] whitespace-nowrap">Clocked Out</p>
                <p className="text-[14px] text-[#10141a] leading-[1.4] whitespace-nowrap">{format(new Date(shift.clockedOutAt), 'hh:mm a')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2">

          {(shift.actionStatus === ShiftActionStatus.SHIFT_STARTED || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && (
            <span className="bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] border-solid text-[#0eaf52] text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
              Ongoing Shift
            </span>
          )}

          {shift.timeRemaining !== undefined && (shift.actionStatus === ShiftActionStatus.SHIFT_STARTED || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && (
            <span className={`${shift.timeRemaining <= 5 ? 'bg-[rgba(213,52,17,0.05)] border-[#d53411] text-[#d53411]' : 'bg-[rgba(14,175,82,0.05)] border-[#0eaf52] text-[#0eaf52]'} border-[0.5px] border-solid text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap`}>
              {formatTimeRemaining(shift.timeRemaining)}
            </span>
          )}

          {shift.status === ShiftStatus.PENDING && shift.startTime && (
            <span className="bg-[rgba(14,175,82,0.05)] border-[#0eaf52] border-[0.5px] border-solid text-[#0eaf52] text-[12px] font-semibold py-1 px-2 rounded-[60px] leading-normal text-center whitespace-nowrap">
              {calculateTimeUntilStart(shift.startTime, shift.date)}
            </span>
          )}

          {shift.additionalStatus && !(shift.actionStatus === ShiftActionStatus.SHIFT_STARTED || shift.actionStatus === ShiftActionStatus.CLOCK_OUT) && shift.status !== ShiftStatus.PENDING && (
            <span
              className={`text-[12px] font-semibold py-1 px-2 rounded-[60px] border-solid leading-normal text-center whitespace-nowrap ${getStatusColor(shift.additionalStatus)}`}
            >
              {shift.additionalStatus}
            </span>
          )}
        {/* Action Button - Desktop */}
        {showAction && <div className="flex-shrink-0">{getActionButton()}</div>}
        </div>

      </div>
    </div>
  );
}

interface ShiftSectionProps {
  title: string;
  subtitle: string;
  shifts: Shift[];
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
          <h3 className="text-[18px] lg:text-[20px] font-medium text-[#10141a] leading-[1.6] whitespace-nowrap">{title}</h3>
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
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [previousShifts, setPreviousShifts] = useState<Shift[]>([]);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [clockOutShiftId, setClockOutShiftId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string>("Getting location...");
  const [locationError, setLocationError] = useState(false);
  const [todayLoading, setTodayLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [previousLoading, setPreviousLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [seedingData, setSeedingData] = useState(false);

  const currentDate = new Date();

  useEffect(() => {
    if (user?.uid) {
      loadShifts();
    }
  }, [user?.uid]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTodayShifts((prevShifts) =>
        prevShifts.map((shift) => {
          if (shift.status === ShiftStatus.ONGOING && shift.clockedInAt && shift.endTime) {
            const timeRemaining = calculateRemainingMinutes(shift.clockedInAt, shift.endTime, shift.date);
            const actionStatus = timeRemaining <= 5
              ? ShiftActionStatus.CLOCK_OUT
              : ShiftActionStatus.SHIFT_STARTED;
            
            return {
              ...shift,
              timeRemaining,
              actionStatus,
            };
          }
          return shift;
        })
      );

      setUpcomingShifts((prevShifts) =>
        prevShifts.map((shift) => ({ ...shift }))
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadShifts = async () => {
    const agencyId = user?.uid;
    
    if (!agencyId) {
      console.warn('No user ID available for fetching shifts');
      return;
    }

    const loadTodayShifts = async () => {
      try {
        setTodayLoading(true);
        const todayResponse = await getTodayShifts(agencyId);
        if (todayResponse.success) {
          const filteredShifts = todayResponse.shifts
            .filter(
              shift => shift.status === ShiftStatus.AVAILABLE || shift.status === ShiftStatus.ONGOING
            )
            .map(shift => {
              if (!shift.actionStatus) {
                if (shift.status === ShiftStatus.ONGOING) {
                  const timeRemaining = shift.clockedInAt && shift.endTime 
                    ? calculateRemainingMinutes(shift.clockedInAt, shift.endTime, shift.date)
                    : undefined;
                  
                  const actionStatus = timeRemaining !== undefined && timeRemaining <= 5
                    ? ShiftActionStatus.CLOCK_OUT
                    : ShiftActionStatus.SHIFT_STARTED;
                  
                  return {
                    ...shift,
                    actionStatus,
                    additionalStatus: "Ongoing Shift",
                    timeRemaining
                  };
                } else if (shift.status === ShiftStatus.AVAILABLE) {
                  return {
                    ...shift,
                    actionStatus: ShiftActionStatus.CLOCK_IN
                  };
                }
              }
              return shift;
            });
          
          setTodayShifts(filteredShifts);
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
        const upcomingResponse = await getAvailableShifts(undefined, agencyId);
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
        const previousResponse = await getPreviousShifts(30, agencyId);
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
          const { latitude, longitude } = position.coords;
          
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
    const shift = todayShifts.find((s) => s.id === shiftId);
    if (!shift) return;

    try {
      setShiftsLoading(true);

      switch (shift.actionStatus) {
        case ShiftActionStatus.CLOCK_IN:
          const clockInResponse = await apiClockIn(shiftId);
          if (clockInResponse.success) {
            toast.success('Clocked in successfully!');
            
            const updatedShift = clockInResponse.shift;
            const timeRemaining = updatedShift.clockedInAt && updatedShift.endTime
              ? calculateRemainingMinutes(updatedShift.clockedInAt, updatedShift.endTime, updatedShift.date)
              : undefined;
            
            const actionStatus = timeRemaining !== undefined && timeRemaining <= 5
              ? ShiftActionStatus.CLOCK_OUT
              : ShiftActionStatus.SHIFT_STARTED;
            
            setTodayShifts((prevShifts) =>
              prevShifts.map((s) =>
                s.id === shiftId
                  ? {
                      ...s,
                      ...clockInResponse.shift,
                      actionStatus,
                      additionalStatus: "Ongoing Shift",
                      timeRemaining,
                    }
                  : s
              )
            );
          }
          break;

        case ShiftActionStatus.SHIFT_STARTED:
          // toast.info('Clock out will be available when 5 minutes or less remain', {
          //   description: 'Please wait until the shift is nearly complete'
          // });
          setTodayShifts((prevShifts) =>
            prevShifts.map((s) => {
              if (s.id === shiftId) {
                return {
                  ...s,
                  actionStatus: ShiftActionStatus.CLOCK_OUT,
                };
              }
              return s;
            })
          );
          break;

        case ShiftActionStatus.CLOCK_OUT:
          setShowClockOutModal(true);
          setClockOutShiftId(shiftId);
          break;

        default:
          break;
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

    const shiftToClockOut = todayShifts.find((s) => s.id === clockOutShiftId);
    if (!shiftToClockOut) return;

    try {
      setShiftsLoading(true);

      const clockOutResponse = await apiClockOut(clockOutShiftId);
      
      if (clockOutResponse.success) {
        toast.success('Clocked out successfully!', {
          description: `Session duration: ${clockOutResponse.shift.sessionDuration || 'N/A'}`
        });

        const completedShift: Shift = {
          ...shiftToClockOut,
          ...clockOutResponse.shift,
          actionStatus: undefined,
          additionalStatus: undefined,
          timeRemaining: undefined,
        };

        setPreviousShifts((prev) => [completedShift, ...prev]);

        setTodayShifts((prev) => prev.filter((s) => s.id !== clockOutShiftId));
      }
    } catch (error: any) {
      console.error('Failed to clock out:', error);
      toast.error('Clock out failed', {
        description: error?.response?.data?.error || 'Please try again'
      });
    } finally {
      setShiftsLoading(false);
      setShowClockOutModal(false);
      setClockOutShiftId(null);
    }
  };

  const handleClockOutCancel = () => {
    setShowClockOutModal(false);
    setClockOutShiftId(null);
  };

  const handleSeedData = async () => {
    try {
      setSeedingData(true);
      
      const agencyId = user?.uid;
      
      if (!agencyId) {
        toast.error('User not authenticated');
        return;
      }
      
      const response = await seedShifts({ agencyId });
      
      if (response.success) {
        toast.success('Dummy data created successfully!', {
          description: `Created ${response.summary.totalCount} shifts across all statuses`
        });
        
        await loadShifts();
      }
    } catch (error: any) {
      console.error('Failed to seed data:', error);
      toast.error('Failed to create dummy data', {
        description: error?.response?.data?.error || 'Please try again'
      });
    } finally {
      setSeedingData(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-2 sm:px-0">
      <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center lg:mb-8">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-semibold leading-[1.6] text-[#10141a] whitespace-nowrap">
          Shift Management
        </h1>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handleSeedData}
            disabled={seedingData}
            className="bg-[#808081] hover:bg-[#6a6a6b] text-white rounded-full px-4 py-2 lg:py-3 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seedingData ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Database size={20} />
            )}
            {seedingData ? 'Creating...' : 'Seed Data'}
          </Button>

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
        {/* Info Bar - Visible on all screens, wraps responsively */}
        <div className="flex bg-white/0 backdrop-blur rounded-[20px] min-h-[46px] mb-4 lg:mb-6 items-start flex-wrap gap-3 sm:gap-4 lg:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/50 backdrop-blur-[8px] border border-white/30 rounded-full p-2.5 sm:p-3 w-[38px] h-[38px] sm:w-[43px] sm:h-[43px] flex items-center justify-center flex-shrink-0">
              <Calendar size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[14px] sm:text-[16px] font-semibold text-[#10141a] leading-[1.4] whitespace-nowrap">Today</p>
              <p className="text-[12px] sm:text-[14px] font-medium text-[#808081] leading-[1.4] whitespace-nowrap">
                {format(currentDate, "dd MMMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/50 backdrop-blur-[8px] border border-white/30 rounded-full p-2.5 sm:p-3 w-[38px] h-[38px] sm:w-[43px] sm:h-[43px] flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[14px] sm:text-[16px] font-semibold text-[#10141a] leading-[1.4] whitespace-nowrap">Time</p>
              <p className="text-[12px] sm:text-[14px] font-medium text-[#808081] leading-[1.4] whitespace-nowrap">
                {format(currentDate, "hh:mm a").toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/50 backdrop-blur-[8px] border border-white/30 rounded-full p-2.5 sm:p-3 w-[38px] h-[38px] sm:w-[43px] sm:h-[43px] flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className={`sm:w-5 sm:h-5 ${locationError ? "text-red-500" : ""}`} />
            </div>
            <div className="max-w-[200px] sm:max-w-[250px]">
              <p className="text-[14px] sm:text-[16px] font-semibold text-[#10141a] leading-[1.4] whitespace-nowrap">Location</p>
              <p className={`text-[12px] sm:text-[14px] font-medium leading-[1.4] truncate ${locationError ? "text-red-500" : "text-[#808081]"}`}>
                {userLocation}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {todayLoading ? (
            <div className="bg-[rgba(14,175,82,0.1)] backdrop-blur border border-white/30 rounded-[30px] p-5 min-h-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#0eaf52]" />
                <p className="text-[14px] text-[#808081]">Loading today's shifts...</p>
              </div>
            </div>
          ) : todayShifts.length > 0 ? (
            <ShiftSection
              title="Today's Shift"
              subtitle="These are your shifts for the day."
              shifts={todayShifts}
              backgroundColor="bg-[rgba(14,175,82,0.1)]"
              showExpandButton={false}
              maxVisibleShifts={1}
              onActionClick={handleShiftAction}
              isLoading={shiftsLoading}
            />
          ) : null}

          {upcomingLoading ? (
            <div className="bg-[rgba(43,130,255,0.1)] backdrop-blur border border-white/30 rounded-[30px] p-5 min-h-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#2B82FF]" />
                <p className="text-[14px] text-[#808081]">Loading upcoming shifts...</p>
              </div>
            </div>
          ) : (
            <ShiftSection
              title="Upcoming Shifts"
              subtitle="These are your shifts for the day."
              shifts={upcomingShifts}
              backgroundColor="bg-[rgba(43,130,255,0.1)]"
              isExpanded={upcomingExpanded}
              onExpandToggle={() => setUpcomingExpanded(!upcomingExpanded)}
              showDate
              isLoading={shiftsLoading}
            />
          )}

          {previousLoading ? (
            <div className="bg-white/30 backdrop-blur border border-white/30 rounded-[30px] p-5 min-h-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#808081]" />
                <p className="text-[14px] text-[#808081]">Loading previous shifts...</p>
              </div>
            </div>
          ) : (
            <ShiftSection
              title="Previous Shifts"
              subtitle="These are your Previous shifts"
              shifts={previousShifts}
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
        onCancel={handleClockOutCancel}
        isLoading={shiftsLoading}
      />
    </div>
  );
}

