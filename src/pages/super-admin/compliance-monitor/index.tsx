import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {ChevronLeft, ChevronRight, Loader2} from "lucide-react";
import {
  useGetComplianceDocumentsQuery,
  useGetComplianceNotesQuery,
  useGetComplianceEvvQuery,
  useGetComplianceOthersQuery,
  useSendComplianceAlertMutation,
  ComplianceIssue,
} from "./complianceApi";
import {toast} from "sonner";

type TabType = "documents" | "notes" | "evv" | "others";

export default function ComplianceMonitor() {
  const [activeTab, setActiveTab] = useState<TabType>("documents");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // API queries based on active tab
  const {
    data: documentsData,
    isLoading: documentsLoading,
    error: documentsError,
  } = useGetComplianceDocumentsQuery(
    {page: currentPage, limit: itemsPerPage, search: searchTerm},
    {skip: activeTab !== "documents"}
  );

  const {
    data: notesData,
    isLoading: notesLoading,
    error: notesError,
  } = useGetComplianceNotesQuery(
    {page: currentPage, limit: itemsPerPage, search: searchTerm},
    {skip: activeTab !== "notes"}
  );

  const {
    data: evvData,
    isLoading: evvLoading,
    error: evvError,
  } = useGetComplianceEvvQuery(
    {page: currentPage, limit: itemsPerPage, search: searchTerm},
    {skip: activeTab !== "evv"}
  );

  const {
    data: othersData,
    isLoading: othersLoading,
    error: othersError,
  } = useGetComplianceOthersQuery(
    {page: currentPage, limit: itemsPerPage, search: searchTerm},
    {skip: activeTab !== "others"}
  );

  const [sendAlert, {isLoading: sendingAlert}] = useSendComplianceAlertMutation();

  const getCurrentData = () => {
    switch (activeTab) {
      case "documents":
        return documentsData;
      case "notes":
        return notesData;
      case "evv":
        return evvData;
      case "others":
        return othersData;
      default:
        return null;
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case "documents":
        return documentsLoading;
      case "notes":
        return notesLoading;
      case "evv":
        return evvLoading;
      case "others":
        return othersLoading;
      default:
        return false;
    }
  };

  const currentResponse = getCurrentData();
  const isLoading = getCurrentLoading();
  const currentData = currentResponse?.data || [];
  const pagination = currentResponse?.pagination;
  const totalPages = pagination?.totalPages || 1;

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSendAlert = async (issue: ComplianceIssue) => {
    try {
      await sendAlert({
        userId: issue.userId,
        category: activeTab,
        issueType: issue.issueType,
        documentType: issue.documentType,
        details: issue.details,
      }).unwrap();

      toast.success("Compliance alert sent successfully");
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to send alert");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {day: "numeric", month: "long"});
  };

  const getAlertTitle = () => {
    switch (activeTab) {
      case "documents":
        return "Documents Alert";
      case "notes":
        return "Notes";
      case "evv":
        return "EVV";
      case "others":
        return "Others";
      default:
        return "Alert";
    }
  };

  const getAlertSubtitle = () => {
    switch (activeTab) {
      case "documents":
        return "Number Of Expiring Or Missing Documents";
      case "notes":
        return "Issues With Notes";
      case "evv":
        return "Issues With EVV";
      case "others":
        return "Other issues happening across system";
      default:
        return "";
    }
  };

  const handleSeeDoc = (item: ComplianceIssue) => {
    window.open(item?.fileUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Compliance Monitor
        </h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <Button
          onClick={() => handleTabChange("documents")}
          className={`rounded-[60px] px-6 py-2 text-[14px] font-semibold transition-all ${
            activeTab === "documents"
              ? "bg-[#00b4b8] text-white hover:bg-[#009da1]"
              : "bg-white/50 backdrop-blur text-[#808081] hover:bg-white/70 border border-white/30"
          }`}
        >
          Documents
        </Button>
        <Button
          onClick={() => handleTabChange("notes")}
          className={`rounded-[60px] px-6 py-2 text-[14px] font-semibold transition-all ${
            activeTab === "notes"
              ? "bg-[#00b4b8] text-white hover:bg-[#009da1]"
              : "bg-white/50 backdrop-blur text-[#808081] hover:bg-white/70 border border-white/30"
          }`}
        >
          Notes
        </Button>
        <Button
          onClick={() => handleTabChange("evv")}
          className={`rounded-[60px] px-6 py-2 text-[14px] font-semibold transition-all ${
            activeTab === "evv"
              ? "bg-[#00b4b8] text-white hover:bg-[#009da1]"
              : "bg-white/50 backdrop-blur text-[#808081] hover:bg-white/70 border border-white/30"
          }`}
        >
          EVV
        </Button>
        <Button
          onClick={() => handleTabChange("others")}
          className={`rounded-[60px] px-6 py-2 text-[14px] font-semibold transition-all ${
            activeTab === "others"
              ? "bg-[#00b4b8] text-white hover:bg-[#009da1]"
              : "bg-white/50 backdrop-blur text-[#808081] hover:bg-white/70 border border-white/30"
          }`}
        >
          Others
        </Button>
      </div>

      {/* Content Area */}
      <div className="backdrop-blur-[20px] bg-white/30 border border-white/30 rounded-[30px] p-6 min-h-[600px]">
        {/* Alert Header */}
        <div className="mb-6">
          <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
            {getAlertTitle()}
          </h2>
          <p className="text-[14px] font-medium text-[#808081]">
            {getAlertSubtitle()}
          </p>
        </div>

        {/* List Items */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#00b4b8]"/>
            </div>
          ) : currentData.length > 0 ? (
            currentData.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 backdrop-blur-[20px] bg-white/50 rounded-[20px] flex items-center p-4"
              >
                {/* Avatar */}
                <div className={"flex gap-4 items-center"}>
                  <div className="w-[52.5px] h-[60px] rounded-[8px] overflow-hidden flex-shrink-0">
                    <div
                      className="w-full h-full flex items-center justify-center bg-[#00b4b8] text-white rounded-[8px]">
                      {item.userName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  {/* Name */}
                  <div>
                    <p className="text-[16px] font-semibold leading-[1.6] text-black">
                      {item.userName}
                    </p>
                    <p className="text-[12px] text-[#808081]">
                      {item.userEmail}
                    </p>
                  </div>
                </div>


                {/* Document/Note Type */}
                {activeTab === "documents" && item.documentType && (
                  <div>
                    <p className="text-[14px] font-medium text-[#808081] mb-0">
                      Document
                    </p>
                    <p className="text-[14px] font-medium text-[#10141a] capitalize">
                      {item.documentType}
                    </p>
                  </div>
                )}

                {activeTab === "notes" && item.noteType && (
                  <div>
                    <p className="text-[14px] font-medium text-[#808081] mb-0">
                      Note Type
                    </p>
                    <p className="text-[14px] font-medium text-[#10141a]">
                      {item.noteType}
                    </p>
                  </div>
                )}

                {/* Time/Details */}
                {activeTab === "documents" && item.expiryStatus && (
                  <div className="bg-[rgba(175,33,14,0.05)] border border-[#d53411] rounded-[60px] px-4 py-2">
                    <p className="text-[12px] font-semibold text-[#d53411]">
                      {item.expiryStatus}
                    </p>
                  </div>
                )}

                {(activeTab === "notes") && (
                  <div>
                    <p className="text-[14px] font-medium text-[#808081] mb-0">
                      Date
                    </p>
                    <p className="text-[14px] font-medium text-black">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                )}

                {(activeTab === "notes" || activeTab === "others" || activeTab === "evv") && (
                  <div>
                    <p className="text-[14px] font-medium text-[#808081] mb-0">
                      Details
                    </p>
                    <p className="text-[14px] font-medium text-black">
                      {item.details}
                    </p>
                  </div>
                )}

                {/* Agency */}
                {activeTab !== "others" && <div>
                    <p className="text-[14px] font-medium text-[#808081] mb-0">
                        Agency
                    </p>
                    <p className="text-[14px] font-medium text-black">
                      {item.agencyName}
                    </p>
                </div>}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {activeTab === "documents" && <Button
                    onClick={() => handleSeeDoc(item)}
                    disabled={sendingAlert || item.status === "alerted"}
                    className="bg-[rgba(178,178,179,0.1)] border border-[#b2b2b3] text-[#565656] hover:bg-[rgba(178,178,179,0.2)] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px] disabled:opacity-50"
                  >
                    See Doc
                  </Button>}
                  <Button
                    onClick={() => handleSendAlert(item)}
                    disabled={sendingAlert || item.status === "alerted"}
                    className="bg-red-500 border border-red-500 text-white hover:bg-red-600 rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px] disabled:opacity-50">
                    {sendingAlert ? (
                      <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : (
                      "Send Alert"
                    )}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-[16px] text-[#808081]">No compliance issues found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <p className="text-[16px] font-medium text-[#10141a]">
              {currentPage}
              <span className="text-[14px] text-[#808081]">/{totalPages}</span>
            </p>
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="bg-white/50 backdrop-blur border border-white/30 p-[6px] rounded-full hover:bg-white/70 disabled:opacity-50 h-auto"
            >
              <ChevronLeft className="w-5 h-5 text-[#10141a]"/>
            </Button>
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="bg-white/50 backdrop-blur border border-white/30 p-[6px] rounded-full hover:bg-white/70 disabled:opacity-50 h-auto"
            >
              <ChevronRight className="w-5 h-5 text-[#10141a]"/>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
