import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExternalLink } from "lucide-react";

export type AuthorizationConfig = {
  name: string;
  status: "Enabled" | "Disabled";
  bookingLink: boolean;
};

interface FinalReviewTabProps {
  authorizations: AuthorizationConfig[];
  authApprovals: Record<number, boolean>;
  onToggleAuthorization: (index: number, checked: boolean, authName: string) => void;
  onSendAlert: (authName: string) => void;
  onSendLetter: () => void;
  actionLoading: string | null;
}

export function FinalReviewTab({
  authorizations,
  authApprovals,
  onToggleAuthorization,
  onSendAlert,
  onSendLetter,
  actionLoading,
}: FinalReviewTabProps) {
  return (
    <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] px-4 py-4 md:px-6 md:py-5 space-y-4">
      <h3 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
        Final Agency Review
      </h3>
      <div className="space-y-3">
        {authorizations.map((auth, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-[16px] bg-[rgba(255,255,255,0.85)] px-4 py-3"
          >
            <span className="flex-1 text-[14px] font-medium text-[#10141a]">
              {auth.name}
            </span>
            <div className="flex items-center gap-4">
              <Badge
                className={
                  auth.status === "Enabled"
                    ? "rounded-[999px] bg-[rgba(14,175,82,0.1)] px-4 py-[4px] text-[12px] font-semibold text-[#0eaf52] border-0"
                    : "rounded-[999px] bg-[rgba(213,52,17,0.08)] px-4 py-[4px] text-[12px] font-semibold text-[#d53411] border-0"
                }
              >
                {auth.status}
              </Badge>
              {auth.status === "Disabled" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 rounded-[60px] border-[#d53411] px-4 py-[6px] text-[12px] font-semibold text-[#d53411] hover:bg-[rgba(213,52,17,0.06)]"
                  onClick={() => onSendAlert(auth.name)}
                >
                  <ExternalLink className="h-3 w-3" />
                  Send Alert
                </Button>
              ) : (
                <>
                  <span className="text-[12px] text-[#808081]">Approve</span>
                  <Switch
                    checked={authApprovals[index] ?? auth.status === "Enabled"}
                    onCheckedChange={(checked) =>
                      onToggleAuthorization(index, checked, auth.name)
                    }
                    disabled={false}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Send Letter Section */}
      <div className="pt-2">
        <p className="mb-3 text-[14px] text-[#808081]">
          Everything looks good! Send Official Hire letter!
        </p>
        <Button
          onClick={onSendLetter}
          disabled={actionLoading === "offer-letter"}
          className="rounded-[60px] bg-[#00b4b8] px-6 py-[10px] text-[14px] font-semibold text-white hover:bg-[#0090a8]"
        >
          {actionLoading === "offer-letter" ? "Sending..." : "Send Letter"}
        </Button>
      </div>
    </div>
  );
}

