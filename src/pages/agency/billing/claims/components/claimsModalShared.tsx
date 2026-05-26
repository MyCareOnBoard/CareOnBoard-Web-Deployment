import { cn } from "@/lib/utils";
import {
  CLAIM_REPORT_FIELD_LABEL,
  CLAIM_REPORT_ROW_LABEL,
  CLAIM_REPORT_SECTION_TITLE,
  CLAIM_REPORT_SECTION_TITLE_MUTED,
} from "./claimsModalStyles";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[14px] font-semibold text-[#10141a]">{children}</p>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-[14px] font-medium text-[#10141a]">{children}</label>
  );
}

export function MicroSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[13px] font-medium text-[#808081]">{children}</p>
  );
}

export function ReportSectionTitle({
  children,
  className,
  variant = "emphasis",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "muted" | "emphasis";
}) {
  return (
    <p
      className={cn(
        variant === "muted" ? CLAIM_REPORT_SECTION_TITLE_MUTED : CLAIM_REPORT_SECTION_TITLE,
        className
      )}
    >
      {children}
    </p>
  );
}

export function ReportFieldLabel({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn(CLAIM_REPORT_FIELD_LABEL, className)}>
      {children}
    </label>
  );
}

export function ReportRowLabel({ children }: { children: React.ReactNode }) {
  return <span className={CLAIM_REPORT_ROW_LABEL}>{children}</span>;
}

type BioRowProps = {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
};

export function BioRow({ label, value, emphasis = true }: BioRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className={cn("shrink-0 text-[12px]", CLAIM_REPORT_ROW_LABEL)}>{label}</span>
      <span className={emphasis ? "cr-value-emphasis" : "cr-value"}>{value}</span>
    </div>
  );
}
