export const MILEAGE_TABLE_MIN_WIDTH = "min-w-[980px]";

/** Fixed columns: client, dsp, scheduled, service, segments, distance, status, actions */
export const MILEAGE_TABLE_GRID =
  "grid grid-cols-[150px_150px_130px_120px_72px_88px_150px_40px] items-center gap-x-4 pl-4 pr-8";

export const MILEAGE_TABLE_HEADER_CLASS = `${MILEAGE_TABLE_GRID} py-3 text-[12px] font-semibold uppercase tracking-wide text-[#9ca3af] border-b border-[#e5e7eb]/80`;

export const MILEAGE_TABLE_ROW_CLASS = `${MILEAGE_TABLE_GRID} py-4 border-b border-[#e5e7eb]/60 last:border-b-0`;
