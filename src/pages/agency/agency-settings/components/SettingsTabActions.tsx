import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SettingsTabActionsProps {
  hasChanges: boolean;
  saving: boolean;
  onCancel: () => void;
  saveLabel?: string;
}

export default function SettingsTabActions({
  hasChanges,
  saving,
  onCancel,
  saveLabel = "Save Changes",
}: SettingsTabActionsProps) {
  return (
    <div className="flex flex-col justify-end gap-3 pt-6 border-t border-gray-200 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        className="border-[#00b3ad] text-[#00b3ad] hover:bg-[#00b3ad]/10 rounded-full"
        onClick={onCancel}
        disabled={saving || !hasChanges}
      >
        Cancel
      </Button>

      <Button
        type="submit"
        className="bg-[#00b3ad] text-white font-medium rounded-full hover:bg-[#00a39f] transition disabled:opacity-50"
        disabled={saving || !hasChanges}
      >
        {saving ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </span>
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  );
}
