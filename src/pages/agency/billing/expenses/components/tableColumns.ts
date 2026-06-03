export const EXPENSES_TABLE_MIN_WIDTH = "min-w-[960px]";

export const EXPENSES_TABLE_GRID =
  "grid grid-cols-[minmax(130px,1.2fr)_minmax(90px,0.8fr)_minmax(90px,0.7fr)_minmax(160px,1.4fr)_minmax(90px,0.7fr)_minmax(120px,1fr)_minmax(200px,auto)] items-center gap-3 pl-4 pr-4 [&>*]:min-w-0";

export const EXPENSES_TABLE_HEADER_CLASS = `${EXPENSES_TABLE_GRID} py-3 text-[13px] font-semibold text-[#10141a] border-b border-[#e5e5e6]`;

export const EXPENSES_TABLE_ROW_CLASS = `${EXPENSES_TABLE_GRID} py-3.5 border-b border-[#e5e5e6] last:border-b-0`;
