import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, FileText, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type DSPSuggestion } from "../api";
import type { LocalMessage } from "../types";
import { ComponentRenderer } from "./response-components";

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
        <div className="max-w-[85%] sm:max-w-[80%]">
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              {msg.attachments.map((att, idx) =>
                att.type === "image" ? (
                  <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={att.url}
                      alt={att.name}
                      className="max-w-[200px] sm:max-w-[280px] rounded-[14px] object-cover border border-[#e5e7eb]"
                    />
                  </a>
                ) : (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] text-[#111827] hover:border-[#00b4b8] transition"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#6b7280]" />
                    <span className="max-w-[140px] truncate">{att.name}</span>
                  </a>
                )
              )}
            </div>
          )}
          {msg.content && (
            <div className="rounded-[18px] sm:rounded-[24px] rounded-tr-[4px] sm:rounded-tr-[6px] bg-white px-4 sm:px-5 py-3 sm:py-4 text-[13px] sm:text-[14px] leading-relaxed text-black break-words">
              {msg.content}
            </div>
          )}
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
        <div className="rounded-[18px] sm:rounded-[24px] rounded-tl-[4px] sm:rounded-tl-[6px] bg-[#f3f4f6] px-4 sm:px-5 py-3 sm:py-4 text-[13px] sm:text-[14px] leading-relaxed text-[#10141a]">
          {msg.isLoading ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-bounce rounded-full bg-[#00b4b8]" />
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-bounce rounded-full bg-[#00b4b8] delay-150" />
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-bounce rounded-full bg-[#00b4b8] delay-300" />
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto mt-1">
                    <table className="w-full text-[12px] border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead>{children}</thead>,
                th: ({ children }) => (
                  <th className="border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-left font-semibold text-[#374151]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-[#e5e7eb] px-3 py-1.5 text-[#374151]">{children}</td>
                ),
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[#10141a]">{children}</strong>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-[#e5e7eb] px-1 py-0.5 text-[11px] font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>

        {!msg.isLoading && msg.components && msg.components.length > 0 && (
          <div className="mt-3 space-y-3">
            {msg.components.map((comp, i) => (
              <ComponentRenderer key={i} component={comp} />
            ))}
          </div>
        )}

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
