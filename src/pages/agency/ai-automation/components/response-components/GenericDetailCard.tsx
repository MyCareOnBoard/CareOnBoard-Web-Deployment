import { str } from "./strValue";

interface GenericDetailField {
  label: string;
  value: string;
  badge?: boolean;
}

interface GenericDetailSection {
  heading?: string;
  fields: GenericDetailField[];
}

interface GenericDetailData {
  title: string;
  icon?: string;
  sections: GenericDetailSection[];
}

function badgeClasses(value: string) {
  const v = (value || "").toLowerCase();
  if (["active", "approved", "completed", "hired", "ready_for_official_hire", "confirmed"].some(k => v.includes(k)))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["pending", "conditional", "in_progress", "under_review"].some(k => v.includes(k)))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (["inactive", "rejected", "cancelled", "terminated", "suspended"].some(k => v.includes(k)))
    return "bg-red-50 text-red-600 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export default function GenericDetailCard({ data }: { data: unknown }) {
  const d = data as GenericDetailData;
  const sections = Array.isArray(d?.sections) ? d.sections : [];

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
        {d?.icon && <span className="text-[14px] leading-none">{d.icon}</span>}
        <span className="text-[13px] font-semibold text-[#10141a]">{d?.title || "Details"}</span>
      </div>

      {sections.map((section, si) => (
        <div key={si} className={si > 0 ? "border-t border-[#f3f4f6]" : ""}>
          {section.heading && (
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                {section.heading}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3">
            {section.fields.map((field, fi) => {
              const display = str(field.value);
              return (
              <div key={fi} className="min-w-0">
                <p className="text-[11px] text-[#9ca3af] mb-0.5">{field.label}</p>
                {field.badge ? (
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${badgeClasses(display)}`}>
                    {display || "—"}
                  </span>
                ) : (
                  <p className="text-[12px] text-[#374151] break-words">{display || "—"}</p>
                )}
              </div>
            );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
