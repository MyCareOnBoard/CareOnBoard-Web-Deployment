import React, {useState} from 'react';
import {X} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {FileUpload} from "@/components/ui/file-upload";

interface FormData {
  name: string;
  type: string;
  file: File | null;
}

const UserPanelDocumentUpload = (
  {isOpen, setIsOpen, onComplete, onError, onLocationError, onLoggedOut, onAskLocationPerm}: {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    onComplete: () => void;
    onError: () => void;
    onLocationError: () => void;
    onLoggedOut: () => void;
    onAskLocationPerm: () => void;
  }
) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    file: null,
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleCancel = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const handleFileUpload = async (
    files: FileList | null,
  ) => {
    try {
      setIsUploading(true)
      if (!files) return;
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      // setDocumentTypeUploading(documentType);
      // const response = await uploadFile({
      //   data: formData,
      //   documentType
      // }).unwrap();
      //
      // setFileUploads((prev) => [
      //   ...prev.filter((item) => item.fileType !== documentType),
      //   {
      //     fileName: response.data.fileName,
      //     fileUrl: response.data.url,
      //     fileType: documentType
      //   }
      // ]);
      setIsUploading(false);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };


  return (
    <>
      <div
        className="fixed inset-0 bg-transparent bg-opacity-40 backdrop-blur z-40"
        onClick={() => setIsOpen(false)}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl relative animate-fadeIn p-6">
          {/* Header */}
          <div className="flex justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
            </div>
            <button
              onClick={handleCancel}
              className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>
          <div className={"mb-6"}>
            <div className={"mb-6"}>
              <p className={"text-sm mb-1"}>Document Name</p>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={"Which document is this"}
                  value={formData.name}
                  className="w-full pr-10"
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
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
                    <SelectItem value="driver_license">Driver License</SelectItem>
                    <SelectItem value="id_card">ID Card</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center p-3 w-full">
            <Button
              onClick={onComplete}
              className="w-full px-6 text-white font-medium bg-teal-500 hover:bg-teal-600 rounded-full transition-colors"
            >
              Upload
            </Button>
          </div>
          <p onClick={onError} className={"text-center underline text-red-600 cursor-pointer"}>
            trigger error modal
          </p>
          <p onClick={onLocationError} className={"text-center underline text-red-600 cursor-pointer"}>
            trigger location modal
          </p>
          <p onClick={onLoggedOut} className={"text-center underline text-red-600 cursor-pointer"}>
            trigger logged out modal
          </p>
          <p onClick={onAskLocationPerm} className={"text-center underline text-red-600 cursor-pointer"}>
            trigger location permission modal
          </p>
        </div>
      </div>
    </>
  );
};

export default UserPanelDocumentUpload;