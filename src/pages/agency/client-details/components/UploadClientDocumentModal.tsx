import React, { FormEvent, useEffect, useState } from "react";
import { X, CalendarDays, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  uploadClientDocument,
  updateClient,
  getAgencyClientById,
  type ClientDocumentKey,
  type ClientDocument,
} from "@/lib/api/clients";
import {
  DOCUMENT_TYPE_OPTIONS,
  DOC_KEY_TO_SERVER_TYPE,
} from "@/pages/shared/client-management/utils/documentTypeConstants";

interface FormData {
  documentType: ClientDocumentKey | "other" | "";
  file: File | null;
  issuedOnDate: Date | null;
  expiryDate: Date | null;
  autoReminder: boolean;
  customName?: string;
  customTitle?: string;
}

const documentTypes: Array<{ value: ClientDocumentKey | "other"; label: string }> = [
  ...DOCUMENT_TYPE_OPTIONS,
  { value: "other", label: "Other" },
];

const docKeyToType: Record<ClientDocumentKey | "other", string> = {
  ...DOC_KEY_TO_SERVER_TYPE,
  other: "others",
};

const tenYearsFromNow = new Date();
tenYearsFromNow.setFullYear(new Date().getFullYear() + 10);

interface UploadClientDocumentModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  clientId: string;
  onComplete: (info?: { uploadedKey?: string }) => void;
  onError: (error: string) => void;
  documentToEdit?: ClientDocument;
}

export function UploadClientDocumentModal({
  isOpen,
  setIsOpen,
  clientId,
  onComplete,
  onError,
  documentToEdit,
}: UploadClientDocumentModalProps) {
  const [formData, setFormData] = useState<FormData>({
    documentType: "",
    file: null,
    issuedOnDate: null,
    expiryDate: null,
    autoReminder: true,
    customName: "",
    customTitle: "",
  });
  const [isIssuedDateOpen, setIsIssuedDateOpen] = useState(false);
  const [isExpiryDateOpen, setIsExpiryDateOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Preload form when editing a document
  useEffect(() => {
    if (documentToEdit && isOpen) {
      // Check if it's a standard document type or "other"
      const standardDocType = documentTypes.find((dt) => dt.value === documentToEdit.key);
      const isOther = !standardDocType;

      setFormData({
        documentType: isOther ? "other" : (documentToEdit.key as ClientDocumentKey | "other"),
        file: null, // Don't preload file
        issuedOnDate: documentToEdit.issuedOnDate ? new Date(documentToEdit.issuedOnDate) : null,
        expiryDate: documentToEdit.expiryDate ? new Date(documentToEdit.expiryDate) : null,
        autoReminder: documentToEdit.autoReminder ?? true,
        customName: isOther ? documentToEdit.key : "",
        customTitle: isOther ? (documentToEdit.title || "") : "",
      });
    } else if (!documentToEdit && isOpen) {
      // Reset form when opening for new document
      setFormData({
        documentType: "",
        file: null,
        issuedOnDate: null,
        expiryDate: null,
        autoReminder: true,
        customName: "",
        customTitle: "",
      });
    }
  }, [documentToEdit, isOpen]);

  const handleCancel = () => {
    setIsOpen(false);
    setFormData({
      documentType: "",
      file: null,
      issuedOnDate: null,
      expiryDate: null,
      autoReminder: true,
      customName: "",
      customTitle: "",
    });
  };

  if (!isOpen) return null;

  const handleFileUpload = async (files: FileList | null) => {
    try {
      if (!files) return;
      const file = files[0];
      setFormData({ ...formData, file });
    } catch (error) {
      console.error("Error selecting file:", error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.documentType) {
      onError("Please select a document type and upload a file.");
      return;
    }

    // Validate custom fields if "Other" is selected
    if (formData.documentType === "other") {
      if (!formData.customName || !formData.customTitle) {
        onError("Please provide both a name and title for the document.");
        return;
      }
    }

    try {
      setIsUploading(true);

      const isOther = formData.documentType === "other";
      const isEditing = !!documentToEdit;

      // Upload the file
      let documentType = isOther ? formData.customName : docKeyToType[formData.documentType];
      const uploadResult = await uploadClientDocument(clientId, documentType as string, formData.file);

      // Get existing client to fetch current documents
      const existingClient = await getAgencyClientById(clientId);
      const existingDocuments: ClientDocument[] = existingClient.documents || [];

      // Create/update document entry
      const documentKey = (isOther ? formData.customName : formData.documentType) as ClientDocumentKey;
      const updatedDocument: ClientDocument = {
        key: documentKey,
        title: isOther ? formData.customTitle : (documentTypes.find((dt) => dt.value === formData.documentType)?.label || ""),
        fileName: uploadResult.fileName,
        url: uploadResult.url,
        issuedOnDate: formData.issuedOnDate ? formData.issuedOnDate.toISOString() : undefined,
        expiryDate: formData.expiryDate ? formData.expiryDate.toISOString() : undefined,
        autoReminder: formData.autoReminder,
      };

      // Update or append document
      let updatedDocuments: ClientDocument[];
      if (isEditing && documentToEdit) {
        // Find and replace the document being edited
        // Match by key and url (or fileName if url is not available) to uniquely identify the document
        updatedDocuments = existingDocuments.map((doc) => {
          const matchesKey = doc.key === documentToEdit.key;
          const matchesUrl = documentToEdit.url ? doc.url === documentToEdit.url : doc.fileName === documentToEdit.fileName;
          return matchesKey && matchesUrl ? updatedDocument : doc;
        });
      } else {
        // Append new document
        updatedDocuments = [...existingDocuments, updatedDocument];
      }

      // Update client with all documents
      await updateClient(clientId, {
        documents: updatedDocuments,
      });

      // Reset form
      setFormData({
        documentType: "",
        file: null,
        issuedOnDate: null,
        expiryDate: null,
        autoReminder: true,
        customName: "",
        customTitle: "",
      });

      setIsOpen(false);
      onComplete({ uploadedKey: documentKey });
    } catch (error: any) {
      console.error("Error uploading document:", error);
      onError(error?.message || "Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-transparent bg-opacity-40 backdrop-blur z-40"
        onClick={handleCancel}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-2xl w-full max-w-2xl relative animate-fadeIn p-6 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between mb-3 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {documentToEdit ? "Update Document" : "Upload Document"}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 flex-1 overflow-y-auto">
            <div className="mb-6">
              <p className="text-sm mb-1">Document Type</p>
              <Select
                value={formData.documentType}
                onValueChange={(value) =>
                  setFormData({ 
                    ...formData, 
                    documentType: value as ClientDocumentKey | "other",
                    // Clear custom fields when switching away from "other"
                    customName: value === "other" ? formData.customName : "",
                    customTitle: value === "other" ? formData.customTitle : "",
                  })
                }
              >
                <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((doc) => (
                    <SelectItem key={doc.value} value={doc.value}>
                      {doc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Name and Title fields - shown only when "Other" is selected */}
            {formData.documentType === "other" && (
              <>
                <div className="mb-6">
                  <label className="text-sm mb-1 block">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-[#808081] mb-2">
                    A unique identifier for this document type (e.g., "insurance-card", "medication-list")
                  </p>
                  <Input
                    value={formData.customName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, customName: e.target.value })
                    }
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Enter document name"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="text-sm mb-1 block">
                    Document Title <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-[#808081] mb-2">
                    A descriptive title that will be displayed for this document (e.g., "Insurance Card", "Medication List")
                  </p>
                  <Input
                    value={formData.customTitle || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, customTitle: e.target.value })
                    }
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Enter document title"
                    required
                  />
                </div>
              </>
            )}

            <div className="mb-6">
              <p className="text-sm mb-1">Issued on date</p>
              <Popover open={isIssuedDateOpen} onOpenChange={setIsIssuedDateOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="w-full focus:outline-none">
                    <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                      <InputGroupInput
                        value={
                          formData.issuedOnDate
                            ? format(formData.issuedOnDate, "MMM d, yyyy")
                            : ""
                        }
                        placeholder="Select date"
                        readOnly
                        className="text-[#10141a]"
                      />
                      <InputGroupAddon align="inline-end">
                        <CalendarDays className="h-5 w-5 text-[#10141a]" />
                      </InputGroupAddon>
                    </InputGroup>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={formData.issuedOnDate || undefined}
                    defaultMonth={formData.issuedOnDate || new Date()}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 10}
                    formatters={{
                      formatMonthDropdown: (date) =>
                        date.toLocaleString("default", { month: "long" }),
                    }}
                    classNames={{
                      dropdown_root:
                        "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                    }}
                    onSelect={(d) => {
                      if (d) {
                        setFormData({ ...formData, issuedOnDate: d });
                        setIsIssuedDateOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="mb-6">
              <p className="text-sm mb-1">Expiry Date</p>
              <Popover open={isExpiryDateOpen} onOpenChange={setIsExpiryDateOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="w-full focus:outline-none">
                    <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                      <InputGroupInput
                        value={
                          formData.expiryDate ? format(formData.expiryDate, "MMM d, yyyy") : ""
                        }
                        placeholder="Select date"
                        readOnly
                        className="text-[#10141a]"
                      />
                      <InputGroupAddon align="inline-end">
                        <CalendarDays className="h-5 w-5 text-[#10141a]" />
                      </InputGroupAddon>
                    </InputGroup>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={formData.expiryDate || undefined}
                    defaultMonth={formData.expiryDate || new Date()}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={tenYearsFromNow.getFullYear()}
                    formatters={{
                      formatMonthDropdown: (date) =>
                        date.toLocaleString("default", { month: "long" }),
                    }}
                    classNames={{
                      dropdown_root:
                        "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                    }}
                    onSelect={(d) => {
                      if (d) {
                        setFormData({ ...formData, expiryDate: d });
                        setIsExpiryDateOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="mb-6">
              <p className="text-sm mb-1">Upload your document</p>
              <FileUpload
                name="upload-client-document"
                className="h-[90px] w-full max-w-[100vw]"
                label={isUploading ? "Uploading..." : "Upload Your Document"}
                accept=".pdf,.doc,.docx,image/*"
                onChange={async (event) => {
                  await handleFileUpload(event.target.files ?? null);
                }}
                required={true}
              />
              {formData.file && (
                <div className="flex space-x-2 my-3 bg-[#00D84114] p-3 rounded">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      opacity="0.4"
                      d="M6.66675 5.83301H13.3334"
                      stroke="#00944A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      opacity="0.4"
                      d="M6.66675 9.16699H10.0001"
                      stroke="#00944A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.8333 17.917V17.5003C10.8333 15.1433 10.8333 13.9648 11.5655 13.2326C12.2978 12.5003 13.4763 12.5003 15.8333 12.5003H16.2499M16.6666 11.1196V8.33366C16.6666 5.19096 16.6666 3.61962 15.6903 2.6433C14.714 1.66699 13.1426 1.66699 9.99992 1.66699C6.85723 1.66699 5.28588 1.66699 4.30956 2.6433C3.33325 3.61961 3.33325 5.19096 3.33325 8.33366V12.1205C3.33325 14.8247 3.33325 16.1767 4.07164 17.0926C4.22082 17.2776 4.38934 17.4461 4.57436 17.5952C5.49018 18.3337 6.84227 18.3337 9.54642 18.3337C10.1344 18.3337 10.4283 18.3337 10.6976 18.2387C10.7536 18.2189 10.8084 18.1962 10.862 18.1706C11.1196 18.0473 11.3274 17.8395 11.7432 17.4237L15.6903 13.4767C16.172 12.9949 16.4128 12.7541 16.5398 12.4477C16.6666 12.1415 16.6666 11.8008 16.6666 11.1196Z"
                      stroke="#00944A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{formData.file.name}</span>
                </div>
              )}
            </div>

            <div className="mb-6 flex items-center gap-3">
              <p className="text-sm">Auto Reminder</p>
              <Switch
                checked={formData.autoReminder}
                onCheckedChange={(checked) => setFormData({ ...formData, autoReminder: checked })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center p-3 w-full flex-shrink-0">
            <Button
              type="submit"
              disabled={
                isUploading || 
                !formData.file || 
                !formData.documentType ||
                (formData.documentType === "other" && (!formData.customName || !formData.customTitle))
              }
              className="w-full px-6 text-white font-medium bg-[#00b4b8] hover:bg-[#00a0a4] rounded-[60px] transition-colors h-11 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {documentToEdit ? "Updating..." : "Uploading..."}
                </>
              ) : (
                documentToEdit ? "Update" : "Upload"
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

