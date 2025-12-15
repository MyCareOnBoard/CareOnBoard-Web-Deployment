import React, {FormEvent, useState} from 'react';
import {X} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {FileUpload} from "@/components/ui/file-upload";
import {useSaveDocumentMutation, useUploadDocumentMutation} from "@/pages/userPanel/dashboard/api";
import {userPanelDocumentTypes} from "@/pages/userPanel/dashboard/constants";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";

interface FormData {
  type: string;
  file: File | null;
  expiryDate: Date | null;
}

const tenYearsFromNow = new Date()
tenYearsFromNow.setFullYear(new Date().getFullYear() + 10)

const UserPanelDocumentUpload = (
  {isOpen, setIsOpen, onComplete, onError}: {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    onComplete: () => void;
    onError: () => void;
  }
) => {
  const [formData, setFormData] = useState<FormData>({
    type: '',
    file: null,
    expiryDate: null,
  });
  const [openDatePopover, setOpenDatePopover] = useState<boolean>(false);
  const [uploadFile, {isLoading: isUploading}] = useUploadDocumentMutation();
  const [saveDocument, {isLoading: isSavingDocument}] = useSaveDocumentMutation();

  const handleCancel = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const handleFileUpload = async (
    files: FileList | null,
  ) => {
    try {
      if (!files) return;
      const file = files[0];
      setFormData({...formData, file});
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.file) return;
    const formDataInstance = new FormData();
    formDataInstance.append("file", formData.file);
    try {
      const response = await uploadFile({
        data: formDataInstance,
      }).unwrap();
      const fileUrl = response.data.url;
      await saveDocument({
        documentType: formData.type,
        fileUrl: fileUrl,
        expiryDate: formData.expiryDate ? formData.expiryDate.toDateString() : null,
      }).unwrap();
      setFormData({type: '', file: null, expiryDate: null});
      onComplete();
    } catch (error) {
      console.error("Error uploading file:", error);
      onError();
    }
  }

  const buttonText = () => {
    if (isUploading) return "Uploading...";
    if (isSavingDocument) return "Saving...";
    return "Upload";
  }


  return (
    <>
      <div
        className="fixed inset-0 bg-transparent bg-opacity-40 backdrop-blur z-40"
        onClick={() => setIsOpen(false)}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit}
              className="bg-white rounded-lg shadow-2xl w-full max-w-2xl relative animate-fadeIn p-6">
          {/* Header */}
          <div className="flex justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
            </div>
            <button
              type={"button"}
              onClick={handleCancel}
              className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>
          <div className={"mb-6"}>
            <div className={"mb-6"}>
              <p className={"text-sm mb-1"}>Document Type</p>
              <div>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select document type"/>
                  </SelectTrigger>
                  <SelectContent>
                    {userPanelDocumentTypes.map((doc) => <SelectItem value={doc.value}>{doc.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={"mb-6"}>
              <p className={"text-sm mb-1"}>Expiry Date</p>
              <Popover
                open={openDatePopover}
                onOpenChange={(open) => setOpenDatePopover(open)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-full flex items-center focus:outline-none cursor-pointer"
                  >
                    <span className={"text-sm text-left text-[#B2B2B3] px-4 py-3 rounded-md border border-[#CCCCCD] w-full"}>
                      {formData?.expiryDate
                        ? new Date(formData.expiryDate).toDateString()
                        : "Select expiry date"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                  <Calendar
                    mode="single"
                    className="bg-white"
                    captionLayout="dropdown"
                    startMonth={new Date()}
                    endMonth={tenYearsFromNow}
                    selected={formData.expiryDate ? new Date(formData.expiryDate) : new Date()}
                    defaultMonth={new Date()}
                    disabled={{
                      before: new Date()
                    }}
                    onSelect={async (date) => {
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
            <div className={"mb-6"}>
              <p className={"text-sm mb-1"}>Upload your document</p>
              <FileUpload
                name={"upload-i-9-form"}
                className="h-[90px] w-full max-w-[100vw]"
                label={isUploading ? "Uploading..." : "Upload Your Document"}
                accept=".pdf, .jpg, .png, .webp"
                onChange={async (event) => {
                  await handleFileUpload(event.target.files ?? null);
                }}
                required={true}
              />
              <p className={"text-sm my-1 text-[#B2B2B3]"}>These documents will be reviewed by the HR</p>
              {formData.file && (
                <div className={"flex space-x-2 my-3 bg-[#00D84114] p-3 rounded"}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.4" d="M6.66675 5.83301H13.3334" stroke="#00944A" stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"/>
                    <path opacity="0.4" d="M6.66675 9.16699H10.0001" stroke="#00944A" stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"/>
                    <path
                      d="M10.8333 17.917V17.5003C10.8333 15.1433 10.8333 13.9648 11.5655 13.2326C12.2978 12.5003 13.4763 12.5003 15.8333 12.5003H16.2499M16.6666 11.1196V8.33366C16.6666 5.19096 16.6666 3.61962 15.6903 2.6433C14.714 1.66699 13.1426 1.66699 9.99992 1.66699C6.85723 1.66699 5.28588 1.66699 4.30956 2.6433C3.33325 3.61961 3.33325 5.19096 3.33325 8.33366V12.1205C3.33325 14.8247 3.33325 16.1767 4.07164 17.0926C4.22082 17.2776 4.38934 17.4461 4.57436 17.5952C5.49018 18.3337 6.84227 18.3337 9.54642 18.3337C10.1344 18.3337 10.4283 18.3337 10.6976 18.2387C10.7536 18.2189 10.8084 18.1962 10.862 18.1706C11.1196 18.0473 11.3274 17.8395 11.7432 17.4237L15.6903 13.4767C16.172 12.9949 16.4128 12.7541 16.5398 12.4477C16.6666 12.1415 16.6666 11.8008 16.6666 11.1196Z"
                      stroke="#00944A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>{formData?.file?.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center p-3 w-full">
            <Button
              type={"submit"}
              disabled={isUploading || isSavingDocument}
              className="w-full px-6 text-white font-medium bg-teal-500 hover:bg-teal-600 rounded-full transition-colors"
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