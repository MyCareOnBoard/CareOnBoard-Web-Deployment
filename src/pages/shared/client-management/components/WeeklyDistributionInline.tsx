import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClientService } from "@/lib/api/clients";

import {
  WEEKLY_DIST_DISPLAY_CAP,
  weeklyDistributionFingerprintFromWd,
} from "../utils/sdrWeeklyDistribution";

export type WeeklyDistributionData = NonNullable<ClientService["sdrWeeklyDistribution"]>;

export { WEEKLY_DIST_DISPLAY_CAP };

type WeeklyRowData = { weekRange?: string; units?: string; hours?: string };

type DraftRow = WeeklyRowData & { rowKey: string };

type WeeklyDistributionInlineProps = {
  wd: WeeklyDistributionData;
  className?: string;
  hideTitle?: boolean;
  hideStandardLine?: boolean;
  isEditing?: boolean;
  onChange?: (wd: WeeklyDistributionData) => void;
};

function newRowKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random());
}

function draftFromWd(wd: WeeklyDistributionData): DraftRow[] {
  return (wd.rows ?? []).slice(0, WEEKLY_DIST_DISPLAY_CAP).map((r, i) => ({
    rowKey: `${i}-${newRowKey()}`,
    weekRange: r.weekRange ?? "",
    units: r.units ?? "",
    hours: r.hours ?? "",
  }));
}

function wdFromDraft(standardLine: string, rows: DraftRow[]): WeeklyDistributionData {
  const sanitized = rows
    .map((r) => ({
      weekRange: (r.weekRange ?? "").trim(),
      units: (r.units ?? "").trim(),
      hours: (r.hours ?? "").trim(),
    }))
    .filter((r) => r.weekRange || r.units || r.hours);
  return {
    ...(standardLine.trim() ? { standardLine: standardLine.trim() } : {}),
    ...(sanitized.length ? { rows: sanitized } : {}),
  };
}

function WeeklyDistributionTruncationWarning({ droppedCount }: { droppedCount: number }) {
  if (droppedCount <= 0) return null;
  return (
    <p className="mt-2 text-[12px] text-amber-700">
      Only the first {WEEKLY_DIST_DISPLAY_CAP} rows are stored and editable; {droppedCount} extra
      row{droppedCount === 1 ? "" : "s"} {droppedCount === 1 ? "was" : "were"} dropped.
    </p>
  );
}

function weeklyDistributionDroppedCount(wd: WeeklyDistributionData): number {
  return Math.max(0, (wd.rows?.length ?? 0) - WEEKLY_DIST_DISPLAY_CAP);
}

const WeeklyDistributionRowInput = React.memo(function WeeklyDistributionRowInput({
  row,
  onChange,
  onRemove,
  onCommit,
}: {
  row: DraftRow;
  onChange: (rowKey: string, patch: Partial<WeeklyRowData>) => void;
  onRemove: (rowKey: string) => void;
  onCommit: () => void;
}) {
  return (
    <tr className="border-b border-[#f0f1f3] last:border-b-0">
      <td className="px-1 py-1">
        <Input
          value={row.weekRange}
          onChange={(e) => onChange(row.rowKey, { weekRange: e.target.value })}
          onBlur={onCommit}
          className="h-8 rounded-[8px] border-[#e1e3e8] bg-white text-[12px]"
          placeholder="Week range"
        />
      </td>
      <td className="px-1 py-1">
        <Input
          value={row.units}
          onChange={(e) => onChange(row.rowKey, { units: e.target.value })}
          onBlur={onCommit}
          className="h-8 rounded-[8px] border-[#e1e3e8] bg-white text-[12px]"
          placeholder="Units"
        />
      </td>
      <td className="px-1 py-1">
        <div className="flex items-center gap-1">
          <Input
            value={row.hours}
            onChange={(e) => onChange(row.rowKey, { hours: e.target.value })}
            onBlur={onCommit}
            className="h-8 min-w-0 flex-1 rounded-[8px] border-[#e1e3e8] bg-white text-[12px]"
            placeholder="Hours"
          />
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[#808081] hover:bg-[#f0f1f3] hover:text-[#10141a]"
            onClick={() => onRemove(row.rowKey)}
            aria-label="Remove row"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

function WeeklyDistributionInlineEditor({
  wd,
  className,
  hideTitle,
  hideStandardLine,
  onChange,
}: {
  wd: WeeklyDistributionData;
  className?: string;
  hideTitle?: boolean;
  hideStandardLine?: boolean;
  onChange: (wd: WeeklyDistributionData) => void;
}) {
  const fingerprint = useMemo(() => weeklyDistributionFingerprintFromWd(wd), [wd]);
  const [standardLineDraft, setStandardLineDraft] = useState(wd.standardLine ?? "");
  const [rowsDraft, setRowsDraft] = useState<DraftRow[]>(() => draftFromWd(wd));
  const droppedCount = useMemo(() => weeklyDistributionDroppedCount(wd), [fingerprint]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const standardLineRef = useRef(standardLineDraft);
  const rowsDraftRef = useRef(rowsDraft);
  onChangeRef.current = onChange;
  standardLineRef.current = standardLineDraft;
  rowsDraftRef.current = rowsDraft;

  const commitDraft = useCallback((line: string, rows: DraftRow[]) => {
    onChangeRef.current(wdFromDraft(line, rows));
  }, []);

  useEffect(() => {
    setStandardLineDraft(wd.standardLine ?? "");
    setRowsDraft(draftFromWd(wd));
  }, [fingerprint]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      commitDraft(standardLineRef.current, rowsDraftRef.current);
    };
  }, [commitDraft]);

  const scheduleCommit = useCallback(
    (line: string, rows: DraftRow[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => commitDraft(line, rows), 300);
    },
    [commitDraft],
  );

  const patchRow = useCallback(
    (rowKey: string, patch: Partial<WeeklyRowData>) => {
      setRowsDraft((prev) => {
        const next = prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r));
        rowsDraftRef.current = next;
        scheduleCommit(standardLineRef.current, next);
        return next;
      });
    },
    [scheduleCommit],
  );

  const removeRow = useCallback(
    (rowKey: string) => {
      setRowsDraft((prev) => {
        const next = prev.filter((r) => r.rowKey !== rowKey);
        rowsDraftRef.current = next;
        commitDraft(standardLineRef.current, next);
        return next;
      });
    },
    [commitDraft],
  );

  const flushCommit = useCallback(() => {
    commitDraft(standardLineRef.current, rowsDraftRef.current);
  }, [commitDraft]);

  const addRow = useCallback(() => {
    setRowsDraft((prev) => {
      if (prev.length >= WEEKLY_DIST_DISPLAY_CAP) return prev;
      const next = [...prev, { rowKey: newRowKey(), weekRange: "", units: "", hours: "" }];
      return next;
    });
  }, []);

  const hasLine = !!(standardLineDraft ?? "").trim();
  const hasRows = rowsDraft.length > 0;
  if (!hasLine && !hasRows && hideStandardLine) return null;

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
      {!hideStandardLine ? (
        <div className="mb-3 flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">Standard line</p>
          <Input
            value={standardLineDraft}
            onChange={(e) => {
              const v = e.target.value;
              setStandardLineDraft(v);
              standardLineRef.current = v;
              scheduleCommit(v, rowsDraftRef.current);
            }}
            onBlur={flushCommit}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white text-[13px]"
            placeholder="40 @ 15 Min / Weekly"
          />
        </div>
      ) : null}
      {hasRows ? (
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
              {rowsDraft.map((r) => (
                <WeeklyDistributionRowInput
                  key={r.rowKey}
                  row={r}
                  onChange={patchRow}
                  onRemove={removeRow}
                  onCommit={flushCommit}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[13px] text-[#808081]">No weekly rows yet.</p>
      )}
      {rowsDraft.length < WEEKLY_DIST_DISPLAY_CAP ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
          onClick={addRow}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add row
        </Button>
      ) : null}
      <WeeklyDistributionTruncationWarning droppedCount={droppedCount} />
    </div>
  );
}

function WeeklyDistributionInlineView({
  wd,
  className,
  hideTitle,
}: {
  wd: WeeklyDistributionData;
  className?: string;
  hideTitle?: boolean;
}) {
  const hasLine = !!(wd.standardLine ?? "").trim();
  const rows = wd.rows ?? [];
  const cap = WEEKLY_DIST_DISPLAY_CAP;
  const visible = rows.slice(0, cap);
  const droppedCount = weeklyDistributionDroppedCount(wd);
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
          <WeeklyDistributionTruncationWarning droppedCount={droppedCount} />
        </>
      ) : null}
    </div>
  );
}

function WeeklyDistributionInlineInner({
  wd,
  className,
  hideTitle,
  hideStandardLine,
  isEditing,
  onChange,
}: WeeklyDistributionInlineProps) {
  if (isEditing && onChange) {
    return (
      <WeeklyDistributionInlineEditor
        wd={wd}
        className={className}
        hideTitle={hideTitle}
        hideStandardLine={hideStandardLine}
        onChange={onChange}
      />
    );
  }
  return <WeeklyDistributionInlineView wd={wd} className={className} hideTitle={hideTitle} />;
}

export const WeeklyDistributionInline = React.memo(WeeklyDistributionInlineInner);
