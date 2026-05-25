import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TextContentData {
  content: string;
  title?: string;
  icon?: string;
}

export default function TextContentCard({ data }: { data: unknown }) {
  const cardData = typeof data === "string" ? { content: data } : (data as TextContentData);

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      {/* Header - optional */}
      {cardData.title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
          {cardData.icon && <span className="text-lg">{cardData.icon}</span>}
          <span className="text-[13px] font-semibold text-[#10141a]">{cardData.title}</span>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3.5 sm:py-4">
        <div className="prose prose-sm max-w-none text-[13px] sm:text-[14px] leading-relaxed text-[#374151]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="mt-2 overflow-x-auto">
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
              em: ({ children }) => <em className="italic text-[#6b7280]">{children}</em>,
              code: ({ children }) => (
                <code className="rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[12px] font-mono text-[#d97706]">
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#00b4b8] pl-3 py-2 text-[#6b7280] italic my-2">
                  {children}
                </blockquote>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-[#00b4b8] hover:text-[#0d9fa7] underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {cardData.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
