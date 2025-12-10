import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Check } from "lucide-react";

export interface ApplicantCardProps {
  applicant: {
    id: string;
    name: string;
    address: string;
    dob: string;
    stages: {
      profilePreScreening: boolean;
      documents: boolean;
      conditionalHire: boolean;
      finalAgencyReview: boolean;
    };
  };
  selectedTab: "profile" | "documents" | "conditional" | "final";
  onTabChange: (tab: "profile" | "documents" | "conditional" | "final") => void;
}

export function ApplicantCard({ applicant, selectedTab, onTabChange }: ApplicantCardProps) {
  return (
    <div className="bg-white rounded-[20px] border border-[#e5e5e6] p-6 mb-6">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden flex-shrink-0">
          <img
            src={`https://i.pravatar.cc/120?img=${applicant.id}`}
            alt={applicant.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-[#d1fae5] text-[#10b981] text-xs font-medium rounded-full mb-2">
              Applicant
            </span>
            <h2 className="text-[24px] font-bold text-[#10141a] mb-1">
              {applicant.name}
            </h2>
            <p className="text-sm text-[#808081]">
              {applicant.address} • {applicant.dob}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              disabled
              className="flex items-center gap-2 bg-[#2563eb] text-white rounded-full px-6 h-10 font-medium shadow-none opacity-50 cursor-not-allowed"
            >
              <Phone className="w-4 h-4" />
              Call
            </Button>
            <Button className="flex items-center gap-2 bg-white hover:bg-[#f8f9fa] text-[#10141a] border border-[#e5e5e6] rounded-full px-6 h-10 font-medium shadow-none">
              <MessageSquare className="w-4 h-4" />
              Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Stage Pills */}
      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[#e5e5e6] flex-wrap">
        <button
          onClick={() => onTabChange("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            selectedTab === "profile"
              ? "bg-[#0ea5e9] text-white"
              : applicant.stages.profilePreScreening
              ? "bg-transparent text-[#808081] border border-[#e5e5e6] hover:bg-[#f8f9fa]"
              : "bg-transparent text-[#d1d5db] border border-[#e5e5e6]"
          }`}
        >
          {applicant.stages.profilePreScreening && selectedTab !== "profile" && (
            <div className="w-[18px] h-[18px] rounded-full bg-[#10b981] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
          Profile & Pre-Screening
        </button>

        <button
          onClick={() => onTabChange("documents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            selectedTab === "documents"
              ? "bg-[#0ea5e9] text-white"
              : applicant.stages.documents
              ? "bg-transparent text-[#808081] border border-[#e5e5e6] hover:bg-[#f8f9fa]"
              : "bg-transparent text-[#d1d5db] border border-[#e5e5e6]"
          }`}
        >
          {applicant.stages.documents && selectedTab !== "documents" && (
            <div className="w-[18px] h-[18px] rounded-full bg-[#10b981] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
          Document Upload & Eligibility Verification
        </button>

        <button
          onClick={() => onTabChange("conditional")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            selectedTab === "conditional"
              ? "bg-[#0ea5e9] text-white"
              : applicant.stages.conditionalHire
              ? "bg-transparent text-[#808081] border border-[#e5e5e6] hover:bg-[#f8f9fa]"
              : "bg-transparent text-[#d1d5db] border border-[#e5e5e6]"
          }`}
        >
          {applicant.stages.conditionalHire && selectedTab !== "conditional" && (
            <div className="w-[18px] h-[18px] rounded-full bg-[#10b981] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
          Conditional Hire & Compliance
        </button>

        <button
          onClick={() => onTabChange("final")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            selectedTab === "final"
              ? "bg-[#0ea5e9] text-white"
              : applicant.stages.finalAgencyReview
              ? "bg-transparent text-[#808081] border border-[#e5e5e6] hover:bg-[#f8f9fa]"
              : "bg-transparent text-[#808081] border border-[#ef4444] hover:bg-[#fef2f2]"
          }`}
        >
          {applicant.stages.finalAgencyReview && selectedTab !== "final" && (
            <div className="w-[18px] h-[18px] rounded-full bg-[#10b981] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
          Final Agency Review
        </button>
      </div>
    </div>
  );
}
