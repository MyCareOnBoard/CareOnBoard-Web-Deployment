/**
 * Values are the canonical document-type ids from the backend
 * (CareOnBoard-BackEnd/functions/config/document-types.js). The backend normalises
 * whatever it receives, but keeping these canonical means the dashboard's
 * getDocument(value) lookup matches stored documents from every upload path —
 * previously a licence uploaded by agency staff ("driver-license") was invisible to
 * a panel looking for "driverLicense".
 */
export const userPanelDocumentTypes = [
  {label: "Resume", value: "other"},
  {label: "Photo ID", value: "photo-id"},
  {label: "Driver's License", value: "driver-license"},
  {label: "Social Security Card", value: "social-security-card"},
  {label: "Diploma", value: "diploma"},
  {label: "Certifications", value: "certifications"},
  {label: "Hepatitis B vaccination series documents or chest x ray", value: "hepatitis-b-vaccination"},
  // {label: "Hepatitis B immunity titer result", value: "hepatitis-b-immunity"},
  {label: "Tb test result", value: "tb-test"},
  {label: "I-9 form", value: "i9-form"},
  {label: "W-4 Form", value: "w4-form"},
]
