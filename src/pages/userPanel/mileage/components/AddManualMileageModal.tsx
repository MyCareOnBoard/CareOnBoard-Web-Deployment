import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mileageApi } from "@/lib/api/mileage";
import { useToast } from "@/hooks/use-toast";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import VoiceInputButton from "@/components/VoiceInputButton";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";

const NOTES_MAX = 1000;

interface AddManualMileageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddManualMileageModal({
  isOpen,
  onClose,
  onCreated,
}: AddManualMileageModalProps) {
  const { toast } = useToast();
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!purpose.trim()) {
      toast({
        title: "Required",
        description: "Please enter a purpose for this mileage.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await mileageApi.createManual({ purpose: purpose.trim(), notes: notes.trim() || undefined });
      toast({ title: "Mileage", description: "Manual mileage created — tap Start to begin tracking." });
      setPurpose("");
      setNotes("");
      onCreated();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create mileage";
      toast({ title: "Error", variant: "destructive", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPurpose("");
    setNotes("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <VoiceRecordingProvider pageTitle="Manual mileage">
      <VoiceInputButton className="z-[60]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-[24px] w-full max-w-[420px] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[#f0f0f0]">
          <div>
            <h2 className="text-[18px] font-semibold text-[#10141a]">Track New Mileage</h2>
            <p className="text-[13px] text-[#808081] mt-0.5">Log a trip you need to make</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="bg-[#eff2f3] rounded-full p-2 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4 text-[#10141a]" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 flex flex-col gap-4">
          {/* Purpose */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#10141a]">
              Purpose <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Pick up supplies from store"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 text-[14px] text-[#10141a] placeholder:text-[#b2b2b3] outline-none focus:border-[#00b4b8] transition-colors"
              autoComplete="off"
              maxLength={200}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#10141a]">Notes (optional)</label>
            <VoiceEnabledTextarea
              placeholder="Any additional details..."
              value={notes}
              onChange={(v) => setNotes(v.slice(0, NOTES_MAX))}
              onVoiceAccepted={(t) =>
                setNotes((prev) => {
                  const next = prev.trim() ? `${prev.trim()} ${t.trim()}` : t.trim();
                  return next.slice(0, NOTES_MAX);
                })
              }
              rows={3}
              fieldName="Manual mileage notes"
              pageTitle="Manual mileage"
              disabled={isSubmitting}
              className="min-h-[5.25rem] resize-none rounded-xl border border-[#cccccd] bg-white px-4 py-3 text-[14px] text-[#10141a] shadow-none placeholder:text-[#b2b2b3] focus-visible:border-[#00b4b8]"
            />
          </div>

          <p className="text-[12px] text-[#808081]">
            GPS tracking starts when you tap <strong>Start</strong> on the created entry.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 h-11 bg-transparent hover:bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb] rounded-xl text-[14px] font-medium shadow-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !purpose.trim()}
            className="flex-1 h-11 bg-[#00b4b8] hover:bg-[#009ba1] text-white rounded-xl text-[14px] font-medium shadow-none disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
    </VoiceRecordingProvider>
  );
}