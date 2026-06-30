import React, {useState, useEffect} from "react";
import {ArrowLeft, ChevronLeft, ChevronRight, Search} from "lucide-react";
import {useNavigate} from "react-router";
import {Button} from "@/components/ui/button";
import {Routes} from "@/routes/constants";
import {useGetExpiredDocumentsQuery} from "./api";
import {ExpiredDocument} from "./apiTypes";
import {useAuth} from "@/utils/auth";
import {sendDocumentAlert} from "@/lib/api/employee-documents";
import {useToast} from "@/hooks/use-toast";
import {useEffectiveAgencyMode} from "@/hooks/useEffectiveAgencyMode";
import {matchesAgencyMode} from "@/lib/roleLabel";

export default function ComplianceAlertsPage() {
  const navigate = useNavigate();
  const mode = useEffectiveAgencyMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [alertingDocId, setAlertingDocId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const {user} = useAuth();
  const {toast} = useToast();

  // Fetch expired documents
  const {data, isLoading, isError} = useGetExpiredDocumentsQuery(user?.agencyId ?? '', {
    skip: !user?.agencyId
  });
  const expiredDocuments = data?.data || [];

  // Transform to match component structure, filtering by active agency mode
  const complianceAlerts = expiredDocuments
    .filter(doc => matchesAgencyMode(doc.employee.role, mode))
    .map(doc => ({
      id: doc.id,
      name: doc.employee.fullName,
      role: doc.employee.role,
      status: doc.employee.status.charAt(0).toUpperCase() + doc.employee.status.slice(1),
      document: doc.documentType,
      documentStatus: `Expired (${doc.daysExpired} day${doc.daysExpired !== 1 ? 's' : ''} ago)`,
      training: "N/A"
    }));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const filteredAlerts = complianceAlerts.filter((alert) => {
    const matchesSearch =
      alert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.document.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      alert.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAlerts = filteredAlerts.slice(startIndex, endIndex);

  const handleSendAlert = async (doc: ExpiredDocument) => {
    try {
      setAlertingDocId(doc.id);
      await sendDocumentAlert(doc.employeeId, doc.id);
      toast({
        title: "Alert Sent",
        description: `An alert has been sent to ${doc.employee.fullName} about their expired document.`,
      });
    } catch (error) {
      console.error('Failed to send document alert:', error);
      toast({
        title: "Error",
        description: "Failed to send alert. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAlertingDocId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className={"flex items-center justify-between mb-8"}>
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Dashboard
        </h1>
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => navigate(Routes.agency.dashboard)}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            <ArrowLeft className="w-5 h-5"/>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
        {/* Search and Filter Bar */}
        <div className={"flex items-center justify-between"}>
          <div>
            <h1 className="text-lg font-bold leading-[1.4] text-[#10141a]">
              Compliance Alerts
            </h1>
            <p className="text-[14px] font-medium text-[#808081] mt-2">
              Number of Expiring Or Missing Documents
            </p>
          </div>
          <div className="flex items-center justify-between mb-6 space-x-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081]"/>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white w-full pl-10 pr-4 py-2 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#00b4b8] transition-colors"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFilterStatus("active")}
                className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  filterStatus === "active"
                    ? "bg-[#10141a] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#10141a]"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus("inactive")}
                className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  filterStatus === "inactive"
                    ? "bg-[#10141a] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#10141a]"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-[14px] text-[#808081]">Loading compliance alerts...</p>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-[14px] text-red-500">Error loading compliance alerts. Please try again.</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-[14px] text-[#808081]">No compliance alerts found.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
              <tr className="border-b border-[#e5e5e6]">
                <th className="text-left py-4 px-4 text-[12px] font-semibold text-[#808081]">
                  Name
                </th>
                <th className="text-left py-4 px-4 text-[12px] font-semibold text-[#808081]">
                  Status
                </th>
                <th className="text-left py-4 px-4 text-[12px] font-semibold text-[#808081]">
                  Document
                </th>
                <th className="text-left py-4 px-4 text-[12px] font-semibold text-[#808081]">
                  Status
                </th>
                <th className="text-left py-4 px-4 text-[12px] font-semibold text-[#808081]">
                  Training
                </th>
                <th className="text-left py-4 px-4 text-[12px] font-semibold text-[#808081]">
                  Action
                </th>
              </tr>
              </thead>
              <tbody>
              {currentAlerts.map((alert) => {
                const isLoading = alertingDocId === alert.id;
                return (
                <tr
                  key={alert.id}
                  className="border-b border-[#e5e5e6] hover:bg-white/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div>
                      <div className="text-[14px] font-semibold text-[#10141a]">
                        {alert.name}
                      </div>
                      <div className="text-[12px] font-medium text-[#808081]">
                        {alert.role}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#0EAF521A] text-[#0EAF52] border border-[#0EAF52]">
                      {alert.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-[14px] font-medium text-[#10141a]">
                      {alert.document}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-[14px] font-medium text-[#d53411]">
                      {alert.documentStatus}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-[14px] font-medium text-[#10141a]">
                      {alert.training}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => {
                        const doc = expiredDocuments.find(d => d.id === alert.id);
                        if (doc) handleSendAlert(doc);
                      }}
                      disabled={isLoading}
                      className="px-4 py-2 text-[13px] rounded-full bg-red-500 border border-red-500 font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLoading ? 'Sending...' : 'Send Alert'}
                    </button>
                  </td>
                </tr>
              )})}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filteredAlerts.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="text-[14px] font-medium text-[#10141a]">
              {currentPage}/
              <span className="text-[#808081]">{totalPages}</span>
            </span>
            <div
              className={`rounded-full p-2 cursor-pointer ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() => currentPage > 1 && setCurrentPage((prev) => prev - 1)}
            >
              <ChevronLeft
                size={16}
                className={currentPage === 1 ? "text-gray-400" : "text-[#10141a]"}
              />
            </div>
            <div
              className={`rounded-full p-2 cursor-pointer ${
                currentPage >= totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() =>
                currentPage < totalPages && setCurrentPage((prev) => prev + 1)
              }
            >
              <ChevronRight
                size={16}
                className={
                  currentPage >= totalPages ? "text-gray-400" : "text-[#10141a]"
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
