import { BarChart3 } from "lucide-react";
import { str } from "./strValue";

interface SheetSummary {
  name: string;
  rows: number;
}

interface ReportPreviewData {
  title: string;
  period?: { from: string; to: string } | null;
  summary?: SheetSummary[];
  sheetName?: string | null;
  columns?: string[];
  rows?: unknown[][];
  rowCount?: number;
  truncated?: boolean;
}

/** Columns shown before the table is cut off; a roster is far wider than the chat. */
const MAX_COLUMNS = 5;

/**
 * Preview of a generated report.
 *
 * Deliberately partial: it shows the per-sheet counts, which are the figures worth
 * reading, and a short sample of the largest sheet. The full table is never sent to
 * the chat — it leaves as a downloadable artifact.
 *
 * There is no shared data-table component in this codebase, so this follows the
 * grid-template convention used by the staff-tasks page.
 */
export default function ReportPreviewCard({ data }: { data: unknown }) {
  const d = data as ReportPreviewData;
  const summary = Array.isArray(d?.summary) ? d.summary : [];
  const allColumns = Array.isArray(d?.columns) ? d.columns : [];
  const columns = allColumns.slice(0, MAX_COLUMNS);
  const rows = Array.isArray(d?.rows) ? d.rows : [];
  const hiddenColumns = allColumns.length - columns.length;

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f3fafa]">
        <BarChart3 className="h-4 w-4 shrink-0 text-[#00b4b8]" />
        <span className="text-[13px] font-semibold text-[#10141a] truncate">
          {d?.title || "Report"}
        </span>
        {d?.period && (
          <span className="ml-auto shrink-0 text-[11px] text-[#6b7280]">
            {d.period.from} – {d.period.to}
          </span>
        )}
      </div>

      {summary.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-[#f3f4f6]">
          {summary.map((sheet) => (
            <span
              key={sheet.name}
              className="inline-flex items-center gap-1 rounded-full bg-[#f3fafa] px-2.5 py-1 text-[11px] text-[#0f766e]"
            >
              <span className="font-medium">{sheet.name}</span>
              <span className="text-[#5eead4]">·</span>
              <span>{sheet.rows}</span>
            </span>
          ))}
        </div>
      )}

      {columns.length > 0 && rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr className="bg-[#fafafa]">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-3 py-2 text-left text-[11px] font-semibold text-[#6b7280] whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-[#f3f4f6]">
                  {columns.map((_, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="px-3 py-2 text-[12px] text-[#10141a] whitespace-nowrap max-w-[180px] truncate"
                    >
                      {str(row?.[columnIndex] as string)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-3 text-[13px] italic text-[#6b7280]">
          No rows matched this report.
        </p>
      )}

      {(d?.truncated || hiddenColumns > 0) && (
        <p className="px-4 py-2.5 text-[11px] text-[#6b7280] border-t border-[#f3f4f6]">
          {d?.sheetName ? `Showing ${d.sheetName}: ` : ""}
          {rows.length} of {d?.rowCount ?? rows.length} rows
          {hiddenColumns > 0 ? `, ${columns.length} of ${allColumns.length} columns` : ""}
          . Download the report for the full detail.
        </p>
      )}
    </div>
  );
}
