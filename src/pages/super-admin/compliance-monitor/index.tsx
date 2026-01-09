import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TabType = "documents" | "notes" | "evv" | "others";

interface ComplianceItem {
  id: string;
  name: string;
  image: string;
  documentType?: string;
  noteType?: string;
  timeAgo: string;
  details: string;
  agency: string;
}

export default function ComplianceMonitor() {
  const [activeTab, setActiveTab] = useState<TabType>("documents");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Mock data for documents
  const documentsData: ComplianceItem[] = [
    {
      id: "1",
      name: "IOTA Digital",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
      documentType: "I-9 Form",
      timeAgo: "3 days ago",
      details: "Details here",
      agency: "Iota Digital",
    },
    {
      id: "2",
      name: "IOTA Digital",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
      documentType: "I-9 Form",
      timeAgo: "3 days ago",
      details: "Details here",
      agency: "Iota Digital",
    },
    {
      id: "3",
      name: "IOTA Digital",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
      documentType: "I-9 Form",
      timeAgo: "3 days ago",
      details: "Details here",
      agency: "Iota Digital",
    },
    {
      id: "4",
      name: "IOTA Digital",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
      documentType: "I-9 Form",
      timeAgo: "3 days ago",
      details: "Details here",
      agency: "Iota Digital",
    },
    {
      id: "5",
      name: "IOTA Digital",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=5",
      documentType: "I-9 Form",
      timeAgo: "3 days ago",
      details: "Details here",
      agency: "Iota Digital",
    },
    {
      id: "6",
      name: "IOTA Digital",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=6",
      documentType: "I-9 Form",
      timeAgo: "3 days ago",
      details: "Details here",
      agency: "Iota Digital",
    },
  ];

  // Mock data for notes
  const notesData: ComplianceItem[] = [
    {
      id: "1",
      name: "Nola Hawkins",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=nola1",
      noteType: "I-9 Form",
      timeAgo: "",
      details: "Required Fields",
      agency: "Iota Digital",
    },
    {
      id: "2",
      name: "Nola Hawkins",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=nola2",
      noteType: "I-9 Form",
      timeAgo: "",
      details: "Required Fields",
      agency: "Iota Digital",
    },
    {
      id: "3",
      name: "Nola Hawkins",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=nola3",
      noteType: "I-9 Form",
      timeAgo: "",
      details: "Required Fields",
      agency: "Iota Digital",
    },
    {
      id: "4",
      name: "Nola Hawkins",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=nola4",
      noteType: "I-9 Form",
      timeAgo: "",
      details: "Required Fields",
      agency: "Iota Digital",
    },
    {
      id: "5",
      name: "Nola Hawkins",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=nola5",
      noteType: "I-9 Form",
      timeAgo: "",
      details: "Required Fields",
      agency: "Iota Digital",
    },
    {
      id: "6",
      name: "Nola Hawkins",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=nola6",
      noteType: "I-9 Form",
      timeAgo: "",
      details: "Required Fields",
      agency: "Iota Digital",
    },
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case "documents":
        return documentsData;
      case "notes":
        return notesData;
      case "evv":
        return [];
      case "others":
        return [];
      default:
        return [];
    }
  };

  const currentData = getCurrentData();
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = currentData.slice(startIndex, startIndex + itemsPerPage);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const getAlertTitle = () => {
    switch (activeTab) {
      case "documents":
        return "Documents Alert";
      case "notes":
        return "Notes";
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
      default:
        return "";
    }
  };

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
          {paginatedData.length > 0 ? (
            paginatedData.map((item) => (
              <div
                key={item.id}
                className="backdrop-blur-[20px] bg-white/50 rounded-[20px] flex items-center gap-4 p-4"
              >
                {/* Avatar */}
                <div className="w-[52.5px] h-[60px] rounded-[8px] overflow-hidden flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 flex items-center gap-16">
                  {/* Name */}
                  <div className="min-w-[150px]">
                    <p className="text-[16px] font-semibold leading-[1.6] text-black">
                      {item.name}
                    </p>
                  </div>

                  {/* Document/Note Type */}
                  <div className="min-w-[100px]">
                    <p className="text-[14px] font-medium text-[#808081] mb-0">
                      {activeTab === "documents" ? "Document" : "Note"}
                    </p>
                    <p className="text-[14px] font-medium text-[#10141a]">
                      {item.documentType || item.noteType}
                    </p>
                  </div>

                  {/* Time/Details */}
                  {activeTab === "documents" && item.timeAgo && (
                    <div className="bg-[rgba(175,33,14,0.05)] border border-[#d53411] rounded-[60px] px-4 py-2">
                      <p className="text-[12px] font-semibold text-[#d53411]">
                        {item.timeAgo}
                      </p>
                    </div>
                  )}

                  {/* Details */}
                  {activeTab === "documents" && (
                    <div className="min-w-[129px]">
                      <p className="text-[14px] font-medium text-[#808081] mb-0">
                        Details
                      </p>
                      <p className="text-[14px] font-medium text-black">
                        {item.details}
                      </p>
                    </div>
                  )}

                  {activeTab === "notes" && (
                    <div className="min-w-[129px]">
                      <p className="text-[14px] font-medium text-[#808081] mb-0">
                        Details
                      </p>
                      <p className="text-[14px] font-medium text-black">
                        {item.details}
                      </p>
                    </div>
                  )}

                  {/* Agency */}
                  <div className="min-w-[129px]">
                    <p className="text-[14px] font-medium text-[#808081] mb-0">
                      Agency
                    </p>
                    <p className="text-[14px] font-medium text-black">
                      {item.agency}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {activeTab === "documents" && (
                    <Button className="bg-[rgba(178,178,179,0.1)] border border-[#b2b2b3] text-[#565656] hover:bg-[rgba(178,178,179,0.2)] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px]">
                      See Doc
                    </Button>
                  )}
                  <Button className="bg-[rgba(178,178,179,0.1)] border border-[#b2b2b3] text-[#565656] hover:bg-[rgba(178,178,179,0.2)] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px]">
                    Send Alert
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-[16px] text-[#808081]">No data available</p>
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
              <ChevronLeft className="w-5 h-5 text-[#10141a]" />
            </Button>
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="bg-white/50 backdrop-blur border border-white/30 p-[6px] rounded-full hover:bg-white/70 disabled:opacity-50 h-auto"
            >
              <ChevronRight className="w-5 h-5 text-[#10141a]" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
