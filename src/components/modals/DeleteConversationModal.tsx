import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";

interface DeleteConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteConversationModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteConversationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[440px] bg-white rounded-[20px] shadow-2xl overflow-hidden">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#fee2e2] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
              </div>
              <h2 className="text-[18px] font-bold text-[#10141a]">
                Delete Conversation
              </h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-[#10141a]" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <p className="text-[14px] text-[#6b7280] mb-6 leading-relaxed">
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
            </p>

            {/* Footer Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 h-12 bg-white hover:bg-[#f5f5f5] text-[#10141a] border border-[#e5e5e6] rounded-full text-[15px] font-medium transition-colors shadow-none"
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 h-12 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full text-[15px] font-medium transition-colors shadow-none disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}