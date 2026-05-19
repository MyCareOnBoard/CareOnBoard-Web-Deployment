import { cn } from "@/lib/utils";
import type { ProfileField } from "../tabs/profileTabViewModel";

export function ProfileFieldRow({ field }: { field: ProfileField }) {
  return (
    <div
      className={cn(
        "min-w-0 border-b border-[#eef0f2] py-3 last:border-b-0 sm:border-b-0 sm:py-0",
        field.fullWidth && "sm:col-span-2",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#808081]">
        {field.label}
      </p>
      <p
        className={cn(
          "mt-1 text-[14px] font-medium leading-snug text-[#10141a] sm:text-[15px] sm:leading-relaxed",
          field.muted && "font-normal text-[#a3a3a4]",
          field.multiline && "whitespace-pre-wrap break-words",
        )}
      >
        {field.value}
      </p>
    </div>
  );
}
