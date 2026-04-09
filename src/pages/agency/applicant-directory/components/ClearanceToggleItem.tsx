import { Button } from "@/components/ui/button";

interface ClearanceToggleItemProps {
  name: string;
  progress: number;
  onApprove: () => void;
  onCancel: () => void;
}

export function ClearanceToggleItem({
  name,
  progress,
  onApprove,
  onCancel,
}: ClearanceToggleItemProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#e5e5e6] last:border-0">
      <span className="text-sm text-[#10141a] font-medium">{name}</span>
      <div className="flex items-center gap-3">
        <div className="w-[120px] bg-[#e5e5e6] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-[#0ea5e9] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Button
          onClick={onApprove}
          className="bg-[#10b981] hover:bg-[#059669] text-white rounded-full px-5 h-8 text-xs font-medium shadow-none"
        >
          Approve
        </Button>
        <Button
          onClick={onCancel}
          className="bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full px-5 h-8 text-xs font-medium shadow-none"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
