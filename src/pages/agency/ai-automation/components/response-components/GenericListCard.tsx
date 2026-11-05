interface GenericListRow {
  primary: string;
  secondary?: string;
  meta?: string[];
  status?: string;
  statusColor?: "green" | "amber" | "red" | "blue" | "gray";
  link?: RecordLink;
}

interface GenericListData extends ListMeta {
  title: string;
  icon?: string;
  emptyMessage?: string;
  rows: GenericListRow[];
}

function statusClasses(color?: string) {
  switch (color) {
    case "green": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "amber": return "bg-amber-50 text-amber-700 border-amber-200";
    case "red": return "bg-red-50 text-red-600 border-red-200";
    case "blue": return "bg-blue-50 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

import { str } from "./strValue";
import ListPager, { type ListMeta, listCountLabel, readListMeta, usePagedRows } from "./ListPager";
import { type RecordLink, RecordRow, recordHref } from "./recordLink";

export default function GenericListCard({ data, onSendMessage }: { data: unknown; onSendMessage?: (text: string) => void }) {
  const d = data as GenericListData;
  const rows = Array.isArray(d?.rows) ? d.rows : [];
  const meta = readListMeta(d);
  const paging = usePagedRows(rows);

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f3fafa]">
        {d?.icon && <span className="text-[14px] leading-none">{d.icon}</span>}
        <span className="text-[13px] font-semibold text-[#10141a]">{d?.title || "Results"}</span>
        <span className="ml-auto text-[12px] text-[#6b7280]">{listCountLabel(rows.length, meta)}</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-3 text-[13px] italic text-[#6b7280]">
          {d?.emptyMessage || "No results found."}
        </p>
      ) : (
        <div className="divide-y divide-[#f3f4f6]">
          {paging.pageRows.map((row, i) => (
            <RecordRow key={paging.start + i} href={recordHref(row.link)} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#10141a] truncate">{str(row.primary)}</p>
                {row.secondary != null && (
                  <p className="text-[11px] text-[#6b7280] truncate mt-0.5">{str(row.secondary)}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {row.meta?.filter(Boolean).map((m, mi) => (
                  <span key={mi} className="text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                    {m}
                  </span>
                ))}
                {row.status && (
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusClasses(row.statusColor)}`}>
                    {row.status}
                  </span>
                )}
              </div>
            </RecordRow>
          ))}
        </div>
      )}
      <ListPager loaded={rows.length} meta={meta} paging={paging} noun={d?.title || "results"} onSendMessage={onSendMessage} />
    </div>
  );
}
