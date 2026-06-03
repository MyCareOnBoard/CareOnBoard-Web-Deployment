import {ApplicantDocumentFileUploadedInfo} from "@/pages/applicant/application/components/DocumentUploadStep";

export interface Step {
  title: string;
  status: "complete" | "pending";
}

export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  data: {
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
    storagePath: string;
    uploadedAt: string;
  };
}

export type DocumentTypes = "resume"
  | "photo-id"
  | "driver-license"
  | "social-security-card"
  | "diploma"
  | "certifications"
  | "hepatitis-b-vaccination"
  | "hepatitis-b-immunity"
  | "tb-test"
  | "i9-form"
  | "w4-form"

export interface UploadDocumentPayload {
  documentType?: DocumentTypes;
  data: FormData;
}

export interface DocumentUploadAndEligibilityPayload {
  photoIdUrl?: ApplicantDocumentFileUploadedInfo;
  driverLicenseUrl?: ApplicantDocumentFileUploadedInfo;
  socialSecurityCardUrl?: ApplicantDocumentFileUploadedInfo;
  diplomaUrl?: ApplicantDocumentFileUploadedInfo;
  certificationsUrl?: ApplicantDocumentFileUploadedInfo;
  hepatitisBVaccinationUrl?: ApplicantDocumentFileUploadedInfo;
  hepatitisBImmunityUrl?: ApplicantDocumentFileUploadedInfo;
  tbTestResultUrl?: ApplicantDocumentFileUploadedInfo;
  i9FormUrl?: ApplicantDocumentFileUploadedInfo;
  w4FormUrl?: ApplicantDocumentFileUploadedInfo;
  references: {
    name: string;
    relationship: string;
    phoneNumber: string;
    email: string;
  }[];
  declarationAgreed: boolean;
}

export interface DocumentUploadAndEligibilityResponse {
  success: boolean;
  message: string;
  data: DocumentUploadAndEligibilityPayload;
}

export interface CheckSignatureStatusResponse {
  success: boolean;
  data: {
    signatureId: string;
    userId: string;
    context: string;
    signatureType: string;
    signatureData: string;
    metadata: {};
    storageInfo: {
      storagePath: string;
      mimeType: string;
      size: number;
    };
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface SignDocumentPayload {
  context: string;
  data: {
    signatureType: string;
    signatureData: string;
  }
}

export interface CheckOfficialSignatureStatusResponse {
    success: boolean;
    status: {
        letterSigning: {
            hasSigned: boolean;
            isSubmitted: boolean;
            signatureType: string;
            signedAt: {
                _seconds: number;
                _nanoseconds: number;
            };
            submittedAt: {
                _seconds: number;
                _nanoseconds: number;
            }
        },
        overall: {
            status: string;
            readyForNextStep: boolean;
        }
    }
}