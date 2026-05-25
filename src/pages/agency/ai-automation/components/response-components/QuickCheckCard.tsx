import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickCheckAction {
  label: string;
  onClick?: () => void;
  message?: string;
  variant?: "primary" | "secondary";
}

interface QuickCheckData {
  title?: string;
  question?: string;
  description?: string;
  action?: QuickCheckAction;
  helpText?: string;
}

export default function QuickCheckCard({
  data,
  onSendMessage,
}: {
  data: unknown;
  onSendMessage?: (text: string) => void;
}) {
  const cardData = data as QuickCheckData;

  const handleActionClick = () => {
    if (cardData.action?.message && onSendMessage) {
      onSendMessage(cardData.action.message);
    } else {
      cardData.action?.onClick?.();
    }
  };

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      {(cardData.title || cardData.question) && (
        <div className="px-4 py-3.5 border-b border-[#e5e7eb] bg-white">
          <p className="text-[13px] font-semibold text-[#10141a]">
            {cardData.title || cardData.question}
          </p>
          {cardData.helpText && (
            <p className="text-[12px] text-[#6b7280] mt-1">{cardData.helpText}</p>
          )}
        </div>
      )}

      <div className="px-4 py-4">
        {cardData.description && (
          <p className="text-[13px] text-[#6b7280] mb-4">{cardData.description}</p>
        )}

        {cardData.action && (
          <Button
            onClick={handleActionClick}
            className={`w-full sm:w-auto gap-2 ${
              cardData.action.variant === "secondary"
                ? "bg-white border border-[#e5e7eb] text-[#10141a] hover:bg-[#f9fafb]"
                : "bg-[#00b4b8] text-white hover:bg-[#0d9fa7]"
            }`}
          >
            {cardData.action.label}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
