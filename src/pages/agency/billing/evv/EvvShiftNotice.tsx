import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/utils/auth";
import { canAccessBillingChild } from "@/lib/agency/agency-billing-permissions";
import { Routes } from "@/routes/constants";
import { evvApi, type EvvVisit } from "@/lib/api/evv";
import { EvvStateBadge, isAbort } from "./evvUi";

/**
 * Shift details: where this shift stands with HHAeXchange, and a warning that editing a
 * sent visit becomes a correction that needs a reason code. Hidden when the shift is not
 * an EVV visit or the user has no EVV access.
 */
export default function EvvShiftNotice({ shiftId }: { shiftId: string }) {
  const { user } = useAuth();
  const canView = canAccessBillingChild(user?.userType, user?.profile?.accessList ?? [], "EVV View");
  const [visit, setVisit] = useState<EvvVisit | null>(null);

  useEffect(() => {
    if (!canView) return undefined;
    const controller = new AbortController();
    setVisit(null);
    // 404 means the shift is not an EVV visit: show nothing.
    evvApi.getVisit(shiftId, controller.signal).then((detail) => setVisit(detail.visit)).catch((error) => { if (!isAbort(error)) setVisit(null); });
    return () => controller.abort();
  }, [canView, shiftId]);

  if (!visit || visit.state === "voided") return null;
  const link = `${Routes.agency.billing.evv}?visit=${encodeURIComponent(shiftId)}`;
  const held = ["needs_info", "rejected", "failed"].includes(visit.state);
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm ${held ? "border-[#f5d9a8] bg-[#fff8ec] text-[#7a4a00]" : "border-[#e4e7ea] bg-white text-[#5b636b]"}`}>
      <span className="font-medium text-[#10141a]">HHAeXchange EVV</span>
      <EvvStateBadge state={visit.state} />
      <span className="min-w-0 flex-1">
        {held
          ? visit.issues[0]?.message || visit.lastError || "This visit is held back from HHAeXchange."
          : visit.sentVersion > 0
            ? "Already sent. Changing clock times, the service, the caregiver or the client sends a correction that needs a reason code."
            : "Will be sent to HHAeXchange automatically."}
      </span>
      <Link to={link} className="font-medium text-[#007c7f] hover:underline">Open in EVV</Link>
    </div>
  );
}
