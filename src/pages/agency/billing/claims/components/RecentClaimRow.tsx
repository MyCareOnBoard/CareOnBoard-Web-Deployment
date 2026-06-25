import { memo } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Routes } from "@/routes/constants";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import ClientNameLink from "./ClientNameLink";
import { GROUPED_TABLE_ROW_CLASS, TABLE_ROW_CLASS } from "./tableColumns";

const MISSING_STAFF_ID = "—";
const STAFF_ID_DISPLAY_LENGTH = 6;

function isStaffIdLinkable(staffId: string): boolean {
  const trimmed = staffId.trim();
  return Boolean(trimmed) && trimmed !== MISSING_STAFF_ID;
}

function formatStaffIdDisplay(staffId: string): string {
  if (!isStaffIdLinkable(staffId)) {
    return staffId.trim() || MISSING_STAFF_ID;
  }
  return staffId.slice(0, STAFF_ID_DISPLAY_LENGTH);
}

function StaffLink({ staffId, staffName }: { staffId: string; staffName?: string }) {
  // Prefer the resolved staff name; fall back to the (truncated) id when it's missing.
  const label = staffName?.trim() || formatStaffIdDisplay(staffId);

  if (!isStaffIdLinkable(staffId)) {
    return <span className="text-[13px] text-[#808081]">{label}</span>;
  }

  return (
    <Link
      to={Routes.agency.dspProfile.replace(":dspId", staffId.trim())}
      className="text-[13px] font-medium text-[#10141a] transition-colors hover:text-[#00b4b8] hover:underline"
    >
      {label}
    </Link>
  );
}

type RowVariant = "mobile" | "desktop";

type RecentClaimRowProps = {
  claim: RecentClaim;
  variant: RowVariant;
  showClient?: boolean;
};

function DurationRange({ start, end }: { start: string; end: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#10141a]">
      <span>{start}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#808081]" aria-hidden="true" />
      <span>{end}</span>
    </span>
  );
}

function RecentClaimRow({ claim, variant, showClient = true }: RecentClaimRowProps) {
  if (variant === "mobile") {
    return (
      <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        {showClient ? (
          <ClientNameLink
            name={claim.client}
            clientId={claim.clientId}
            className="text-[15px] font-semibold text-[#10141a]"
          />
        ) : null}

        <div className={showClient ? "mt-4 space-y-3" : "space-y-3"}>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Staff</span>
            <StaffLink staffId={claim.staffId} staffName={claim.staffName} />
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Service date</span>
            <span className="text-[13px] font-medium text-[#10141a]">{claim.serviceDate}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Duration/Distance</span>
            <DurationRange start={claim.durationStart} end={claim.durationEnd} />
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Rate</span>
            <span className="text-[13px] font-medium text-[#10141a] tabular-nums">{claim.rate}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e5e5e6] pt-4">
          <div>
            <p className="text-[12px] text-[#808081]">Service code</p>
            <p className="mt-1 text-[13px] font-medium text-[#10141a]">{claim.serviceCode}</p>
          </div>
          <div>
            <p className="text-[12px] text-[#808081]">PA Number</p>
            <p className="mt-1 text-[13px] font-medium text-[#10141a]">{claim.paNumber}</p>
          </div>
          <div>
            <p className="text-[12px] text-[#808081]">Total hours/miles</p>
            <p className="mt-1 text-[13px] font-medium text-[#10141a] tabular-nums">{claim.totalHours}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={showClient ? TABLE_ROW_CLASS : GROUPED_TABLE_ROW_CLASS}>
      {showClient ? (
        <ClientNameLink
          name={claim.client}
          clientId={claim.clientId}
          className="text-[14px] font-medium text-[#10141a]"
        />
      ) : null}
      <StaffLink staffId={claim.staffId} staffName={claim.staffName} />
      <span className="text-[13px] text-[#10141a]">{claim.serviceCode}</span>
      <span className="text-[13px] text-[#10141a]">{claim.paNumber}</span>
      <span className="text-[13px] text-[#10141a]">{claim.serviceDate}</span>
      <DurationRange start={claim.durationStart} end={claim.durationEnd} />
      <span className="text-[13px] text-[#10141a] tabular-nums">{claim.totalHours}</span>
      <span className="text-[13px] text-[#10141a] tabular-nums">{claim.rate}</span>
    </div>
  );
}

export default memo(RecentClaimRow);
