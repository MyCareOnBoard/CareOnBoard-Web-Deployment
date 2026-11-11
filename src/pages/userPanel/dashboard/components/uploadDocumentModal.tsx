import type { SaveEmployeeDocumentResponse } from '../types';
import React, {FormEvent, useState} from 'react';
import {CalendarDays, CloudUpload, FileCheck2, Info, X} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {FileUpload} from "@/components/ui/file-upload";
import {useSaveDocumentMutation, useUploadDocumentMutation} from "@/pages/userPanel/dashboard/api";
import type {UserPanelDocumentType} from "@/pages/userPanel/dashboard/constants";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {toast} from "sonner";

interface FormData {
  type: string;
  file: File | null;
  expiryDate: Date | null;
}

/** What the agency asked for, keyed by document type. */
export type RequestedDocuments = Record<string, {validThroughLabel?: string; message?: string}>;

const tenYearsFromNow = new Date()
tenYearsFromNow.setFullYear(new Date().getFullYear() + 10)

const fieldLabel = "mb-1.5 block text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]";
const fieldBox = "h-11 w-full rounded-[8px] border border-[#e3e8ea] bg-white px-3.5 text-sm dark:border-white/10 dark:bg-[#141b21]";

const UserPanelDocumentUpload = (
  {isOpen, setIsOpen, onComplete, onError, initialDocumentType = '', documentTypes, requestedDocuments = {}}: {
    isOpen: boolean;
    initialDocumentType?: string;
    documentTypes: UserPanelDocumentType[];
    requestedDocuments?: RequestedDocuments;
    setIsOpen: (value: boolean) => void;
    onComplete: (result: SaveEmployeeDocumentResponse) => void;
    onError: () => void;
  }
) => {
  const [formData, setFormData] = useState<FormData>({
    type: initialDocumentType,
    file: null,
    expiryDate: null,
  });
  const [openDatePopover, setOpenDatePopover] = useState<boolean>(false);
  const [uploadFile, {isLoading: isUploading}] = useUploadDocumentMutation();
  const [saveDocument, {isLoading: isSavingDocument}] = useSaveDocumentMutation();
  const selectedType = documentTypes.find(doc => doc.value === formData.type);
  const expiryExpected = selectedType?.requiresExpiry ?? false;
  const request = formData.type ? requestedDocuments[formData.type] : undefined;
  const busy = isUploading || isSavingDocument;

  const handleCancel = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const handleFileUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (file) setFormData({...formData, file});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.type) return;
    const formDataInstance = new FormData();
    formDataInstance.append("file", formData.file);
    try {
      const response = await uploadFile({
        data: formDataInstance,
      }).unwrap();
      const fileUrl = response.data.url;
      const saved = await saveDocument({
        documentType: formData.type,
        fileUrl: fileUrl,
        expiryDate: null,
        expiryDateKey: formData.expiryDate ? `${formData.expiryDate.getFullYear()}-${String(formData.expiryDate.getMonth() + 1).padStart(2, '0')}-${String(formData.expiryDate.getDate()).padStart(2, '0')}` : null,
      }).unwrap();
      setFormData({type: '', file: null, expiryDate: null});
      onComplete(saved ?? {});
    } catch (error) {
      console.error("Error uploading file:", error);
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
        toast.error('Multiple records exist for this document type. Contact your agency to review them.');
        return;
      }
      onError();
    }
  }

  const buttonText = () => {
    if (isUploading) return "Uploading...";
    if (isSavingDocument) return "Saving...";
    return "Upload document";
  }


  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#10141a]/30 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      {/* Modal */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="upload-document-title"
              className="pointer-events-auto relative max-h-[calc(100vh-32px)] w-full max-w-[480px] overflow-y-auto rounded-[16px] bg-white p-5 shadow-[0_24px_48px_-12px_rgba(16,20,26,0.25)] animate-fadeIn sm:p-6 dark:bg-[#1b232b]">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="upload-document-title" className="text-[18px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Upload document</h2>
              <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Add a document to your record for your agency to review.</p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e3e8ea] text-[#10141a] transition-colors hover:bg-[#f4f6f7] dark:border-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/[0.06]"
              aria-label="Close"
            >
              <X className="size-4"/>
            </button>
          </div>

          {request && selectedType && <div className="mb-5 rounded-[8px] bg-[#f4f6f7] px-3.5 py-3 dark:bg-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">{selectedType.label}</p>
              <span className="shrink-0 rounded-full bg-[#fff0eb] px-2 py-0.5 text-xs font-medium text-[#b3371c] dark:bg-[#d53411]/20 dark:text-[#f3a08c]">Requested</span>
            </div>
            <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Your agency asked you to upload this document.</p>
            {request.validThroughLabel && <p className="mt-0.5 text-xs text-[#5d6b73] dark:text-[#9aa4a8]">Valid through {request.validThroughLabel}</p>}
            {request.message && <p className="mt-0.5 break-words text-xs text-[#5d6b73] dark:text-[#9aa4a8]">Note: {request.message}</p>}
          </div>}

          <div className="space-y-4">
            <div>
              <span id="upload-document-type" className={fieldLabel}>Document type</span>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({...formData, type: value})}
              >
                <SelectTrigger aria-labelledby="upload-document-type" className={`${fieldBox} data-[size=default]:h-11`}>
                  <SelectValue placeholder="Select document type"/>
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((doc) => <SelectItem key={doc.value} value={doc.value}>{doc.label}{requestedDocuments[doc.value] ? ' (requested)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span id="upload-document-expiry" className={fieldLabel}>Expiry date{expiryExpected ? "" : " (optional)"}</span>
              <Popover
                open={openDatePopover}
                onOpenChange={(open) => setOpenDatePopover(open)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-labelledby="upload-document-expiry"
                    className={`${fieldBox} flex cursor-pointer items-center justify-between gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00a3a7]/40`}
                  >
                    <span className={formData.expiryDate ? "text-[#10141a] dark:text-[#f4f6f7]" : "text-[#8a959b]"}>
                      {formData.expiryDate
                        ? new Date(formData.expiryDate).toDateString()
                        : "Select expiry date"}
                    </span>
                    <CalendarDays className="size-4 text-[#687e82]" aria-hidden="true"/>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="mt-1 w-auto rounded-[12px] border border-[#e3e8ea] bg-white p-0 shadow-lg dark:border-white/10 dark:bg-[#1b232b]">
                  <Calendar
                    mode="single"
                    className="bg-transparent"
                    captionLayout="dropdown"
                    startMonth={new Date()}
                    endMonth={tenYearsFromNow}
                    selected={formData.expiryDate ? new Date(formData.expiryDate) : new Date()}
                    defaultMonth={new Date()}
                    disabled={{
                      before: new Date()
                    }}
                    onSelect={(date) => {
                      if (date) {
                        setFormData({...formData, expiryDate: date})
                        setOpenDatePopover(false);
                      }
                    }}
                    formatters={{
                      formatMonthDropdown: (date) =>
                        date.toLocaleString("default", {month: "long"}),
                    }}
                    classNames={{
                      dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                      caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                    }}
                    autoFocus={true}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <span className={fieldLabel}>Document file</span>
              <FileUpload
                name="upload-document-file"
                className="h-auto max-w-none rounded-[12px] border-[#e3e8ea] bg-white px-4 py-6 dark:border-white/10 dark:bg-[#141b21] [&>span]:flex-col [&>span]:gap-2 [&>span]:text-center"
                icon={<span className="flex size-9 items-center justify-center rounded-full bg-[#f2f4f5] text-[#10141a] dark:bg-white/10 dark:text-[#f4f6f7]"><CloudUpload className="size-[18px]" aria-hidden="true"/></span>}
                label={isUploading ? "Uploading..." : <span className="flex flex-col gap-1">
                  <span className="text-[13px] text-[#10141a] dark:text-[#f4f6f7]"><span className="font-semibold text-[#007f83] dark:text-[#7fe0e2]">Click to upload</span> or drag and drop</span>
                  <span className="text-[11px] text-[#5d6b73] dark:text-[#9aa4a8]">PDF, JPG, PNG or WEBP</span>
                </span>}
                accept=".pdf, .jpg, .png, .webp"
                onFilesSelected={handleFileUpload}
                required={true}
              />
              {formData.file && (
                <div className="mt-2.5 flex items-center gap-2 rounded-[8px] bg-[#e6f6ed] px-3 py-2.5 text-sm text-[#187343] dark:bg-[#187343]/20 dark:text-[#8fd9ae]">
                  <FileCheck2 className="size-4 shrink-0" aria-hidden="true"/>
                  <span className="min-w-0 truncate">{formData.file.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 rounded-[8px] bg-[#fff6e5] px-3 py-2.5 text-[12px] leading-relaxed text-[#8a5200] dark:bg-[#a76000]/15 dark:text-[#f0c27a]">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true"/>
              <p>{expiryExpected && !formData.expiryDate
                ? "Add the expiry date printed on this document. Without it, your agency can't assign you shifts until they record one."
                : "Your agency's HR team reviews every document you upload."}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="h-10 rounded-[8px] border-[#e3e8ea] bg-white px-4 text-sm font-semibold text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !formData.type || !formData.file}
              className="h-10 rounded-[8px] bg-[#003839] px-4 text-sm font-semibold text-white hover:bg-[#00494a] dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#33b5b8]"
            >
              {buttonText()}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default UserPanelDocumentUpload;
