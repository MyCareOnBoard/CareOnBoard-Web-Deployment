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
  | "social-security-card"
  | "diploma"
  | "certifications"
  | "hepatitis-b-vaccination"
  | "hepatitis-b-immunity"
  | "tb-tes"
  | "i9-form"
  | "w4-form"

export interface UploadDocumentPayload {
  documentType: DocumentTypes;
  data: FormData;
}

export interface DocumentUploadAndEligibilityPayload {
  photoIdUrl?: string;
  socialSecurityCardUrl?: string;
  diplomaUrl?: string;
  certificationsUrl?: string;
  hepatitisBVaccinationUrl?: string;
  hepatitisBImmunityUrl?: string;
  tbTestResultUrl?: string;
  i9FormUrl?: string;
  w4FormUrl?: string;
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