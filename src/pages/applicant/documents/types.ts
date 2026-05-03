import {ApplicantDocumentFileUploadedInfo} from "@/pages/applicant/application/components/DocumentUploadStep";


export interface UserDocsResponse {
  success: boolean;
  documents: {
    resume: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    photoId: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    socialSecurityCard: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    diploma: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    certifications: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    hepatitisBVaccination: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    hepatitisBImmunity: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    tbTest: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    i9Form: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
    w4Form: {
      label: string;
      url: ApplicantDocumentFileUploadedInfo;
      uploaded: boolean;
      uploadedAt: string;
    };
  };
  summary: {
    uploaded: number;
    total: number;
    complete: boolean;
  };
}