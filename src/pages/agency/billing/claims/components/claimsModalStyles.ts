export const CLAIMS_CORNER_MODAL_CLASS =
  "fixed !left-auto !right-6 !top-6 !translate-x-0 !translate-y-0 w-[520px] max-w-[calc(100vw-32px)] rounded-[20px] border border-[#e5e5e6] bg-white p-0 shadow-lg sm:!right-6 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100";

export const CLAIMS_CORNER_MODAL_SHELL_CLASS = "flex max-h-[90dvh] flex-col gap-0 overflow-hidden";

export const CLAIMS_FIELD_CLASS =
  "h-[48px] rounded-[10px] border border-[#e5e5e6] bg-white px-4 text-[14px] text-[#10141a] focus:border-[#00b4b8] focus:ring-[#00b4b8]";

export const CLAIMS_REPORT_MODAL_CLASS =
  "w-[calc(100vw-16px)] max-w-[1040px] rounded-[20px] border border-[#e5e5e6] bg-white p-0 shadow-lg sm:w-[min(1040px,calc(100vw-32px))]";

export const CLAIMS_REPORT_MODAL_SHELL_CLASS =
  "flex max-h-[95dvh] flex-col gap-0 overflow-x-hidden overflow-y-hidden sm:max-h-[90dvh]";

export const CLAIM_REPORT_PRINT_ROOT_CLASS =
  "claim-report-print-root w-full px-4 pb-6 sm:px-6 print:px-0 print:pb-0 print:shadow-none";

export const CLAIM_REPORT_SECTION_TITLE = "cr-section-title";

export const CLAIM_REPORT_SECTION_TITLE_MUTED = "cr-muted-title";

export const CLAIM_REPORT_FIELD_LABEL = "cr-field-label";

export const CLAIM_REPORT_ROW_LABEL = "cr-row-label";

export const CLAIM_REPORT_FIELD_CLASS =
  "cr-field h-[var(--cr-field-height,48px)] min-h-[var(--cr-field-height,48px)] rounded-[10px] border border-[#e5e5e6] bg-white px-4 text-[14px] text-[var(--cr-input-value)] placeholder:text-[var(--cr-placeholder)] focus:border-[#00b4b8] focus:ring-[#00b4b8]";

export const CLAIM_REPORT_DATE_PICKER_INPUT_CLASS =
  "text-[var(--cr-input-value)] placeholder:text-[var(--cr-placeholder)]";

export const CLAIM_REPORT_DATE_PICKER_ICON_CLASS = "text-[var(--cr-input-value)]";

export const CLAIM_REPORT_DATE_PICKER_PROPS = {
  className: CLAIM_REPORT_FIELD_CLASS,
  inputClassName: CLAIM_REPORT_DATE_PICKER_INPUT_CLASS,
  iconClassName: CLAIM_REPORT_DATE_PICKER_ICON_CLASS,
} as const;

export const CLAIM_REPORT_SIGNATURE_DATE_PICKER_PROPS = {
  ...CLAIM_REPORT_DATE_PICKER_PROPS,
  iconVariant: "calendar-2" as const,
};

export const CLAIM_REPORT_DIVIDER = "border-t border-[#e5e5e6]";

export const CLAIM_REPORT_SECTION =
  "border-t border-[#e5e5e6] pt-5 mt-5";
