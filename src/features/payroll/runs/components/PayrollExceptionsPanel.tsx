import { useState } from "react";

function exceptionLabel(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((part, index) => index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(" ");
}

export function PayrollExceptionsPanel(_props: {
  blockerCodes: string[];
  warningCodes: string[];
}) {
  const { blockerCodes, warningCodes } = _props;
  const [expanded, setExpanded] = useState(false);
  const count = blockerCodes.length + warningCodes.length;
  if (count === 0) return null;

  return (
    <section className="rounded-[16px] border border-[#e4e7ea] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#1b232b]" aria-labelledby="payroll-exceptions-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="payroll-exceptions-heading" className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">
            Exceptions
          </h2>
          <p className="mt-1 text-sm text-[#5b636b] dark:text-[#9aa4a8]">
            {blockerCodes.length} blocking · {warningCodes.length} to review
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="h-9 cursor-pointer rounded-[8px] px-3 text-sm font-medium text-[#007679] underline underline-offset-4 hover:text-[#005c5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#7fd3d3]"
        >
          {expanded ? `Hide ${count} payroll exceptions` : `Show ${count} payroll exceptions`}
        </button>
      </div>
      {expanded ? (
        <ul className="mt-4 divide-y divide-[#eceef0] dark:divide-white/10" aria-label="Payroll exceptions">
          {blockerCodes.map((code) => (
            <li key={`blocker:${code}`} className="flex gap-3 py-3 text-sm">
              <span className="font-semibold text-[#a63a3a]">Blocker</span>
              <span className="text-[#2a3138] dark:text-[#c9d1d4]">{exceptionLabel(code)}</span>
            </li>
          ))}
          {warningCodes.map((code) => (
            <li key={`warning:${code}`} className="flex gap-3 py-3 text-sm">
              <span className="font-semibold text-[#8a5a00]">Review</span>
              <span className="text-[#2a3138] dark:text-[#c9d1d4]">{exceptionLabel(code)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
