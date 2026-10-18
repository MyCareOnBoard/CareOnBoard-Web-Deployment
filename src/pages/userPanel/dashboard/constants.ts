import {getApplicantDocs} from "@/pages/applicant/application/documentConfig";
import {DOCUMENT_TYPE_LABELS} from "@/lib/documentTypes";
import {programLabel} from "@/lib/roleLabel";

export interface UserPanelDocumentType {
  label: string;
  value: string;
  /** The assignment check needs an expiry date on file for this type. */
  requiresExpiry: boolean;
}

/**
 * Values are the canonical document-type ids from the backend
 * (CareOnBoard-BackEnd/functions/config/document-types.js). The backend normalises
 * whatever it receives, but keeping these canonical means the dashboard's
 * getDocument(value) lookup matches stored documents from every upload path —
 * previously a licence uploaded by agency staff ("driver-license") was invisible to
 * a panel looking for "driverLicense".
 *
 * The list follows the staff member's program, so HHA caregivers see their own
 * documents (CHHA certificate, CPR, MMR, physical exam) alongside the shared ones.
 */
function buildDocumentTypes(program: "dsp" | "hha"): UserPanelDocumentType[] {
  const docs = getApplicantDocs(program)
    // Hepatitis B immunity is still collected at application but not tracked here.
    .filter(doc => doc.id !== "hepatitis-b-immunity")
    .map(doc => ({label: DOCUMENT_TYPE_LABELS[doc.id] ?? doc.placeholder, value: doc.id, requiresExpiry: doc.requiresExpiry}));
  // HHA applications don't ask for a driver's license, but mileage still needs one on file.
  if (!docs.some(doc => doc.value === "driver-license")) {
    const afterPhotoId = docs.findIndex(doc => doc.value === "photo-id") + 1;
    docs.splice(afterPhotoId, 0, {label: DOCUMENT_TYPE_LABELS["driver-license"], value: "driver-license", requiresExpiry: true});
  }
  return [{label: DOCUMENT_TYPE_LABELS.resume, value: "resume", requiresExpiry: false}, ...docs];
}

const DSP_DOCUMENT_TYPES = buildDocumentTypes("dsp");
const HHA_DOCUMENT_TYPES = buildDocumentTypes("hha");

export function getUserPanelDocumentTypes(user?: {applicantType?: string; role?: string; profile?: {role?: string}} | null): UserPanelDocumentType[] {
  const program = programLabel({applicantType: user?.applicantType, role: user?.profile?.role || user?.role});
  return program === "HHA" ? HHA_DOCUMENT_TYPES : DSP_DOCUMENT_TYPES;
}
