import type { ReactNode } from "react";
import { Link, useInRouterContext } from "react-router";
import { Routes } from "@/routes/constants";

/** A record the assistant listed, so its row can open the record's own page. */
export interface RecordLink {
  kind?: string;
  id?: string;
}

/** Detail page for a listed record, or null when that kind has no page. */
export function recordHref(link?: RecordLink | null): string | null {
  if (!link?.id || typeof link.id !== "string") return null;
  const id = encodeURIComponent(link.id);
  switch (link.kind) {
    case "dsp": return Routes.agency.dspProfile.replace(":dspId", id);
    case "client": return Routes.agency.clientDetails.replace(":clientId", id);
    case "applicant": return Routes.agency.applicantProfile.replace(":id", id);
    case "shift": return Routes.agency.shiftDetails.replace(":shiftId", id);
    default: return null;
  }
}

/** Renders a list row as a link to `href` when there is one, else as a plain row. */
export function RecordRow({ href, className, children }: { href: string | null; className: string; children: ReactNode }) {
  const inRouter = useInRouterContext();
  if (!href || !inRouter) return <div className={className}>{children}</div>;
  return (
    <Link to={href} className={`${className} transition-colors hover:bg-[#f3fafa] focus-visible:bg-[#f3fafa] focus-visible:outline-none`}>
      {children}
    </Link>
  );
}
