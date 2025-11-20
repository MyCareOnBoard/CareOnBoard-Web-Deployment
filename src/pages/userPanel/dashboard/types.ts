export interface GetEmployeeDocumentsResponse {
  id: string;
  documentId: string;
  employeeId: string;
  documentType: string;
  fileUrl: string;
  status: string;
  uploadDate: string;
  expiryDate: string | null;
}

export interface SaveEmployeeDocumentPayload {
  fileUrl: string;
  documentType: string;
}

export interface GetEmployeeInfoResponse {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  workAvailability: boolean;
  hireDate: string | null;
  profilePicture: string | null;
  tagId: string;
  role: string;
}

export interface UpdateEmployeeInfoPayload {
  workAvailability: boolean;
}

export interface GetEmployeeTrainingsResponse {
  id: string;
  name: string;
  status: string;
}