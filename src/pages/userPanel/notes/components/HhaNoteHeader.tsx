import React from "react";
import type { ClientBasicInfo } from "@/lib/notes/clientBasicInfo";

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-normal text-[#808081] font-['Urbanist',sans-serif]">
        {label}
      </span>
      <span className="text-[14px] font-semibold text-[#10141a] font-['Urbanist',sans-serif]">
        {value || "—"}
      </span>
    </div>
  );
}

/**
 * Shared header for HHA notes: agency name, note title, and the auto-filled
 * client basic-information block (name, DOB, address, phone). Used by the DSP
 * note pages, the clock-out modal, and the agency approval view.
 */
export default function HhaNoteHeader({
  agencyName,
  title,
  client,
}: {
  agencyName: string;
  title: string;
  client: ClientBasicInfo;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        {agencyName ? (
          <p className="text-[16px] font-semibold text-[#10141a] font-['Urbanist',sans-serif]">
            {agencyName}
          </p>
        ) : null}
        <h2 className="text-[20px] font-bold text-[#10141a] font-['Urbanist',sans-serif]">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-[12px] border border-[#e1e3e8] bg-[#fafbfc] p-4 sm:grid-cols-2">
        <InfoField label="Client name" value={client.name} />
        <InfoField label="Date of birth" value={client.dob} />
        <InfoField label="Address" value={client.address} />
        <InfoField label="Phone" value={client.phone} />
      </div>
    </div>
  );
}
