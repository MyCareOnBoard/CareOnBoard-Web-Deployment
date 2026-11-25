import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle, ExternalLink } from "lucide-react";
import type { OfficialHireStatusResponse } from "@/lib/api/officialHire";
import type { ComplianceData } from "@/lib/api/applicants";
import DigitalSignatureModal from "@/pages/applicant/application/components/DigitalSignature";

interface SignatureData {
  signatureType: string;
  signatureData: string;
  createdAt?: { _seconds: number; _nanoseconds: number };
}

interface ConditionalHireTabProps {
  isLoading: boolean;
  hireStatus: OfficialHireStatusResponse["status"] | null;
  complianceData?: ComplianceData;
  onSendAuthorizationAlert: (authKey: string) => void;
  actionLoading: string | null;
  signatureData?: SignatureData | null;
}

// Authorization mapping from API keys to display labels
const authorizationLabels = {
  drugTest: "Drug Test Appointment",
  fingerprint: "Fingerprint Appointment",
  centralRegistry: "Central Registry Check",
  cariCheck: "CARI Check (Child Abuse Record)",
  sexOffenderRegistry: "Sex Offender Registry Check",
  oigExclusion: "OIG Exclusion List Check",
  healthTbScreening: "Health & TB Screening",
  referenceChecks: "Reference Checks",
} as const;

type AuthorizationKey = keyof typeof authorizationLabels;

// All authorization keys (canonical order) - show all even if applicant has not approved
const ALL_AUTHORIZATION_KEYS = Object.keys(
  authorizationLabels,
) as AuthorizationKey[];

export function ConditionalHireTab({
  isLoading,
  hireStatus,
  complianceData,
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
        <div className="rounded-[16px] border border-[#e4e7ea] bg-white p-4 md:p-5 dark:border-white/10 dark:bg-[#1b232b] space-y-4">
          <h3 className="text-[18px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
            Conditional Hire
          </h3>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-[#4b535b] dark:text-[#9aa4a8]">
              Loading status...
            </div>
          ) : (hireStatus?.letterSigning?.hasSigned || signatureData) ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] bg-[#e6f6ec] px-4 py-3 dark:bg-[#30a46c]/10">
              <div className="flex items-start gap-3">
                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-full bg-[#30a46c]">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">
                    Conditional Hire Letter Signed
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
                    {(() => {
                      const signedAt = hireStatus?.letterSigning?.signedAt
                        ? new Date(hireStatus.letterSigning.signedAt)
                        : signatureData?.createdAt?._seconds
                          ? new Date(signatureData.createdAt._seconds * 1000)
                          : null;
                      return signedAt
                        ? `Signed on ${signedAt.toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}`
                        : "Signature received";
                    })()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
                onClick={() => setShowSignatureModal(true)}
                disabled={!signatureData}
              >
                <Eye className="h-4 w-4" />
                View Signature
              </Button>
            </div>
          ) : (
            <div className="rounded-[12px] bg-[#f4f5f6] dark:bg-white/5 px-4 py-4">
              <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
                Conditional hire letter not yet signed.
              </p>
            </div>
          )}
        </div>

        {/* Compliance Section - always show all authorizations */}
        <div className="rounded-[16px] border border-[#e4e7ea] bg-white p-4 md:p-5 dark:border-white/10 dark:bg-[#1b232b] space-y-4">
          <h3 className="text-[18px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
            Compliance
          </h3>
          <div className="space-y-3">
            {ALL_AUTHORIZATION_KEYS.map((authKey) => {
              const isEnabled = complianceData?.authorizations?.[authKey] ?? false;
              return (
                <div
                  key={authKey}
                  className="flex flex-col gap-3 rounded-[12px] bg-[#f4f5f6] dark:bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <span className="flex-1 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                    {authorizationLabels[authKey] || authKey}
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <Badge
                      className={
                        isEnabled
                          ? "rounded-[6px] border-0 bg-[#e6f6ec] px-2 py-0.5 text-[12px] font-medium text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]"
                          : "rounded-[6px] border-0 bg-[#eef0f2] px-2 py-0.5 text-[12px] font-medium text-[#2a3138] dark:bg-white/10 dark:text-[#c9d1d4]"
                      }
                    >
                      {isEnabled ? "Approved" : "Pending"}
                    </Badge>
                    {!isEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#f1c4bf] bg-white text-[#b42318] hover:bg-[#fdf2f1] hover:text-[#b42318] dark:border-[#f8a1a1]/30 dark:bg-transparent dark:text-[#f8a1a1]"
                        disabled={actionLoading === `alert-${authKey}`}
                        onClick={() => onSendAuthorizationAlert(authKey)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {actionLoading === `alert-${authKey}` ? "Sending..." : "Send Alert"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

