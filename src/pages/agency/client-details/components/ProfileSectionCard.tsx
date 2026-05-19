import { memo } from "react";
import { cn } from "@/lib/utils";
import type {
  ProfileInsuranceRow,
  ProfileMedicationRow,
  ProfileSection,
} from "../tabs/profileTabViewModel";
import { ProfileFieldRow } from "./ProfileFieldRow";

const SECTION_LAYOUT: Record<string, string> = {
  contact: "lg:col-span-2",
  identifiers: "lg:col-span-1",
  insurance: "lg:col-span-2",
  "medical-conditions": "lg:col-span-1",
  allergies: "lg:col-span-1",
  medications: "lg:col-span-2",
  outcomes: "lg:col-span-2",
  "assigned-dsps": "lg:col-span-1",
  guardian: "lg:col-span-1",
};

const InsuranceTable = memo(function InsuranceTable({
  rows,
  className,
}: {
  rows: ProfileInsuranceRow[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#e8eaed] bg-[#fafbfc]",
        className ?? "mt-4",
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#e8eaed] bg-white">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Type
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Name
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                ID / group
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Case manager
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Contact
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef0f2]">
            {rows.map((row) => (
              <tr
                key={`${row.type}-${row.name}-${row.idGroup}`}
                className="bg-white/80"
              >
                <td className="px-4 py-2.5 text-[#10141a]">{row.type}</td>
                <td className="px-4 py-2.5 text-[#10141a]">{row.name}</td>
                <td className="px-4 py-2.5 text-[#10141a]">{row.idGroup}</td>
                <td className="px-4 py-2.5 text-[#10141a]">{row.caseManager}</td>
                <td className="px-4 py-2.5 text-[#10141a]">{row.contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const StringListBlock = memo(function StringListBlock({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((text, i) => (
        <li
          key={`${i}-${text}`}
          className="flex gap-3 text-[14px] leading-relaxed text-[#10141a] sm:text-[15px]"
        >
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00b4b8]"
            aria-hidden
          />
          <span className="min-w-0 flex-1 break-words">{text}</span>
        </li>
      ))}
    </ul>
  );
});

const MedicationsTable = memo(function MedicationsTable({
  rows,
  className,
}: {
  rows: ProfileMedicationRow[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#e8eaed] bg-[#fafbfc]",
        className ?? "mt-0",
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#e8eaed] bg-white">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Medication
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Dosage
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Frequency
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Self-administer
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef0f2]">
            {rows.map((row) => (
              <tr
                key={`${row.name}-${row.dosage}-${row.frequency}`}
                className="bg-white/80"
              >
                <td className="px-4 py-2.5 text-[#10141a]">{row.name}</td>
                <td className="px-4 py-2.5 text-[#10141a]">{row.dosage}</td>
                <td className="px-4 py-2.5 text-[#10141a]">{row.frequency}</td>
                <td className="px-4 py-2.5 text-[#10141a]">{row.selfAdminister}</td>
                <td className="px-4 py-2.5 text-[#10141a]">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const OutcomesBlock = memo(function OutcomesBlock({
  statements,
  moreCount,
  narrative,
}: {
  statements: string[];
  moreCount: number;
  narrative?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {statements.length > 0 ? (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#808081]">
            Outcome statements
            <span className="ml-1.5 font-normal normal-case text-[#a3a3a4]">
              ({statements.length + moreCount} total)
            </span>
          </p>
          <ul className="space-y-2.5">
            {statements.map((text, i) => (
              <li
                key={`${i}-${text.slice(0, 48)}`}
                className="flex gap-3 text-[14px] leading-relaxed text-[#10141a] sm:text-[15px]"
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00b4b8]/12 text-[12px] font-semibold text-[#008f92]"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 break-words pt-0.5">{text}</span>
              </li>
            ))}
          </ul>
          {moreCount > 0 ? (
            <p className="mt-3 text-[13px] font-medium text-[#808081]">
              +{moreCount} more outcome{moreCount === 1 ? "" : "s"} on the Services tab
            </p>
          ) : null}
        </div>
      ) : null}
      {narrative ? (
        <div className="rounded-xl border border-[#e8eaed] bg-[#fafbfc] px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#808081]">
            Goals narrative
          </p>
          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#10141a] sm:text-[15px]">
            {narrative}
          </p>
        </div>
      ) : null}
    </div>
  );
});

export const ProfileSectionCard = memo(function ProfileSectionCard({
  section,
}: {
  section: ProfileSection;
}) {
  const hasFields = section.fields.length > 0;
  const hasInsurance = (section.insuranceRows?.length ?? 0) > 0;
  const hasListItems = (section.listItems?.length ?? 0) > 0;
  const hasMedications = (section.medicationRows?.length ?? 0) > 0;
  const hasOutcomes =
    (section.outcomeStatements?.length ?? 0) > 0 || !!(section.outcomeNarrative ?? "").trim();
  const hasContent = hasFields || hasInsurance || hasListItems || hasMedications || hasOutcomes;

  const layoutClass = SECTION_LAYOUT[section.id] ?? "";

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-[#e8eaed]/80 bg-white shadow-[0_1px_3px_rgba(16,20,26,0.06),0_8px_24px_rgba(16,20,26,0.04)]",
        "[content-visibility:auto] [contain-intrinsic-size:auto_320px]",
        layoutClass,
      )}
    >
      <header className="border-b border-[#eef0f2] px-5 py-4 sm:px-6">
        <h2 className="text-[17px] font-semibold tracking-tight text-[#10141a] sm:text-lg">
          {section.title}
        </h2>
        {section.subtitle ? (
          <p className="mt-0.5 text-[13px] leading-snug text-[#808081]">{section.subtitle}</p>
        ) : null}
      </header>

      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {!hasContent && section.emptyMessage ? (
          <p className="text-[14px] text-[#a3a3a4]">{section.emptyMessage}</p>
        ) : null}

        {hasListItems && section.listItems ? <StringListBlock items={section.listItems} /> : null}

        {hasMedications && section.medicationRows ? (
          <MedicationsTable rows={section.medicationRows} />
        ) : null}

        {section.id === "outcomes" && hasOutcomes ? (
          <OutcomesBlock
            statements={section.outcomeStatements ?? []}
            moreCount={section.outcomeMoreCount ?? 0}
            narrative={section.outcomeNarrative}
          />
        ) : null}

        {hasFields && section.id !== "outcomes" ? (
          <div
            className={cn(
              "grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2 sm:gap-y-5",
              hasInsurance && "mb-0",
            )}
          >
            {section.fields.map((f) => (
              <ProfileFieldRow key={`${section.id}-${f.label}`} field={f} />
            ))}
          </div>
        ) : null}

        {hasInsurance && section.insuranceRows ? (
          <InsuranceTable
            rows={section.insuranceRows}
            className={section.id === "insurance" ? "mt-0" : undefined}
          />
        ) : null}
      </div>
    </section>
  );
});
