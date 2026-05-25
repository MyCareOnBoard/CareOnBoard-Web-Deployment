import { AlertCircle, ChevronRight } from "lucide-react";

interface ActionOption {
  label: string;
  onClick?: () => void;
}

interface NoCaregiversData {
  title?: string;
  description?: string;
  actionTitle?: string;
  actions?: ActionOption[];
}

export default function NoCaregiversCard({ data }: { data: unknown }) {
  const cardData = data as NoCaregiversData;

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
        <AlertCircle className="h-4 w-4 text-[#dc2626]" />
        <span className="text-[13px] font-semibold text-[#10141a]">
          {cardData.title || "No caregivers"}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {cardData.description && (
          <p className="text-[13px] text-[#6b7280] mb-4">{cardData.description}</p>
        )}

        {/* Actions Section */}
        {cardData.actions && cardData.actions.length > 0 && (
          <div className="space-y-3">
            {cardData.actionTitle && (
              <p className="text-[12px] font-semibold text-[#10141a]">{cardData.actionTitle}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {cardData.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#00b4b8] hover:text-[#0d9fa7] transition hover:underline"
                >
                  {action.label}
                  <ChevronRight className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
