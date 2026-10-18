import type { ClaimReportFormInput, SavedClaimReportForm } from "@/lib/api/claims";
import type { ClaimReportFormState } from "../data/mockClaimReportData";

/** Report fields (not signatures) that are saved on the claim and used by the 837P. */
export function buildClaimReportFieldsInput(form: ClaimReportFormState): ClaimReportFormInput {
  return {
    onsetDate: form.serviceDateIso || null,
    onsetQualifier: form.qualCode === "484" ? "484" : "431",
    signatureDate: form.signatureDateIso || null,
    conditions: {
      employment: form.conditionEmployment,
      autoAccident: form.conditionAutoAccident,
      otherAccident: form.conditionOtherAccident,
    },
    outsideLab: form.outsideLab,
    hospitalization: {
      from: form.hospitalizationInitialIso || null,
      to: form.hospitalizationEndIso || null,
    },
  };
}

/** Applies the values saved on the claim over the prefilled form. */
export function applySavedClaimReport(
  form: ClaimReportFormState,
  saved: SavedClaimReportForm | null,
): ClaimReportFormState {
  if (!saved) return form;
  const signature = (value: SavedClaimReportForm["patientSignature"]) =>
    value?.signatureData
      ? { signatureType: value.signatureType, signatureData: value.signatureData }
      : null;
  return {
    ...form,
    ...(saved.onsetDate ? { serviceDateIso: saved.onsetDate, currentIllnessDateIso: saved.onsetDate } : {}),
    ...(saved.onsetQualifier ? { qualCode: saved.onsetQualifier } : {}),
    ...(saved.signatureDate ? { signatureDateIso: saved.signatureDate } : {}),
    ...(saved.conditions
      ? {
          conditionEmployment: Boolean(saved.conditions.employment),
          conditionAutoAccident: Boolean(saved.conditions.autoAccident),
          conditionOtherAccident: Boolean(saved.conditions.otherAccident),
        }
      : {}),
    ...(saved.outsideLab ? { outsideLab: saved.outsideLab } : {}),
    ...(saved.hospitalization
      ? {
          hospitalizationInitialIso: saved.hospitalization.from ?? "",
          hospitalizationEndIso: saved.hospitalization.to ?? "",
        }
      : {}),
    signedSignature: signature(saved.patientSignature) ?? form.signedSignature,
    physicianSignature: signature(saved.providerSignature) ?? form.physicianSignature,
  };
}
