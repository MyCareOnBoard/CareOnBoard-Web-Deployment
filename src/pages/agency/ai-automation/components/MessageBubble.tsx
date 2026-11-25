import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, FileText } from "lucide-react";
import { AiInsightsIcon } from "@/components/agency/AgencyIcons";
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
  if (reliability === "High") return "text-[#0a6b38] dark:text-[#7fe0a8]";
  if (reliability === "Medium") return "text-[#7a5800] dark:text-[#f0cf6b]";
  return "text-[#b4232b] dark:text-[#ff9d94]";
}

function DSPCard({ suggestion, onAssign }: { suggestion: DSPSuggestion; onAssign?: (suggestion: DSPSuggestion) => void }) {
  return (
    <button
      type="button"
      className="flex cursor-pointer flex-col gap-1.5 rounded-[12px] border border-[#e4e7ea] bg-white p-3 text-left transition-colors hover:border-[#12b5b0] hover:bg-[#f8fbfb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      onClick={() => onAssign?.(suggestion)}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 text-xs">
          <AvatarImage src="" />
          <AvatarFallback className="bg-[#e6f4f4] text-[12px] font-semibold text-[#007679] dark:bg-[#12b5b0]/15 dark:text-[#7fd3d3]">
            {getInitials(suggestion.fullName)}
          </AvatarFallback>
        </Avatar>
        <p className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
          {suggestion.fullName}
        </p>
      </div>
      <p className="text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">
        <span className="font-medium text-[#10141a] dark:text-[#f4f6f7]">Reliability:</span>{" "}
        <span className={reliabilityColor(suggestion.reliability)}>
          {suggestion.reliability}
        </span>
      </p>
      <p className="text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">
        <span className="font-medium text-[#10141a] dark:text-[#f4f6f7]">Last shift:</span> {suggestion.lastShift}
      </p>
    </button>
  );
}

export function MessageBubble({
  msg,
  onAssignDSP,
  onSendMessage,
}: {
  msg: LocalMessage;
  onAssignDSP?: (suggestion: DSPSuggestion, message: LocalMessage) => void;
  onSendMessage?: (text: string) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[80%]">
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 mb-2">
              {msg.attachments.map((att, idx) =>
                att.type === "image" ? (
                  <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={att.url}
                      alt={att.name}
                      className="max-w-[200px] rounded-[12px] border border-[#e4e7ea] object-cover sm:max-w-[280px] dark:border-white/10"
                    />
                  </a>
                ) : (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e4e7ea] bg-white px-3 py-1.5 text-[12px] text-[#10141a] transition-colors hover:border-[#12b5b0] dark:border-white/10 dark:bg-white/5 dark:text-[#f4f6f7]"
                  >
                    <FileText aria-hidden="true" className="h-3.5 w-3.5 text-[#4b535b]" />
                    <span className="max-w-[140px] truncate">{att.name}</span>
                  </a>
                )
              )}
            </div>
          )}
          {msg.content && (
            <div className="break-words rounded-[12px] bg-[#003839] px-4 py-2.5 text-[14px] leading-relaxed text-white dark:bg-[#0f7e7d]">
              {msg.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#007679] text-white dark:bg-[#0f7e7d]">
        <AiInsightsIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Loading state */}
        {msg.isLoading && (
          <div role="status" aria-label="Thinking" className="py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#12b5b0]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#12b5b0] delay-150" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#12b5b0] delay-300" />
            </div>
          </div>
        )}

        {/* Text content card */}
        {!msg.isLoading && msg.content && (
          <div>
            <div className="pt-1 text-[14px] leading-relaxed text-[#10141a] dark:text-[#e6eaec]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="mt-2 overflow-x-auto rounded-[12px] border border-[#e4e7ea] dark:border-white/10">
                      <table className="w-full border-collapse text-[13px]">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead>{children}</thead>,
                  th: ({ children }) => (
                    <th className="border-b border-[#eceef0] bg-[#f8f9fa] px-3 py-2 text-left font-normal text-[#4b535b] dark:border-white/10 dark:bg-white/5 dark:text-[#9aa4a8]">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-[#eceef0] px-3 py-2 text-[#10141a] dark:border-white/10 dark:text-[#e6eaec]">{children}</td>
                  ),
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[#10141a] dark:text-[#f4f6f7]">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic text-[#4b535b] dark:text-[#9aa4a8]">{children}</em>,
                  code: ({ children }) => (
                    <code className="rounded bg-[#f4f5f6] px-1.5 py-0.5 font-mono text-[12px] text-[#7a5800] dark:bg-white/10 dark:text-[#f0cf6b]">
                      {children}
                    </code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-2 border-l-4 border-[#12b5b0] py-2 pl-3 italic text-[#4b535b] dark:text-[#9aa4a8]">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {!msg.isLoading && msg.components && msg.components.length > 0 && (
          <div className="mt-3 space-y-3">
            {msg.components.map((comp, i) => (
              <ComponentRenderer key={i} component={comp} onSendMessage={onSendMessage} />
            ))}
          </div>
        )}

        {!msg.isLoading && msg.actions && msg.actions.length > 0 && (
          <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-2">
            {msg.actions.map((action, index) => (
              <span
                key={index}
                className="inline-flex h-6 items-center gap-1.5 rounded-[6px] bg-[#e5f6ec] px-2 text-[12px] font-medium text-[#0a6b38] dark:bg-[#3ecb7a]/15 dark:text-[#7fe0a8]"
              >
                <CheckCircle aria-hidden="true" className="h-3 w-3" />
                {action.outcome}
              </span>
            ))}
          </div>
        )}

        {!msg.isLoading && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="grid grid-cols-1 gap-2 mt-3 sm:mt-4 sm:gap-3 sm:grid-cols-2">
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
