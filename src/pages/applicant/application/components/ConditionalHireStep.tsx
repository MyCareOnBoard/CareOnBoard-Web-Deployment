import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DigitalSignatureModal from "./DigitalSignature";
import ComplianceStep from "./ComplianceStep";
import {
  useCheckSignatureStatusQuery,
  useSubmitConditionalHireMutation,
} from "@/pages/applicant/application/api";
import { useAuth } from "@/utils/auth";
import { toast } from "sonner";
import { getConditionalHireLetterContent } from "@/pages/applicant/application/conditionalHireLetterContent";

interface ConditionalHireStepProps {
  onBack?: () => void;
  onSuccess: () => void;
}

export default function ConditionalHireStep({
  onBack,
  onSuccess,
}: ConditionalHireStepProps) {
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showCompliancePage, setShowCompliancePage] = useState(false);
  const [submissionSuccessful, setSubmissionSuccessful] = useState(false);
  const { data: signatureStatus, refetch: refetchSignature } =
    useCheckSignatureStatusQuery("conditional-hire");
  const [submitConditionalHire, { isLoading: isSubmitting }] =
    useSubmitConditionalHireMutation();
  const { user } = useAuth();

  const hasSignature = !!signatureStatus?.data?.signatureId;
  const userName = user?.fullName || user?.email?.split("@")[0] || "Applicant";
  const agency = user?.agency?.name || "Agency Name";

  // Resolve the applicant type (default "dsp") and the matching letter content.
  // DSP renders the existing copy verbatim; HHA renders the Caregiver-worded variant.
  const letter = getConditionalHireLetterContent(user?.applicantType);

  // Auto-submit if signature exists, or show letter modal if not signed
  useEffect(() => {
    const autoSubmitIfSigned = async () => {
      // Only run auto-submit logic if we haven't manually shown compliance page
      if (showCompliancePage) {
        return; // Already showing compliance, don't interfere
      }

      if (hasSignature && !submissionSuccessful) {
        // Signature exists, directly submit conditional hire
        try {
          await submitConditionalHire().unwrap();
          setSubmissionSuccessful(true);
          toast.success("Conditional hire letter already signed!", {
            description: "Proceeding with compliance requirements.",
            duration: 4000,
          });
          setShowCompliancePage(true);
          setShowLetterModal(false);
        } catch (error) {
          console.error("[ConditionalHireStep] Auto-submit failed:", error);
          toast.error("Failed to submit conditional hire", {
            description: "Please try again.",
            duration: 4000,
          });
          // Show letter modal to let user retry
          setShowLetterModal(true);
        }
      } else if (hasSignature && submissionSuccessful) {
        // Already submitted, show compliance
        setShowCompliancePage(true);
        setShowLetterModal(false);
      } else if (!hasSignature && !submissionSuccessful) {
        // No signature, show letter modal
        setShowLetterModal(true);
        setShowCompliancePage(false);
      }
    };

    autoSubmitIfSigned();
  }, [hasSignature]); // Only depend on hasSignature, not submissionSuccessful

  const handleAccept = () => {
    setShowLetterModal(false);
    setShowSignatureModal(true);
  };

  const handleReject = () => {
    setShowLetterModal(false);
    // Handle rejection - go back to previous step
    if (onBack) {
      onBack();
    }
  };

  const handleSignatureComplete = async () => {
    setShowSignatureModal(false);

    try {
      // Submit conditional hire to backend with acceptance
      await submitConditionalHire().unwrap();
      setSubmissionSuccessful(true);
      // Hide letter modal 
      setShowLetterModal(false);
      toast.success("Conditional hire letter signed successfully!", {
        description: "You can now proceed with compliance requirements.",
        duration: 4000,
      });

      // Show compliance page
      setShowCompliancePage(true);
    } catch (error) {
      console.error(
        "[ConditionalHireStep] Failed to submit conditional hire:",
        error
      );

      // Reset submission flag
      setSubmissionSuccessful(false);

      // Refetch signature status to clear the signature
      await refetchSignature();

      // Ensure compliance page is hidden
      setShowCompliancePage(false);

      // Show letter modal again so user can retry
      setShowLetterModal(true);

      toast.error("Failed to submit signature", {
        description: "Please try again or contact support.",
        duration: 4000,
      });
    }
  };

  // Handle signature modal close without signing
  const handleSignatureModalClose = (isOpen: boolean) => {
    setShowSignatureModal(isOpen);
    // If closing (isOpen = false) AND not successful, show letter modal again
    if (!isOpen && !submissionSuccessful) {
      setShowLetterModal(true);
    }
  };

  // If showing compliance page, render it
  if (showCompliancePage) {
    return <ComplianceStep onBack={onBack} onSuccess={onSuccess} />;
  }

  return (
    <>
      {/* Conditional Hire Letter Modal */}
      {showLetterModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-white/30 backdrop-blur-sm"
            onClick={handleReject}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Conditional Hire Letter
                </h2>
                <button
                  onClick={handleReject}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Letter Content - Scrollable */}
              <div className="flex-1 px-6 py-4 overflow-y-auto">
                <div className="space-y-4 text-sm">
                  {/* Letter Header */}
                  <div>
                    <h3 className="mb-3 text-base font-bold text-gray-900">
                      CONDITIONAL HIRE & CONSENT LETTER
                    </h3>
                    <p className="mb-2 text-green-700">
                      Dear{" "}
                      <span className="border-b border-green-600">
                        {userName}
                      </span>
                      ,
                    </p>
                    <p className="leading-relaxed text-green-700">
                      We are pleased to inform you that you have been{" "}
                      <span className="font-semibold text-green-700">
                        conditionally selected for employment
                      </span>{" "}
                      with{" "}
                      <span className="font-semibold text-green-700">
                        {agency}
                      </span>{" "}
                      as a{" "}
                      <span className="font-semibold text-green-700">
                        {letter.roleWording}.
                      </span>{" "} Your employment is conditional upon the
                      successful completion of all pre-employment requirements
                      and state-mandated training.
                    </p>
                  </div>

                  {/* Conditions Section */}
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-gray-900">
                      CONDITIONS OF EMPLOYMENT
                    </h4>
                    <p className="mb-2 text-green-700">
                      As a condition of your hire, you must complete the
                      following:
                    </p>

                    <div className="space-y-3">
                      {letter.conditions.map((section, idx) => (
                        <div key={idx}>
                          <p className="font-semibold text-gray-900 mb-1.5">
                            {section.heading}
                          </p>
                          {section.intro && (
                            <p className="text-green-700 text-xs mb-1.5">
                              {section.intro}
                            </p>
                          )}
                          {section.body ? (
                            <p className="text-xs text-green-700">
                              {section.body.split("{agency}").map((part, i, arr) => (
                                <span key={i}>
                                  {part}
                                  {i < arr.length - 1 && (
                                    <span className="font-semibold text-green-700">
                                      {agency}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </p>
                          ) : (
                            <ul className="ml-4 space-y-1 text-xs text-green-700 list-none">
                              {section.items.map((item, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-2">○</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consent Section */}
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-gray-900">
                      CONSENT FOR PRE-EMPLOYMENT CHECKS
                    </h4>
                    <p className="mb-2 text-xs text-green-700">
                      By signing this letter, you consent to the following:
                    </p>
                    <ul className="ml-4 space-y-1 text-xs text-green-700 list-none">
                      {letter.consentItems.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warning Section */}
                  <div className="p-3 border-l-4 border-red-500 bg-red-50">
                    <p className="mb-2 text-sm font-bold text-red-900">
                      You also acknowledge that your employment is at-will and
                      may be rescinded if:
                    </p>
                    <ul className="ml-4 space-y-1 text-xs text-red-800 list-none">
                      {letter.warningItems.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Next Steps */}
                  <div>
                    <p className="text-xs leading-relaxed text-green-700">
                      We are excited to have you on our team and look forward to
                      supporting you in your professional growth as a{" "}
                      {letter.roleWording} of <span className="font-semibold">
                        {agency}
                      </span>
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-green-700">
                      Please indicate your agreement to the above conditions by
                      signing or accepting or rejecting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                <Button
                  onClick={handleReject}
                  className="px-6 bg-[#B2B2B3] hover:bg-gray-400 text-white rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="px-6 text-white bg-teal-500 rounded-full hover:bg-teal-600"
                >
                  {isSubmitting ? "Submitting..." : "Sign Digitally"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Digital Signature Modal */}
      <DigitalSignatureModal
        isOpen={showSignatureModal}
        setIsOpen={handleSignatureModalClose}
        proceed={handleSignatureComplete}
        useCase="conditional-hire"
      />
    </>
  );
}
