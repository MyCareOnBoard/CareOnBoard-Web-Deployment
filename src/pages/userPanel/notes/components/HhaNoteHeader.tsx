import React from "react";

export interface HhaNoteInfoItem {
  label: string;
  value: string;
}

function InfoField({ label, value }: HhaNoteInfoItem) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium leading-[1.4] text-[#808081]">{label}</span>
      <span className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">{value || "—"}</span>
    </div>
  );
}

/**
 * Shared header for HHA notes: agency name, note title, and an auto-filled
 * information grid. Used by the DSP note pages, the clock-out modal, and the
 * agency approval view. `boxed` wraps the grid in the agency shift-management
 * card style; pass `boxed={false}` for a plain (background-free) section.
 */
export default function HhaNoteHeader({
  agencyName,
  title,
  items,
  boxed = true,
}: {
  agencyName: string;
  title: string;
  items: HhaNoteInfoItem[];
  boxed?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        {agencyName ? (
          <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">{agencyName}</p>
        ) : null}
        <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">{title}</h2>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
          boxed ? "rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm" : ""
        }`}
      >
        {items.map((item) => (
          <InfoField key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  );
}
