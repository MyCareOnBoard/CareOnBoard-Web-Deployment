import { Button } from "@/components/ui/button";
import { Eye, CheckCircle } from "lucide-react";
import type { OfficialHireStatusResponse } from "@/lib/api/officialHire";

interface ConditionalHireTabProps {
  isLoading: boolean;
  hireStatus: OfficialHireStatusResponse["status"] | null;
  actionLoading: string | null;
  onRequestSignature: () => void;
}

export function ConditionalHireTab({
  isLoading,
  hireStatus,
  actionLoading,
  onRequestSignature,
}: ConditionalHireTabProps) {
  return (
    <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] px-4 py-4 md:px-6 md:py-5 space-y-4">
      <h3 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
        Conditional Hire
      </h3>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-[#808081]">
          Loading status...
        </div>
      ) : hireStatus?.letterSigning?.hasSigned ? (
        <div className="flex items-center justify-between gap-4 rounded-[8px] bg-[rgba(14,175,82,0.1)] px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-full bg-[#0eaf52]">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#10141a]">
                Conditional Hire Letter Signed
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[#808081]">
                {hireStatus.letterSigning.signedAt
                  ? `Signed on ${new Date(
                      hireStatus.letterSigning.signedAt
                    ).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : "Signature received"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 rounded-[60px] border-[#525253] bg-[rgba(128,128,129,0.1)] px-4 py-[6px] text-[11px] font-semibold text-[#525253] hover:bg-[rgba(128,128,129,0.15)]"
          >
            <Eye className="h-4 w-4" />
            View Signed Letter
          </Button>
        </div>
      ) : (
        <div className="rounded-[20px] bg-[rgba(255,255,255,0.8)] px-4 py-4">
          <p className="mb-3 text-[14px] text-[#808081]">
            Conditional hire letter not yet signed.
          </p>
          <Button
            onClick={onRequestSignature}
            disabled={actionLoading === "signature"}
            className="rounded-[60px] bg-[#00b4b8] px-6 py-[10px] text-[14px] font-semibold text-white hover:bg-[#0090a8]"
          >
            {actionLoading === "signature" ? "Requesting..." : "Request Signature"}
          </Button>
        </div>
      )}
    </div>
  );
}

