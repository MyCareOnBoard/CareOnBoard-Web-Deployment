import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search, X, Loader2, CheckCircle, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { format } from "date-fns";
import { listShifts, Shift, updateShift, ShiftStatus } from "@/lib/api/shifts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const getInitialsFromName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
};

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive">("inactive");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCancelSuccessModal, setShowCancelSuccessModal] = useState(false);
  const [shiftToApprove, setShiftToApprove] = useState<Shift | null>(null);
  const [approvedShiftInfo, setApprovedShiftInfo] = useState<{
    clientName: string;
    dspName: string;
    duration: string;
    date: string;
  } | null>(null);
  const [cancelledShiftInfo, setCancelledShiftInfo] = useState<{
    clientName: string;
    dspName: string;
    duration: string;
    date: string;
  } | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  const itemsPerPage = 7;

  // Fetch shifts from API
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setLoading(true);
        const response = await listShifts({
          limit: 100,
          agencyId: user?.profile?.id,
          client: true,
          employee: true,
        });
        // Get all completed shifts (we'll filter by approved status based on filterStatus)
        const completedShifts = (response.shifts || []).filter(shift => 
          shift.status === ShiftStatus.COMPLETED
        );
        setShifts(completedShifts);
      } catch (error) {
        console.error("Failed to fetch shifts:", error);
        toast({
          title: "Error",
          description: "Failed to load shifts. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.profile?.id) {
      fetchShifts();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profile?.id]);

  // Filter shifts based on search and filter status (active/inactive)
  const filteredShifts = useMemo(() => {
    let result = shifts;
    
    // Filter by approved status based on active/inactive
    if (filterStatus === "active") {
      // Active = approved shifts
      result = result.filter(shift => shift.approved === true);
    } else {
      // Inactive = pending approval (false or null)
      result = result.filter(shift => 
        shift.approved === false || shift.approved === null || shift.approved === undefined
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(shift => 
        shift.client?.firstName?.toLowerCase().includes(query) ||
        shift.client?.lastName?.toLowerCase().includes(query) ||
        shift.location?.toLowerCase().includes(query) ||
        shift.employee?.fullName?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [shifts, searchQuery, filterStatus]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / itemsPerPage));
  const paginatedShifts = filteredShifts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleApprove = (shift: Shift) => {
    setShiftToApprove(shift);
    setShowApproveModal(true);
  };

  const handleReject = (shift: Shift) => {
    setShiftToApprove(shift);
    setShowRejectModal(true);
  };

  const confirmApproveShift = async (shiftId: string) => {
    try {
      setIsApproving(true);
      await updateShift(shiftId, { approved: true });
      
      // Capture info for success modal before we update the shift
      if (shiftToApprove) {
        const clientName = shiftToApprove.client
          ? `${shiftToApprove.client.firstName || ""} ${shiftToApprove.client.lastName || ""}`.trim() || "Unknown Client"
          : "Unknown Client";
        const dspName = shiftToApprove.employee?.fullName || "Unknown DSP";
        const duration = calculateDuration(
          shiftToApprove.date,
          shiftToApprove.startTime,
          shiftToApprove.endTime
        );
        const dateLabel = shiftToApprove.date
          ? format(new Date(shiftToApprove.date), "d MMMM")
          : format(new Date(), "d MMMM");

        setApprovedShiftInfo({
          clientName,
          dspName,
          duration,
          date: dateLabel,
        });
      }
      
      // Update the shift in the local state
      setShifts(prev => prev.map(shift => 
        shift.id === shiftId 
          ? { ...shift, approved: true }
          : shift
      ));
      
      setShowApproveModal(false);
      setShiftToApprove(null);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Failed to approve shift:", error);
      toast({
        title: "Error",
        description: "Failed to approve shift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const confirmRejectShift = async (shiftId: string) => {
    try {
      setIsRejecting(true);
      await updateShift(shiftId, { approved: false });
      
      // Capture info for success modal before we update the shift
      if (shiftToApprove) {
        const clientName = shiftToApprove.client
          ? `${shiftToApprove.client.firstName || ""} ${shiftToApprove.client.lastName || ""}`.trim() || "Unknown Client"
          : "Unknown Client";
        const dspName = shiftToApprove.employee?.fullName || "Unknown DSP";
        const duration = calculateDuration(
          shiftToApprove.date,
          shiftToApprove.startTime,
          shiftToApprove.endTime
        );
        const dateLabel = shiftToApprove.date
          ? format(new Date(shiftToApprove.date), "d MMMM")
          : format(new Date(), "d MMMM");

        setCancelledShiftInfo({
          clientName,
          dspName,
          duration,
          date: dateLabel,
        });
      }
      
      // Update the shift in the local state - keep it in the list with approved: false
      // It will remain visible in the inactive filter
      setShifts(prev => prev.map(shift => 
        shift.id === shiftId 
          ? { ...shift, approved: false }
          : shift
      ));
      
      setShowRejectModal(false);
      setShiftToApprove(null);
      setShowCancelSuccessModal(true);
    } catch (error) {
      console.error("Failed to reject shift:", error);
      toast({
        title: "Error",
        description: "Failed to reject shift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };


  // Calculate shift duration from 12-hour times like "09:00:AM" or "11.30:AM"
  const calculateDuration = (date: string, startTime?: string, endTime?: string): string => {
    if (!startTime || !endTime) return "2 hours";

    const parseTimeToMinutes = (time: string): number | null => {
      const match = time.match(/(\d+)[.:](\d+):?(AM|PM)/i);
      if (!match) return null;

      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();

      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    try {
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = parseTimeToMinutes(endTime);

      if (startMinutes == null || endMinutes == null) return "2 hours";

      let diffMinutes = endMinutes - startMinutes;
      if (diffMinutes <= 0) return "2 hours";

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${hours} hours`;
    } catch {
      return "2 hours";
    }
  };

  return (
    <>
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Approvals
        </h1>
      </div>

      {/* Main Content Card */}
      <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
        <div className="p-5">
          {/* Card Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Pending Approvals
              </h2>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081] capitalize">
                Completed shifts awaiting approval.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
               {/* Search */}
               <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full px-3 py-2 h-[36px] w-[320px]">
                <Search className="w-4 h-4 text-[#808081]" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 bg-transparent text-[12px] font-medium text-[#10141a] placeholder:text-[#808081] outline-none"
                />
              </div>

              {/* Active/Inactive Filter Buttons */}
              <button
                onClick={() => {
                  setFilterStatus("active");
                  setCurrentPage(1);
                }}
                className={`h-[36px] px-4 rounded-full text-[12px] font-semibold transition-all border ${
                  filterStatus === "active"
                    ? "backdrop-blur-[22px] bg-[rgba(255,255,255,0.5)] border-[#b2b2b3] text-[#808081]"
                    : "border-transparent text-[#808081] opacity-60 hover:opacity-100"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => {
                  setFilterStatus("inactive");
                  setCurrentPage(1);
                }}
                className={`h-[36px] px-4 rounded-full text-[12px] font-semibold transition-all border ${
                  filterStatus === "inactive"
                    ? "backdrop-blur-[22px] bg-[rgba(255,255,255,0.5)] border-[#b2b2b3] text-[#808081]"
                    : "border-transparent text-[#808081] opacity-60 hover:opacity-100"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Shifts List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#00b4b8]" />
              </div>
            ) : paginatedShifts.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-[14px] text-[#808081]">No pending approvals found</p>
              </div>
            ) : (
              paginatedShifts.map((shift) => {
                const apiShift = shift as Shift;
                const clientName = apiShift.client 
                  ? `${apiShift.client.firstName || ""} ${apiShift.client.lastName || ""}`.trim() || "Unknown Client"
                  : "Unknown Client";
                const clientAvatar = apiShift.client?.profileImage;
                const employeeName = apiShift.employee?.fullName || "Unknown DSP";
                const employeeAvatar = apiShift.employee?.profilePicture;
                const location = apiShift.location || "Unknown Location";
                const duration = calculateDuration(apiShift.date, apiShift.startTime, apiShift.endTime);

                return (
                  <div
                    key={apiShift.id}
                    className="flex flex-wrap items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
                  >
                    {/* Client Info */}
                    <div className="flex items-center gap-4 w-[256px]">
                      <Avatar className="w-[52.5px] h-[60px] rounded-[8px] flex-shrink-0">
                        {clientAvatar && (
                          <AvatarImage
                            src={clientAvatar}
                            alt={clientName}
                            className="w-full h-full object-cover aspect-auto rounded-[8px]"
                          />
                        )}
                        <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                          {getInitialsFromName(clientName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[16px] font-semibold leading-[1.6] text-black">
                          {clientName}
                        </span>
                        <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                          Client
                        </span>
                      </div>
                    </div>

                    {/* DSP/Employee Info */}
                    <div className="flex items-center gap-4 w-[256px]">
                      <Avatar className="w-[52.5px] h-[60px] rounded-[8px] flex-shrink-0">
                        {employeeAvatar && (
                          <AvatarImage
                            src={employeeAvatar}
                            alt={employeeName}
                            className="w-full h-full object-cover aspect-auto rounded-[8px]"
                          />
                        )}
                        <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                          {getInitialsFromName(employeeName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[16px] font-semibold leading-[1.6] text-black">
                          {employeeName}
                        </span>
                        <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                          DSP
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex-1 flex items-center gap-[55px] w-[256px]">
                      <div className="w-[123px]">
                        <p className="text-[12px] font-medium leading-[1.4] text-[#808081] mb-0">Location</p>
                        <p className="text-[12px] font-medium leading-[1.4] text-[#10141a]">{location}</p>
                      </div>

                      {/* Duration Badge */}
                      <div className="bg-[rgba(14,175,82,0.05)] border-[0.5px] border-[#0eaf52] rounded-[60px] px-[10px] py-[6px] min-w-[59px] flex items-center justify-center">
                        <span className="text-[12px] font-semibold text-[#0eaf52] whitespace-nowrap">
                          {duration}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-[55px] w-[256px]">
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(apiShift)}
                          className="bg-[#0eaf52] hover:bg-[#0d9a47] text-white rounded-[60px] px-4 py-3 h-auto text-[12px] font-semibold flex items-center gap-1 backdrop-blur-[22px]"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReject(apiShift)}
                          className="bg-[#d53411] hover:bg-[#c02e0f] text-white rounded-[60px] px-4 py-3 h-auto text-[12px] font-semibold flex items-center gap-1 backdrop-blur-[22px]"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {filteredShifts.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
                {currentPage}
                <span className="text-[14px] text-[#808081]">/{totalPages}</span>
              </span>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-[#10141a]" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-[#10141a]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Approve Shift Confirmation Dialog */}
    <Dialog
      open={showApproveModal && !!shiftToApprove}
      onOpenChange={(open) => {
        if (isApproving) return;
        setShowApproveModal(open);
        if (!open) {
          setShiftToApprove(null);
        }
      }}
    >
      <DialogContent showCloseButton={false} className="items-stretch text-left max-w-[400px]">
        {shiftToApprove && (
          <>
            <DialogHeader className="items-start text-left gap-2">
              <DialogTitle className="text-[20px] font-semibold leading-normal text-[#10141a]">
                Approve shift?
              </DialogTitle>
              <DialogDescription className="text-[14px] leading-[1.6] text-[#808081]">
                Are you sure you want to approve this shift for{" "}
                <span className="font-semibold text-[#10141a]">
                  {shiftToApprove.client
                    ? `${shiftToApprove.client.firstName || ""} ${shiftToApprove.client.lastName || ""}`.trim() || "Unknown Client"
                    : "Unknown Client"}
                </span>
                ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-3 mt-2">
              <Button
                variant="outline"
                disabled={isApproving}
                onClick={() => setShowApproveModal(false)}
                className="rounded-full px-4 py-2 h-auto text-[14px]"
              >
                Cancel
              </Button>
              <Button
                disabled={isApproving}
                onClick={() => confirmApproveShift(shiftToApprove.id)}
                className="bg-[#0eaf52] hover:bg-[#0d9a47] text-white rounded-full px-4 py-2 h-auto text-[14px] font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
                Approve Shift
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Reject Shift Confirmation Dialog */}
    <Dialog
      open={showRejectModal && !!shiftToApprove}
      onOpenChange={(open) => {
        if (isRejecting) return;
        setShowRejectModal(open);
        if (!open) {
          setShiftToApprove(null);
        }
      }}
    >
      <DialogContent showCloseButton={false} className="items-stretch text-left max-w-[400px]">
        {shiftToApprove && (
          <>
            <DialogHeader className="items-start text-left gap-2">
              <DialogTitle className="text-[20px] font-semibold leading-normal text-[#10141a]">
                Reject shift?
              </DialogTitle>
              <DialogDescription className="text-[14px] leading-[1.6] text-[#808081]">
                Are you sure you want to reject this shift for{" "}
                <span className="font-semibold text-[#10141a]">
                  {shiftToApprove.client
                    ? `${shiftToApprove.client.firstName || ""} ${shiftToApprove.client.lastName || ""}`.trim() || "Unknown Client"
                    : "Unknown Client"}
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-3 mt-2">
              <Button
                variant="outline"
                disabled={isRejecting}
                onClick={() => setShowRejectModal(false)}
                className="rounded-full px-4 py-2 h-auto text-[14px]"
              >
                Cancel
              </Button>
              <Button
                disabled={isRejecting}
                onClick={() => confirmRejectShift(shiftToApprove.id)}
                className="bg-[#d53411] hover:bg-[#c02e0f] text-white rounded-full px-4 py-2 h-auto text-[14px] font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                Reject Shift
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Approval Success Modal */}
    <Dialog
      open={showSuccessModal && !!approvedShiftInfo}
      onOpenChange={(open) => {
        setShowSuccessModal(open);
        if (!open) {
          setApprovedShiftInfo(null);
        }
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-[438px]">
        {approvedShiftInfo && (
          <>
            {/* Success Icon */}
            <div className="relative flex items-center justify-center">
              <div className="w-[100px] h-[100px] rounded-full bg-[#F0FAF4] flex items-center justify-center">
                <div className="w-[72px] h-[72px] rounded-full bg-[#0eaf52] flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Header & Description */}
            <DialogHeader className="text-center">
              <DialogTitle className="text-[32px] font-semibold leading-normal text-[#10141a] mb-2">
                Approved
              </DialogTitle>
              <DialogDescription className="text-[16px] font-medium leading-[1.6] text-[#808081] max-w-[304px] mx-auto">
                You have approved a shift between {approvedShiftInfo.clientName} (Client) &{" "}
                {approvedShiftInfo.dspName} (DSP) for {approvedShiftInfo.duration} on{" "}
                {approvedShiftInfo.date}
              </DialogDescription>
            </DialogHeader>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Cancel Success Modal */}
    <Dialog
      open={showCancelSuccessModal && !!cancelledShiftInfo}
      onOpenChange={(open) => {
        setShowCancelSuccessModal(open);
        if (!open) {
          setCancelledShiftInfo(null);
        }
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-[438px]">
        {cancelledShiftInfo && (
          <>
            {/* Success Icon */}
            <div className="relative flex items-center justify-center">
              <div className="w-[100px] h-[100px] rounded-full bg-[#fff0ec] flex items-center justify-center">
                <div className="w-[72px] h-[72px] rounded-full bg-[#d53411] flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-white" strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Header & Description */}
            <DialogHeader className="text-center">
              <DialogTitle className="text-[32px] font-semibold leading-normal text-[#10141a] mb-2">
                Cancelled
              </DialogTitle>
              <DialogDescription className="text-[16px] font-medium leading-[1.6] text-[#808081] max-w-[304px] mx-auto">
                You have cancelled a shift between {cancelledShiftInfo.clientName} (Client) &{" "}
                {cancelledShiftInfo.dspName} (DSP) for {cancelledShiftInfo.duration} on{" "}
                {cancelledShiftInfo.date}
              </DialogDescription>
            </DialogHeader>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

