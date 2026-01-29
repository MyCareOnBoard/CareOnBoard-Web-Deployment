import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import IncidentDetailModal from "./components/IncidentDetailModal";
import { 
  getAllIncidents,
  IncidentReport,
  IncidentStatus,
  getIncidentStatusText 
} from "@/lib/api/incidents";
import { Client, getClientById } from "@/lib/api/clients";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";

export default function IncidentPage() {
  const { user } = useAuth();
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Fetch incidents on mount and page change
  useEffect(() => {
    if (user?.agencyId) {
      fetchIncidents();
    } else {
      setLoading(false);
    }
  }, [user?.agencyId, currentPage]);

  // Helper function to enrich incidents with full client data
  const enrichIncidentsWithClientData = async (incidentsList: IncidentReport[]) => {
    if (!user?.agencyId) return incidentsList;

    const enrichedIncidents = await Promise.all(
      incidentsList.map(async (incident) => {
        // If client data is already complete, return as is
        if (incident.client?.firstName && incident.client?.lastName) {
          return incident;
        }

        // If we have a clientId but incomplete client data, fetch it
        if (incident.clientId) {
          try {
            const clientData = await getClientById(incident.clientId, user.agencyId);

            if (clientData) {
              return {
                ...incident,
                client: clientData
              };
            }
          } catch (error) {
            console.error(`Error fetching client ${incident.clientId}:`, error);
          }
        }

        return incident;
      })
    );

    return enrichedIncidents;
  };

  const fetchIncidents = async () => {
    if (!user?.agencyId) return;

    try {
      setLoading(true);
      
      const response = await getAllIncidents(user.agencyId, {
        page: currentPage,
        limit: itemsPerPage,
      });

      if (response.success && response.data) {
        // Handle both array response and object with incidents array
        const incidentsArray = Array.isArray(response.data) 
          ? response.data 
          : response.data.incidents || [];
        
        // Enrich incidents with full client data
        const enrichedIncidents = await enrichIncidentsWithClientData(incidentsArray);
        setIncidents(enrichedIncidents);
        
        // Get pagination info
        const totalPagesValue = Array.isArray(response.data) 
          ? 1 
          : (response.data as any).pagination?.totalPages || 1;
        setTotalPages(totalPagesValue);
      } else {
        setIncidents([]);
        setTotalPages(1);
      }
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load incidents. Please try again.",
        variant: "destructive",
      });
      
      setIncidents([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.SUBMITTED:
        // Display as "Under Review" for submitted incidents
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-medium border border-[#FF6C10] text-[#FF6C10] bg-transparent">
            Under Review
          </span>
        );
      case IncidentStatus.UNDER_REVIEW:
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-medium border border-[#FF6C10] text-[#FF6C10] bg-transparent">
            Under Review
          </span>
        );
      case IncidentStatus.RESOLVED:
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-medium border border-[#22c55e] text-[#22c55e] bg-transparent">
            Resolved
          </span>
        );
      case IncidentStatus.NOT_RESOLVED:
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-medium border border-[#ef4444] text-[#ef4444] bg-transparent">
            Not Resolved
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-medium border border-[#6b7280] text-[#6b7280] bg-transparent">
            {getIncidentStatusText(status)}
          </span>
        );
    }
  };

  const handleStatusUpdate = async (incidentId: string, newStatus: "resolved" | "not-resolved" | "cancelled") => {
    // Optimistically update local state
    setIncidents((prevIncidents) =>
      prevIncidents.map((inc) =>
        inc._id === incidentId
          ? {
              ...inc,
              status:
                newStatus === "resolved"
                  ? IncidentStatus.RESOLVED
                  : newStatus === "not-resolved"
                  ? IncidentStatus.NOT_RESOLVED
                  : inc.status,
            }
          : inc
      )
    );
    
    // Close modal
    setSelectedIncident(null);
    
    // Refresh from server
    await fetchIncidents();
  };

  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '??';
    
    const names = fullName.trim().split(' ');
    if (names.length === 0) return '??';
    
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getClientInitials = (client: Client | undefined) => {
    if (!client) return '??';
    
    const first = client.firstName?.[0] || '';
    const last = client.lastName?.[0] || '';
    const initials = (first + last).toUpperCase();
    
    return initials || '??';
  };

  const getClientName = (incident: IncidentReport) => {
    if (incident.client?.firstName || incident.client?.lastName) {
      return `${incident.client.firstName || ''} ${incident.client.lastName || ''}`.trim();
    }
    if (incident.clientName) {
      return incident.clientName;
    }
    return 'N/A';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    
    // If time is in HH:mm format (from the form)
    if (timeString.includes(':') && !timeString.includes('T')) {
      try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const isPM = hour >= 12;
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
      } catch {
        return timeString;
      }
    }
    
    // If it's a full date string, extract time
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Incident
        </h1>
      </div>

      {/* Incident Log Section */}
      <div className="overflow-hidden bg-white shadow-sm rounded-xl sm:rounded-2xl">
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a]">
              Incident Log
            </h2>
            <button
              onClick={() => fetchIncidents()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#00b8d4] hover:bg-[#f3f4f6] rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-[13px] sm:text-[14px] text-[#6b7280]">
            These are your Pending Incident Approvals
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-8 text-center sm:p-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00b8d4] border-r-transparent align-[-0.125em]"></div>
            <p className="mt-4 text-[14px] text-[#6b7280]">Loading incidents...</p>
          </div>
        ) : !incidents || incidents.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <p className="text-[14px] text-[#6b7280]">No pending incidents</p>
          </div>
        ) : (
          <>
            {/* Incident List */}
            <div className="divide-y divide-[#e5e7eb]">
              {incidents.map((incident) => (
                <div key={incident._id} className="p-4 sm:p-6">
                  {/* Mobile/Tablet Layout */}
                  <div className="flex flex-col gap-4 lg:hidden">
                    {/* Client & DSP Row */}
                    <div className="flex gap-4">
                      {/* Client */}
                      <div className="flex items-center flex-1 gap-3">
                        <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden bg-gradient-to-br from-[#00b8d4] to-[#0097b2] rounded-full">
                          <span className="text-[14px] font-semibold text-white">
                            {getClientInitials(incident.client)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] sm:text-[15px] font-semibold text-[#10141a] truncate">
                            {getClientName(incident)}
                          </div>
                          <div className="text-[12px] sm:text-[13px] text-[#6b7280]">
                            Client
                          </div>
                        </div>
                      </div>

                      {/* DSP */}
                      <div className="flex items-center flex-1 gap-3">
                        <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden bg-gradient-to-br from-[#6366f1] to-[#4f46e5] rounded-full">
                          <span className="text-[14px] font-semibold text-white">
                            {getInitials(incident.employee?.fullName)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] sm:text-[15px] font-semibold text-[#10141a] truncate">
                            {incident.employee?.fullName || incident.employeeId || 'N/A'}
                          </div>
                          <div className="text-[12px] sm:text-[13px] text-[#6b7280]">
                            DSP
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Time Row - FIXED */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex-shrink-0">
                        {getStatusBadge(incident.status)}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-[12px] sm:text-[13px]">
                        <div>
                          <span className="text-[#6b7280]">Date: </span>
                          <span className="font-medium text-[#10141a]">
                            {formatDate(incident.date || incident.incidentDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#6b7280]">Time: </span>
                          <span className="font-medium text-[#10141a]">
                            {formatTime(incident.time || incident.incidentDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Details Button */}
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="w-full px-6 py-2 rounded-full bg-[#00b8d4] text-white text-[14px] font-medium hover:bg-[#00a5c0] transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:flex lg:items-center lg:gap-6">
                    {/* Client */}
                    <div className="flex items-center gap-3 w-[200px]">
                      <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-gradient-to-br from-[#00b8d4] to-[#0097b2] rounded-full">
                        <span className="text-[14px] font-semibold text-white">
                          {getClientInitials(incident.client)}
                        </span>
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold text-[#10141a]">
                          {getClientName(incident)}
                        </div>
                        <div className="text-[13px] text-[#6b7280]">
                          Client
                        </div>
                      </div>
                    </div>

                    {/* DSP */}
                    <div className="flex items-center gap-3 w-[200px]">
                      <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-gradient-to-br from-[#6366f1] to-[#4f46e5] rounded-full">
                        <span className="text-[14px] font-semibold text-white">
                          {getInitials(incident.employee?.fullName)}
                        </span>
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold text-[#10141a]">
                          {incident.employee?.fullName || incident.employeeId || 'N/A'}
                        </div>
                        <div className="text-[13px] text-[#6b7280]">
                          DSP
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="w-[140px]">
                      {getStatusBadge(incident.status)}
                    </div>

                    {/* Date - FIXED */}
                    <div className="w-[120px]">
                      <div className="text-[13px] text-[#6b7280] mb-1">Date</div>
                      <div className="text-[15px] font-medium text-[#10141a]">
                        {formatDate(incident.date || incident.incidentDate)}
                      </div>
                    </div>

                    {/* Time - FIXED */}
                    <div className="w-[100px]">
                      <div className="text-[13px] text-[#6b7280] mb-1">Time</div>
                      <div className="text-[15px] font-medium text-[#10141a]">
                        {formatTime(incident.time || incident.incidentDate)}
                      </div>
                    </div>

                    {/* Details Button */}
                    <div className="ml-auto">
                      <button
                        onClick={() => setSelectedIncident(incident)}
                        className="px-4 py-2 rounded-full bg-[#00b8d4] text-white text-[14px] font-medium hover:bg-[#00a5c0] transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="p-4 sm:p-6 border-t border-[#e5e7eb] flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-[#6b7280]" />
              </button>
              <span className="text-[14px] sm:text-[15px] text-[#6b7280]">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-[#6b7280]" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
