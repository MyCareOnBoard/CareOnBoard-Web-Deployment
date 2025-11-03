

export interface UserDocsResponse {
  success: boolean;
  documents: {
    resume: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    photoId: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    socialSecurityCard: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    diploma: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    certifications: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    hepatitisBVaccination: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    hepatitisBImmunity: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    tbTest: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    i9Form: {
      label: string;
      url: string;
      uploaded: boolean;
      uploadedAt: string;
    };
    w4Form: {
      label: string;
      url: string;
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