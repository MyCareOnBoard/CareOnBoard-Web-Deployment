import { Button } from "@/components/ui/button";
import { FileText, Check, Eye, Send, ExternalLink } from "lucide-react";

export interface Applicant {
  id: string;
  name: string;
  details?: {
    gender: string;
    email: string;
    questions: {
      question: string;
      answer: string;
    }[];
    resume?: string;
  };
  documents?: {
    id: string;
    name: string;
    uploaded: boolean;
  }[];
  references?: {
    name: string;
    role: string;
    mobile: string;
    email: string;
  }[];
  conditionalHire?: {
    signed: boolean;
    signedDate?: string;
  };
  authorizations?: {
    id: string;
    name: string;
    status: "enabled" | "disabled";
    canBook: boolean;
  }[];
}

interface TabContentProps {
  selectedTab: "profile" | "documents" | "conditional" | "final";
  applicant: Applicant;
  onSendLetter: () => void;
}

export function TabContent({ selectedTab, applicant, onSendLetter }: TabContentProps) {
  return (
    <div className="bg-white rounded-[20px] border border-[#e5e5e6] p-8">
      {selectedTab === "profile" && applicant.details && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div>
              <label className="text-sm text-[#808081] mb-2 block">Gender</label>
              <p className="text-base font-medium text-[#10141a]">
                {applicant.details.gender}
              </p>
            </div>
            <div>
              <label className="text-sm text-[#808081] mb-2 block text-right">Email</label>
              <p className="text-base font-medium text-[#10141a] text-right">
                {applicant.details.email}
              </p>
            </div>
          </div>

          {applicant.details.questions.map((q, index) => (
            <div key={index}>
              <label className="text-sm text-[#808081] mb-2 block">{q.question}</label>
              <p className="text-base font-semibold text-[#10141a]">{q.answer}</p>
            </div>
          ))}

          {applicant.details.resume && (
            <div className="flex items-center justify-between p-4 bg-white rounded-[12px] border border-[#e5e5e6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f8f9fa] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#808081]" />
                </div>
                <span className="text-sm font-medium text-[#10141a]">Resume</span>
              </div>
              <Button className="bg-[#d1fae5] hover:bg-[#a7f3d0] text-[#10b981] rounded-full px-6 h-9 text-sm font-medium shadow-none">
                View Resume
              </Button>
            </div>
          )}
        </div>
      )}

      {selectedTab === "documents" && applicant.documents && (
        <div className="space-y-3">
          {applicant.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-white rounded-[12px] border border-[#e5e5e6]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f8f9fa] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#808081]" />
                </div>
                <span className="text-sm font-medium text-[#10141a]">{doc.name}</span>
              </div>
              <Button className="bg-[#d1fae5] hover:bg-[#a7f3d0] text-[#10b981] rounded-full px-6 h-9 text-sm font-medium shadow-none">
                View Document
              </Button>
            </div>
          ))}

          {/* References Section */}
          <div className="mt-8 pt-6 border-t border-[#e5e5e6]">
            <h3 className="text-lg font-semibold text-[#10141a] mb-4">References</h3>
            <div className="grid grid-cols-2 gap-4">
              {applicant.references?.map((ref, index) => (
                <div key={index} className="p-4 bg-[#f8f9fa] rounded-[12px]">
                  <h4 className="text-sm font-semibold text-[#10141a] mb-1">{ref.name}</h4>
                  <p className="text-xs text-[#808081] mb-3">{ref.role}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#808081] block mb-1">Mobile</span>
                      <p className="text-sm text-[#10141a] font-medium">{ref.mobile}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#808081] block mb-1">Email</span>
                      <p className="text-sm text-[#10141a] font-medium">{ref.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === "conditional" && applicant.conditionalHire && (
        <div>
          {applicant.conditionalHire.signed ? (
            <div className="flex items-center justify-between p-5 bg-[#d1fae5] rounded-[12px]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#10b981]">
                    Conditional Hire Letter Signed
                  </h4>
                  <p className="text-xs text-[#059669] mt-0.5">
                    Signed on {applicant.conditionalHire.signedDate}
                  </p>
                </div>
              </div>
              <Button className="bg-white hover:bg-[#f0fdf4] text-[#10b981] border border-[#10b981] rounded-full px-6 h-9 text-sm font-medium shadow-none">
                <Eye className="w-4 h-4 mr-2" />
                View Signed Letter
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-[#808081]">
              <p>Conditional hire letter not yet signed</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === "final" && applicant.authorizations && (
        <div className="space-y-3">
          {applicant.authorizations.map((auth) => (
            <div
              key={auth.id}
              className="flex items-center justify-between p-4 border border-[#e5e5e6] rounded-[12px]"
            >
              <span className="text-sm text-[#10141a] flex-1 pr-4">{auth.name}</span>
              <div className="flex items-center gap-3">
                {auth.status === "enabled" ? (
                  <span className="px-4 py-1.5 bg-[#d1fae5] text-[#10b981] text-xs font-medium rounded-full">
                    Enabled
                  </span>
                ) : (
                  <span className="px-4 py-1.5 bg-[#fee2e2] text-[#ef4444] text-xs font-medium rounded-full">
                    Disabled
                  </span>
                )}
                {auth.canBook && auth.status === "enabled" && (
                  <Button className="bg-white hover:bg-[#f8f9fa] text-[#10141a] border border-[#e5e5e6] rounded-full px-4 h-8 text-xs font-medium shadow-none">
                    Go to appointment booking
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                )}
                {!auth.canBook && auth.status === "disabled" && (
                  <Button className="bg-white hover:bg-[#f8f9fa] text-[#10141a] border border-[#e5e5e6] rounded-full px-4 h-8 text-xs font-medium shadow-none">
                    Send Alert
                    <Send className="w-3 h-3 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="mt-8 pt-6 border-t border-[#e5e5e6]">
            <p className="text-sm text-[#808081] mb-4">
              Everything looks good! Send Official Hire letter!
            </p>
            <Button
              onClick={onSendLetter}
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-full px-8 h-11 font-medium shadow-none"
            >
              Send Letter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
