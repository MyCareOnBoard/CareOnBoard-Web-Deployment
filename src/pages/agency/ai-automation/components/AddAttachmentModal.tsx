import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import { useUploadAttachmentMutation } from "../api";
import type { Attachment } from "../types";

interface FileEntry {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

interface AddAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (attachments: Attachment[]) => void;
}

export const AddAttachmentModal: React.FC<AddAttachmentModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadAttachment] = useUploadAttachmentMutation();

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    const newEntries: FileEntry[] = Array.from(selected).map((file) => ({
      file,
      progress: 0,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newEntries]);
  };

  const handleRemove = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    const results: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading", progress: 30 } : f))
      );

      const formData = new FormData();
      formData.append("file", files[i].file);

      try {
        const response = await uploadAttachment(formData).unwrap();
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done", progress: 100 } : f))
        );
        const isImage = files[i].file.type.startsWith("image/");
        results.push({
          type: isImage ? "image" : "file",
          url: response.data.url,
          name: response.data.fileName,
          fileSize: response.data.fileSize,
          fileType: response.data.fileType,
        });
      } catch {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", progress: 0, errorMessage: "Upload failed" } : f
          )
        );
      }
    }

    setUploading(false);

    if (results.length > 0) {
      onUpload(results);
      setFiles([]);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg px-6 py-8 mx-4 bg-white rounded-2xl shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={onClose}
              aria-label="Close"
              disabled={uploading}
            >
              <X size={22} />
            </button>
            <h2 className="text-lg font-semibold mb-1">Add attachment</h2>
            <p className="text-sm text-gray-500 mb-4">Upload images or PDFs to include in your message.</p>
            <FileUpload
              label="Click to upload or drag and drop"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
              multiple
              onFilesSelected={handleFilesSelected}
              className="mb-4"
            />
            <div className="space-y-2 mb-4">
              {files.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-7 text-center">
                      {entry.file.type.includes("pdf") ? (
                        <span className="text-blue-600">📄</span>
                      ) : (
                        <span className="text-green-600">🖼️</span>
                      )}
                    </span>
                    <span className="truncate max-w-[160px] text-sm font-medium">{entry.file.name}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {Math.round((entry.file.size / 1024 / 1024) * 10) / 10} MB
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.status === "error" ? (
                      <span className="text-xs text-red-500">{entry.errorMessage}</span>
                    ) : (
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            entry.status === "done" ? "bg-emerald-500" : "bg-blue-400"
                          }`}
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                    )}
                    {entry.status !== "uploading" && (
                      <button
                        className="ml-2 text-gray-400 hover:text-red-500"
                        onClick={() => handleRemove(idx)}
                        disabled={uploading}
                        aria-label="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={onClose} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
