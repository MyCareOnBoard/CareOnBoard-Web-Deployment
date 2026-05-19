import React from "react";
import { cn } from "@/lib/utils";
import type { ClientService } from "@/lib/api/clients";

import { WEEKLY_DIST_DISPLAY_CAP } from "../utils/sdrWeeklyDistribution";

export type WeeklyDistributionData = NonNullable<ClientService["sdrWeeklyDistribution"]>;

export { WEEKLY_DIST_DISPLAY_CAP };

type WeeklyDistributionInlineProps = {
  wd: WeeklyDistributionData;
  /** Optional Tailwind overrides; onboarding grid uses `col-span-full mt-2`. */
  className?: string;
  /** When outer section already labeled "Weekly distribution" (e.g. client Services tab). */
  hideTitle?: boolean;
};

function WeeklyDistributionInlineInner({ wd, className, hideTitle }: WeeklyDistributionInlineProps) {
  const hasLine = !!(wd.standardLine ?? "").trim();
  const rows = wd.rows ?? [];
  const cap = WEEKLY_DIST_DISPLAY_CAP;
  const visible = rows.slice(0, cap);
  const hidden = rows.length - visible.length;
  if (!hasLine && rows.length === 0) return null;

  const rowKeyPrefix = (
    i: number,
    r: { weekRange?: string; units?: string; hours?: string },
  ): string =>
    `${(r.weekRange ?? "").trim()}-${(r.units ?? "").trim()}-${(r.hours ?? "").trim()}-${i}`;

  return (
    <div
      className={cn(
        "rounded-[12px] border border-[#e1e3e8] bg-[#fafbfc]/80 p-4",
        className,
      )}
    >
      {!hideTitle ? (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081]">
          Weekly distribution
        </p>
      ) : null}
      {hasLine ? <p className="mb-2 text-[13px] text-[#10141a]">{wd.standardLine}</p> : null}
      {rows.length > 0 ? (
        <>
          <div className="max-h-56 overflow-auto rounded-[8px] border border-[#e1e3e8] bg-white">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="sticky top-0 bg-[#fafbfc] text-[#50565e]">
                <tr>
                  <th className="border-b border-[#e1e3e8] px-2 py-2 font-medium">Week range</th>
                  <th className="border-b border-[#e1e3e8] px-2 py-2 font-medium">Units</th>
                  <th className="border-b border-[#e1e3e8] px-2 py-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={rowKeyPrefix(i, r)} className="border-b border-[#f0f1f3] last:border-b-0">
                    <td className="px-2 py-1.5 text-[#10141a]">{r.weekRange ?? "—"}</td>
                    <td className="px-2 py-1.5 text-[#10141a]">{r.units ?? "—"}</td>
                    <td className="px-2 py-1.5 text-[#10141a]">{r.hours ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hidden > 0 ? (
            <p className="mt-2 text-[12px] text-[#808081]">
              {hidden} more row(s) in saved data (showing first {cap}).
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export const WeeklyDistributionInline = React.memo(WeeklyDistributionInlineInner);
