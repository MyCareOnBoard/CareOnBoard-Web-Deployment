import { memo, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  settingsFieldDescriptionClass,
  settingsFieldLabelClass,
} from "./settingsCardStyles";

export type SettingsFormFieldRowProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  /** Toggle rows: narrow control column, switch aligned to the far right */
  switchRow?: boolean;
};

export const SettingsFormFieldRow = memo(function SettingsFormFieldRow({
  title,
  description,
  children,
  className,
  fullWidth = false,
  switchRow = false,
}: SettingsFormFieldRowProps) {
  return (
    <div
      className={cn(
        "grid gap-3 py-4 first:pt-0 last:pb-0 sm:gap-6 sm:py-5",
        switchRow ? "sm:grid-cols-[1fr_auto] sm:items-center" : "sm:grid-cols-2",
        fullWidth && "sm:col-span-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p className={settingsFieldLabelClass}>{title}</p>
        {description ? <p className={settingsFieldDescriptionClass}>{description}</p> : null}
      </div>
      <div
        className={cn(
          "min-w-0 w-full",
          switchRow && "flex items-center justify-end",
        )}
      >
        {children}
      </div>
    </div>
  );
});

/** @deprecated Use SettingsFormFieldRow */
export default SettingsFormFieldRow;

/** Backward-compatible alias */
export { SettingsFormFieldRow as SettingsSectionRow };
