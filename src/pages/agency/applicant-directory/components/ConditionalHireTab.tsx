import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Eye, CheckCircle, ExternalLink } from "lucide-react";
import type { OfficialHireStatusResponse } from "@/lib/api/officialHire";
import type { ComplianceData } from "@/lib/api/applicants";
import DigitalSignatureModal from "@/pages/applicant/application/components/DigitalSignature";

interface SignatureData {
  signatureType: string;
  signatureData: string;
}

interface ConditionalHireTabProps {
  isLoading: boolean;
  hireStatus: OfficialHireStatusResponse["status"] | null;
  complianceData?: ComplianceData;
  toggledAuthorizations: Set<string>;
  onToggleAuthorization: (authKey: string, checked: boolean) => void;
  onSendAuthorizationAlert: (authKey: string) => void;
  actionLoading: string | null;
  signatureData?: SignatureData | null;
}

// Authorization mapping from API keys to display labels
const authorizationLabels: Record<string, string> = {
  drugTest: "Drug Test Appointment",
  fingerprint: "Fingerprint Appointment",
  centralRegistry: "Central Registry Check",
  cariCheck: "CARI Check (Child Abuse Record)",
  sexOffenderRegistry: "Sex Offender Registry Check",
  oigExclusion: "OIG Exclusion List Check",
  healthTbScreening: "Health & TB Screening",
  referenceChecks: "Reference Checks",
};

export function ConditionalHireTab({
  isLoading,
  hireStatus,
  complianceData,
  toggledAuthorizations,
  onToggleAuthorization,
  onSendAuthorizationAlert,
  actionLoading,
  signatureData,
}: ConditionalHireTabProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  return (
    <>
      <DigitalSignatureModal
        isOpen={showSignatureModal}
        setIsOpen={setShowSignatureModal}
        mode="view"
        existingSignature={signatureData}
      />
      <div className="space-y-4">
        {/* Conditional Hire Section */}
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
                onClick={() => setShowSignatureModal(true)}
                disabled={!signatureData}
              >
                <Eye className="h-4 w-4" />
                View Signature
              </Button>
            </div>
          ) : (
            <div className="rounded-[20px] bg-[rgba(255,255,255,0.8)] px-4 py-4">
              <p className="mb-3 text-[14px] text-[#808081]">
                Conditional hire letter not yet signed.
              </p>
            </div>
          )}
        </div>

        {/* Compliance Section */}
        {complianceData?.authorizations && (
          <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] px-4 py-4 md:px-6 md:py-5 space-y-4">
            <h3 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
              Compliance
            </h3>
            <div className="space-y-3">
              {Object.entries(complianceData.authorizations).map(([authKey, isEnabled]) => (
                <div
                  key={authKey}
                  className="flex flex-col gap-3 rounded-[16px] bg-[rgba(255,255,255,0.85)] px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <span className="flex-1 text-[14px] font-medium text-[#10141a]">
                    {authorizationLabels[authKey] || authKey}
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <Badge
                      className={
                        isEnabled
                          ? "rounded-[999px] bg-[rgba(14,175,82,0.1)] px-4 py-[4px] text-[12px] font-semibold text-[#0eaf52] border-0"
                          : "rounded-[999px] bg-[rgba(213,52,17,0.08)] px-4 py-[4px] text-[12px] font-semibold text-[#d53411] border-0"
                      }
                    >
                      {isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-medium text-[#808081]">
                        {isEnabled ? "Approved" : "Pending"}
                      </span>
                      <Switch
                        checked={Boolean(isEnabled)}
                        disabled={actionLoading === authKey || toggledAuthorizations.has(authKey)}
                        onCheckedChange={(checked) =>
                          onToggleAuthorization(authKey, checked)
                        }
                      />
                    </div>
                    {!isEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 rounded-[60px] border-[#d53411] px-4 py-[6px] text-[12px] font-semibold text-[#d53411] hover:bg-[rgba(213,52,17,0.06)]"
                        disabled={actionLoading === `alert-${authKey}`}
                        onClick={() => onSendAuthorizationAlert(authKey)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {actionLoading === `alert-${authKey}` ? "Sending..." : "Send Alert"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

