import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";

interface Attachment {
  file: File;
  progress: number; // 0-100
  status: "pending" | "uploading" | "done" | "error";
}

interface AddAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
}

export const AddAttachmentModal: React.FC<AddAttachmentModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      file,
      progress: 0,
      status: "pending",
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemove = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    setUploading(true);
    // Simulate upload progress
    for (let i = 0; i < attachments.length; i++) {
      setAttachments((prev) =>
        prev.map((att, idx) =>
          idx === i ? { ...att, status: "uploading", progress: 0 } : att
        )
      );
      await new Promise((res) => setTimeout(res, 500));
      for (let p = 10; p <= 100; p += 10) {
        setAttachments((prev) =>
          prev.map((att, idx) =>
            idx === i ? { ...att, progress: p } : att
          )
        );
        await new Promise((res) => setTimeout(res, 60));
      }
      setAttachments((prev) =>
        prev.map((att, idx) =>
          idx === i ? { ...att, status: "done", progress: 100 } : att
        )
      );
    }
    setUploading(false);
    onUpload(attachments.map((a) => a.file));
    setAttachments([]);
    onClose();
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
            <p className="text-sm text-gray-500 mb-4">Upload your assets of choice to me.</p>
            <FileUpload
              label="Click to upload or drag and drop"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              multiple
              onFilesSelected={handleFilesSelected}
              className="mb-4"
            />
            <div className="space-y-2 mb-4">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border rounded-lg px-3 py-2 mb-1 bg-gray-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-7 text-center">
                      {att.file.type.includes("pdf") ? (
                        <span className="text-blue-600">📄</span>
                      ) : (
                        <span className="text-green-600">🖼️</span>
                      )}
                    </span>
                    <span className="truncate max-w-[160px] text-sm font-medium">
                      {att.file.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {Math.round(att.file.size / 1024 / 1024 * 10) / 10} MB
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${att.status === "done" ? "bg-emerald-500" : "bg-blue-400"}`}
                        style={{ width: `${att.progress}%` }}
                      />
                    </div>
                    {att.status !== "uploading" && (
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
              <Button onClick={handleUpload} disabled={attachments.length === 0 || uploading}>
                Upload
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
