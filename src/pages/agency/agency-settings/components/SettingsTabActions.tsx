import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { settingsActionBtnClass } from "./settingsCardStyles";

interface SettingsTabActionsProps {
  hasChanges: boolean;
  saving: boolean;
  onCancel: () => void;
  saveLabel?: string;
  className?: string;
}

export default function SettingsTabActions({
  hasChanges,
  saving,
  onCancel,
  saveLabel = "Save Changes",
  className,
}: SettingsTabActionsProps) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col justify-end gap-2 border-t border-[#eef0f2] pt-5 sm:flex-row",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        className={cn(
          settingsActionBtnClass,
          "border border-[#e8eaed] bg-white/90 text-[#525253] hover:border-[#d8dadd] hover:bg-white hover:text-[#10141a]",
        )}
        onClick={onCancel}
        disabled={saving || !hasChanges}
      >
        Cancel
      </Button>

      <Button
        type="submit"
        className={cn(
          settingsActionBtnClass,
          "gap-1.5 border border-[#00b4b8] bg-[#00b4b8] text-white hover:bg-[#00a0a4] hover:text-white",
        )}
        disabled={saving || !hasChanges}
      >
        {saving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving...
          </>
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  );
}
