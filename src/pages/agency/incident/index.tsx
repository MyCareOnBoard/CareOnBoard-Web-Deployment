import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import IncidentDetailModal from "./components/IncidentDetailModal";
import { 
  getAllIncidents, 
  IncidentReport, 
  IncidentStatus,
  getIncidentStatusText 
} from "@/lib/api/incidents";
import { Client } from "@/lib/api/clients";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";

export default function IncidentPage() {
  const { user } = useAuth();
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    submitted: 0,
    under_review: 0,
    resolved: 0,
    not_resolved: 0,
  });
  const { toast } = useToast();

  // Fetch incidents on mount and when page changes
  useEffect(() => {
    if (user?.agencyId) {
      fetchIncidents();
    } else {
      setLoading(false);
    }
  }, [currentPage, user?.agencyId]);

  const fetchIncidents = async () => {
    if (!user?.agencyId) return;

    try {
      setLoading(true);
      const response = await getAllIncidents(user.agencyId, {
        page: currentPage,
        limit: 10,
      });

      if (response.success && response.data) {
        setIncidents(response.data.incidents || []);
        setSummary(response.data.summary || {
          total: 0,
          submitted: 0,
          under_review: 0,
          resolved: 0,
          not_resolved: 0,
        });
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      console.error('Error details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message
      });
      
      // Set empty state on error
      setIncidents([]);
      setTotalPages(1);
      
      // Don't show toast - backend endpoint may not be implemented yet
      // Just log the error for debugging
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.SUBMITTED:
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-medium border border-[#6b7280] text-[#6b7280] bg-transparent">
            Submitted
          </span>
        );
      case IncidentStatus.UNDER_REVIEW:
        return (
          <span className="px-3 py-1 rounded-full text-[13px] font-medium border border-[#3b82f6] text-[#3b82f6] bg-transparent">
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
    // This will be handled in the modal
    setSelectedIncident(null);
    await fetchIncidents();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '';
    const names = fullName.split(' ');
    return names.map(n => n[0]).join('').toUpperCase();
  };

  const getClientInitials = (client: Client | undefined) => {
    if (!client) return '';
    const first = client.firstName?.[0] || '';
    const last = client.lastName?.[0] || '';
    return (first + last).toUpperCase();
  };

  const getClientName = (client: Client | undefined) => {
    if (!client) return '';
    return `${client.firstName || ''} ${client.lastName || ''}`.trim();
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
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb]">
          <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a] mb-1">
            Incident Log
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#6b7280]">
            These are your Pending Incident Approvals
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00b8d4] border-r-transparent align-[-0.125em]"></div>
            <p className="mt-4 text-[14px] text-[#6b7280]">Loading incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
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
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <span className="text-[14px] font-semibold text-gray-600">
                            {getClientInitials(incident.client)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] sm:text-[15px] font-semibold text-[#10141a] truncate">
                            {getClientName(incident.client)}
                          </div>
                          <div className="text-[12px] sm:text-[13px] text-[#6b7280]">
                            Client
                          </div>
                        </div>
                      </div>

                      {/* DSP */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <span className="text-[14px] font-semibold text-gray-600">
                            {getInitials(incident.employee?.fullName)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] sm:text-[15px] font-semibold text-[#10141a] truncate">
                            {incident.employee?.fullName}
                          </div>
                          <div className="text-[12px] sm:text-[13px] text-[#6b7280]">
                            DSP
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Time Row */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-shrink-0">
                        {getStatusBadge(incident.status)}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-[12px] sm:text-[13px]">
                        <div>
                          <span className="text-[#6b7280]">Date: </span>
                          <span className="font-medium text-[#10141a]">{formatDate(incident.incidentDate)}</span>
                        </div>
                        <div>
                          <span className="text-[#6b7280]">Time: </span>
                          <span className="font-medium text-[#10141a]">{formatTime(incident.incidentDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Details Button */}
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="w-full px-6 py-2 rounded-full bg-[#B2B2B3] text-white text-[14px] font-medium hover:bg-[#d1d5db] transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:flex lg:items-center lg:gap-6">
                    {/* Client */}
                    <div className="flex items-center gap-3 w-[200px]">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        <span className="text-[14px] font-semibold text-gray-600">
                          {getClientInitials(incident.client)}
                        </span>
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold text-[#10141a]">
                          {getClientName(incident.client)}
                        </div>
                        <div className="text-[13px] text-[#6b7280]">
                          Client
                        </div>
                      </div>
                    </div>

                    {/* DSP */}
                    <div className="flex items-center gap-3 w-[200px]">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        <span className="text-[14px] font-semibold text-gray-600">
                          {getInitials(incident.employee?.fullName)}
                        </span>
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold text-[#10141a]">
                          {incident.employee?.fullName}
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

                    {/* Date */}
                    <div className="w-[100px]">
                      <div className="text-[13px] text-[#6b7280] mb-1">Date</div>
                      <div className="text-[15px] font-medium text-[#10141a]">
                        {formatDate(incident.incidentDate)}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="w-[100px]">
                      <div className="text-[13px] text-[#6b7280] mb-1">Time</div>
                      <div className="text-[15px] font-medium text-[#10141a]">
                        {formatTime(incident.incidentDate)}
                      </div>
                    </div>

                    {/* Details Button */}
                    <div className="ml-auto">
                      <button
                        onClick={() => setSelectedIncident(incident)}
                        className="px-6 py-2 rounded-full bg-[#B2B2B3] text-white text-[14px] font-medium hover:bg-[#d1d5db] transition-colors cursor-pointer"
                      >
                        Details
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
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-[#6b7280]" />
              </button>
              <span className="text-[14px] sm:text-[15px] text-[#6b7280]">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
