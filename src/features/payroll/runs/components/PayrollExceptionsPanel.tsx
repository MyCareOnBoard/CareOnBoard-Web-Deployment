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
    <section className="border-y border-[#e5e5e6] py-4" aria-labelledby="payroll-exceptions-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="payroll-exceptions-heading" className="text-base font-semibold text-[#10141a]">
            Exceptions
          </h2>
          <p className="mt-1 text-sm text-[#62686f]">
            {blockerCodes.length} blocking · {warningCodes.length} to review
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[#007f83] hover:bg-[#e9f6f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
        >
          {expanded ? `Hide ${count} payroll exceptions` : `Show ${count} payroll exceptions`}
        </button>
      </div>
      {expanded ? (
        <ul className="mt-4 divide-y divide-[#e5e5e6]" aria-label="Payroll exceptions">
          {blockerCodes.map((code) => (
            <li key={`blocker:${code}`} className="flex gap-3 py-3 text-sm">
              <span className="font-semibold text-[#a63a3a]">Blocker</span>
              <span className="text-[#40464d]">{exceptionLabel(code)}</span>
            </li>
          ))}
          {warningCodes.map((code) => (
            <li key={`warning:${code}`} className="flex gap-3 py-3 text-sm">
              <span className="font-semibold text-[#8a5a00]">Review</span>
              <span className="text-[#40464d]">{exceptionLabel(code)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
