import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Sparkles } from "lucide-react";
import { type DSPSuggestion } from "../api";
import type { LocalMessage } from "../types";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function reliabilityColor(reliability: string) {
  if (reliability === "High") return "text-emerald-600";
  if (reliability === "Medium") return "text-amber-500";
  return "text-red-500";
}

function DSPCard({ suggestion, onAssign }: { suggestion: DSPSuggestion; onAssign?: (suggestion: DSPSuggestion) => void }) {
  return (
    <button
      type="button"
      className="flex flex-col gap-1.5 sm:gap-2 rounded-[16px] sm:rounded-2xl border border-[#e5e7eb] bg-white p-2.5 sm:p-3 text-left hover:border-[#00b4b8] hover:shadow-sm transition"
      onClick={() => onAssign?.(suggestion)}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 text-[10px] sm:text-xs">
          <AvatarImage src="" />
          <AvatarFallback className="bg-[#e0f7f7] text-[#00b4b8] font-semibold text-[10px] sm:text-[11px]">
            {getInitials(suggestion.fullName)}
          </AvatarFallback>
        </Avatar>
        <p className="text-[12px] sm:text-[13px] font-semibold text-[#10141a] truncate">
          {suggestion.fullName}
        </p>
      </div>
      <p className="text-[11px] sm:text-[12px] text-[#6b7280]">
        <span className="font-medium text-[#10141a]">Reliability:</span>{" "}
        <span className={reliabilityColor(suggestion.reliability)}>
          {suggestion.reliability}
        </span>
      </p>
      <p className="text-[11px] sm:text-[12px] text-[#6b7280]">
        <span className="font-medium text-[#10141a]">Last shift:</span> {suggestion.lastShift}
      </p>
    </button>
  );
}

export function MessageBubble({
  msg,
  onAssignDSP,
}: {
  msg: LocalMessage;
  onAssignDSP?: (suggestion: DSPSuggestion, message: LocalMessage) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[80%] rounded-[18px] sm:rounded-[24px] rounded-tr-[4px] sm:rounded-tr-[6px] bg-white px-4 sm:px-5 py-3 sm:py-4 text-[13px] sm:text-[14px] leading-relaxed sm:leading-relaxed text-black break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 sm:gap-3 items-start">
      <div className="mt-1 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[14px] sm:rounded-2xl bg-[#e0f7f7] flex-shrink-0">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#00b4b8]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-[18px] sm:rounded-[24px] rounded-tl-[4px] sm:rounded-tl-[6px] bg-[#f3f4f6] px-4 sm:px-5 py-3 sm:py-4 text-[13px] sm:text-[14px] leading-relaxed text-[#10141a] whitespace-pre-wrap">
          {msg.isLoading ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-bounce rounded-full bg-[#00b4b8]" />
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-bounce rounded-full bg-[#00b4b8] delay-150" />
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-bounce rounded-full bg-[#00b4b8] delay-300" />
            </div>
          ) : (
            msg.content
          )}
        </div>

        {!msg.isLoading && msg.actions && msg.actions.length > 0 && (
          <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-2">
            {msg.actions.map((action, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 sm:px-3 py-1 text-[11px] sm:text-[12px] text-emerald-700"
              >
                <CheckCircle className="w-3 h-3" />
                {action.outcome}
              </span>
            ))}
          </div>
        )}

        {!msg.isLoading && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
            {msg.suggestions.map((suggestion) => (
              <DSPCard
                key={suggestion.employeeId}
                suggestion={suggestion}
                onAssign={(suggestion) => onAssignDSP?.(suggestion, msg)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
