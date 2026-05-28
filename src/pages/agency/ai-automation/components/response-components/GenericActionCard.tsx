import { CheckCircle, XCircle } from "lucide-react";

interface GenericActionDetail {
  label: string;
  value: string;
}

interface GenericActionData {
  status: "success" | "error";
  title: string;
  description?: string;
  details?: GenericActionDetail[];
}

import { str } from "./strValue";

export default function GenericActionCard({ data }: { data: unknown }) {
  const d = data as GenericActionData;
  const isSuccess = d?.status !== "error";
  const hasBody = d?.description || (Array.isArray(d?.details) && d.details.length > 0);

  return (
    <div className={`rounded-[18px] border overflow-hidden ${isSuccess ? "border-emerald-200" : "border-red-200"}`}>
      <div className={`flex items-center gap-2.5 px-4 py-3 ${isSuccess ? "bg-emerald-50" : "bg-red-50"}`}>
        {isSuccess ? (
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
        )}
        <span className={`text-[13px] font-semibold ${isSuccess ? "text-emerald-800" : "text-red-700"}`}>
          {d?.title || "Action Completed"}
        </span>
      </div>

      {hasBody && (
        <div className="px-4 py-3 bg-white">
          {d.description && (
            <p className="text-[12px] text-[#6b7280] mb-2 last:mb-0">{d.description}</p>
          )}
          {Array.isArray(d.details) && d.details.length > 0 && (
            <div className="space-y-1 mt-1">
              {d.details.map((detail, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-[11px] text-[#9ca3af] shrink-0 min-w-[64px]">{str(detail.label)}</span>
                  <span className="text-[12px] text-[#374151]">{str(detail.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
