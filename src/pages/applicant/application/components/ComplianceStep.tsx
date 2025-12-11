import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFinalizeConditionalHireMutation } from "@/pages/applicant/application/api";
import { toast } from "sonner";

interface ComplianceStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function ComplianceStep({
  onNext,
}: ComplianceStepProps) {
  const [finalizeConditionalHire, { isLoading }] =
    useFinalizeConditionalHireMutation();
  const [authorizations, setAuthorizations] = useState({
    drugTest: false,
    fingerprint: false,
    centralRegistry: false,
    cariCheck: false,
    sexOffender: false,
    oigExclusion: false,
    healthTB: false,
    referenceChecks: false,
  });

  const [agreements, setAgreements] = useState({
    abuseAwareness: false,
    hipaaConfidentiality: false,
    developmentalDisabilities: false,
    informationCorrect: false,
  });

  const allAuthorizationsChecked = Object.values(authorizations).every(Boolean);
  const allAgreementsChecked = Object.values(agreements).every(Boolean);
  const canProceed = allAuthorizationsChecked && allAgreementsChecked;

  const handleAuthorizationToggle = (key: keyof typeof authorizations) => {
    setAuthorizations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAgreementToggle = (key: keyof typeof agreements) => {
    setAgreements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNext = async () => {
    if (!canProceed) return;

    try {
      const payload = {
        authorizations: {
          drugTest: authorizations.drugTest,
          fingerprint: authorizations.fingerprint,
          centralRegistry: authorizations.centralRegistry,
          cariCheck: authorizations.cariCheck,
          sexOffenderRegistry: authorizations.sexOffender,
          oigExclusion: authorizations.oigExclusion,
          healthTbScreening: authorizations.healthTB,
          referenceChecks: authorizations.referenceChecks,
        },
        termsAcceptance: {
          abuseNeglectExploitation: agreements.abuseAwareness,
          hipaaConfidentiality: agreements.hipaaConfidentiality,
          developmentalDisabilities: agreements.developmentalDisabilities,
        },
        informationCorrect: agreements.informationCorrect,
      };
      await finalizeConditionalHire(payload).unwrap();

      toast.success("Compliance requirements submitted successfully!", {
        description: "You can now proceed to the next step.",
        duration: 4000,
      });

      if (onNext) {
        onNext();
      }
    } catch (error) {      toast.error("Failed to submit compliance requirements", {
        description: "Please try again or contact support.",
        duration: 4000,
      });
    }
  };

  return (
    <div className="max-w-4xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Begin compliance requirements while applicant is "conditionally
          hired."
        </h2>
      </div>

      {/* Authorization Toggles */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <span className="text-gray-900">Authorize Drug test appointment</span>
          <Toggle
            pressed={authorizations.drugTest}
            onPressedChange={() => handleAuthorizationToggle("drugTest")}
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <span className="text-gray-900">
            Authorize Fingerprint appointment
          </span>
          <Toggle
            pressed={authorizations.fingerprint}
            onPressedChange={() => handleAuthorizationToggle("fingerprint")}
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <span className="text-gray-900">
            Authorize Central Registry Check (Developmental Disabilities
            Abuse/Neglect Registry)
          </span>
          <Toggle
            pressed={authorizations.centralRegistry}
            onPressedChange={() => handleAuthorizationToggle("centralRegistry")}
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <span className="text-gray-900">
            Authorize CARI Check (Child Abuse Record Information, DCF)
          </span>
          <Toggle
            pressed={authorizations.cariCheck}
            onPressedChange={() => handleAuthorizationToggle("cariCheck")}
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <span className="text-gray-900">
            Authorize Sex Offender Registry Check (Megan's Law)
          </span>
          <Toggle
            pressed={authorizations.sexOffender}
            onPressedChange={() => handleAuthorizationToggle("sexOffender")}
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <span className="text-gray-900">
            Authorize OIG Exclusion List Check (LEIE)
          </span>
          <Toggle
            pressed={authorizations.oigExclusion}
            onPressedChange={() => handleAuthorizationToggle("oigExclusion")}
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <span className="text-gray-900">Authorize Health & TB Screening</span>
          <Toggle
            pressed={authorizations.healthTB}
            onPressedChange={() => handleAuthorizationToggle("healthTB")}
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <span className="text-gray-900">
            Authorize Reference Checks (Minimum 2, Non-Family)
          </span>
          <Toggle
            pressed={authorizations.referenceChecks}
            onPressedChange={() => handleAuthorizationToggle("referenceChecks")}
          />
        </div>
      </div>

      {/* Agreement Checkboxes */}
      <div className="space-y-4 mb-8">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="abuse-awareness"
            checked={agreements.abuseAwareness}
            onChange={() => handleAgreementToggle("abuseAwareness")}
          />
          <Label
            htmlFor="abuse-awareness"
            className="text-sm text-gray-700 cursor-pointer leading-relaxed"
          >
            I accept the terms and condition for{" "}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 underline inline-flex items-center"
            >
              Abuse, Neglect, and Exploitation Awareness
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="hipaa"
            checked={agreements.hipaaConfidentiality}
            onChange={() => handleAgreementToggle("hipaaConfidentiality")}
          />
          <Label
            htmlFor="hipaa"
            className="text-sm text-gray-700 cursor-pointer leading-relaxed"
          >
            I accept the terms and condition for{" "}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 underline inline-flex items-center"
            >
              HIPAA & Confidentiality
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="developmental-disabilities"
            checked={agreements.developmentalDisabilities}
            onChange={() => handleAgreementToggle("developmentalDisabilities")}
          />
          <Label
            htmlFor="developmental-disabilities"
            className="text-sm text-gray-700 cursor-pointer leading-relaxed"
          >
            I accept the terms and condition for{" "}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 underline inline-flex items-center"
            >
              Overview of Developmental Disabilities
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Label>
        </div>
      </div>

      <div className="flex items-start mb-6 space-x-3">
        <Checkbox
          id="information-correct"
          checked={agreements.informationCorrect}
          onChange={() => handleAgreementToggle("informationCorrect")}
        />
        <Label
          htmlFor="information-correct"
          className="text-sm text-gray-700 cursor-pointer leading-relaxed"
        >
          I hereby declared that all the information are correct
        </Label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-start">
        <Button
          onClick={handleNext}
          disabled={!canProceed || isLoading}
          className="px-8 bg-teal-500 hover:bg-teal-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? "Submitting..." : "Next →"}
        </Button>
      </div>
    </div>
  );
}
