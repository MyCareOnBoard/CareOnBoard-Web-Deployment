import { memo } from "react";
import type { ReactNode } from "react";
import { Navigation, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon, menuItemClassName } from "@/components/ui/dot-grid-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { MileageRide } from "@/lib/api/mileage";
import { cn } from "@/lib/utils";
import { formatRideServiceLabel } from "@/pages/agency/mileage/utils/transportationClientService";
import {
  MILEAGE_TABLE_HEADER_CLASS,
  MILEAGE_TABLE_ROW_CLASS,
} from "./mileageTableColumns";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

const destructiveMenuItemClassName = `${menuItemClassName} text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#ef4444]`;

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

function parseScheduledDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && v !== null) {
    const s =
      (v as { seconds?: number; _seconds?: number }).seconds ??
      (v as { _seconds?: number })._seconds;
    if (typeof s === "number") return new Date(s * 1000);
  }
  return null;
}

function useRideDisplay(entry: MileageRide) {
  const distanceKm = entry.actualDistance ?? null;
  const distanceStr = distanceKm != null ? `${distanceKm} km` : "—";
  const scheduledDateObj = parseScheduledDate(entry.scheduledStartTime);
  const scheduledDate = scheduledDateObj
    ? scheduledDateObj.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const scheduledTime = scheduledDateObj
    ? scheduledDateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return { distanceStr, scheduledDate, scheduledTime };
}

function PersonBlock({
  avatar,
  name,
  role,
}: {
  avatar: ReactNode;
  name: string;
  role: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {avatar}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-[#10141a]">{name}</p>
        <p className="text-[11px] text-[#9ca3af]">{role}</p>
      </div>
    </div>
  );
}

function RideClientCell({ entry }: { entry: MileageRide }) {
  const avatar = (
    <Avatar className="h-10 w-10 shrink-0 rounded-[8px]">
      {entry.clientId && entry.clientAvatarUrl && (
        <AvatarImage
          src={entry.clientAvatarUrl}
          alt={entry.clientName ?? undefined}
          className="h-full w-full rounded-[8px] object-cover"
        />
      )}
      <AvatarFallback className="flex h-full w-full items-center justify-center rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-xs font-medium text-white">
        {entry.clientId ? (
          getInitials(entry.clientName || "Client")
        ) : (
          <Navigation className="h-3.5 w-3.5" />
        )}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <PersonBlock
      avatar={avatar}
      name={
        entry.clientId
          ? entry.clientName || "—"
          : entry.purpose || "Manual mileage"
      }
      role={entry.clientId ? "Client" : "Purpose"}
    />
  );
}

function RideDspCell({ entry, staffLabel = "DSP" }: { entry: MileageRide; staffLabel?: string }) {
  const avatar = (
    <Avatar className="h-10 w-10 shrink-0 rounded-[8px]">
      {entry.caregiverAvatarUrl && (
        <AvatarImage
          src={entry.caregiverAvatarUrl}
          alt={entry.caregiverName}
          className="h-full w-full rounded-[8px] object-cover"
        />
      )}
      <AvatarFallback className="flex h-full w-full items-center justify-center rounded-[8px] bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-xs font-medium text-white">
        {getInitials(entry.caregiverName || staffLabel)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <PersonBlock
      avatar={avatar}
      name={entry.caregiverName || "—"}
      role={staffLabel}
    />
  );
}

function RideStatusBadges({ entry }: { entry: MileageRide }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
          STATUS_COLORS[entry.status] ?? "bg-gray-100 text-gray-600",
        )}
      >
        {entry.status.replace("_", " ")}
      </span>
      {!entry.clientId && (
        <span className="inline-flex shrink-0 rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-medium text-[#6b7280]">
          Manual
        </span>
      )}
      {entry.isRecurring && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-medium text-[#6b7280]">
          <RefreshCw className="h-2.5 w-2.5" />
          Recurring
        </span>
      )}
      {entry.approved && (
        <span className="inline-flex shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          Approved
        </span>
      )}
    </div>
  );
}

function MileageRideActions({
  entry,
  variant,
  onView,
  onEdit,
  onCancel,
  onDelete,
}: {
  entry: MileageRide;
  variant: "desktop" | "mobile";
  onView: () => void;
  onEdit: () => void;
  onCancel?: () => void;
  onDelete: () => void;
}) {
  const isMobile = variant === "mobile";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for mileage ride ${entry.id}`}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-md bg-[#eef4f5] transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]",
            isMobile ? "h-11 w-11" : "h-8 w-8",
          )}
        >
          <DotGridIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={isMobile ? 4 : 8}
        collisionPadding={16}
        className="z-[100] min-w-[160px] rounded-xl border border-[#e5e5e6] bg-white p-0 shadow-lg"
      >
        <DropdownMenuItem className={menuItemClassName} onSelect={onView}>
          View details
        </DropdownMenuItem>
        <DropdownMenuItem className={menuItemClassName} onSelect={onEdit}>
          Edit mileage
        </DropdownMenuItem>
        {onCancel && (
          <DropdownMenuItem className={menuItemClassName} onSelect={onCancel}>
            Cancel ride
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className={destructiveMenuItemClassName} onSelect={onDelete}>
          Delete mileage
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type MileageRideRowProps = {
  entry: MileageRide;
  variant: "desktop" | "mobile";
  staffLabel?: string;
  onView: () => void;
  onEdit: () => void;
  onCancel?: () => void;
  onDelete: () => void;
};

function MileageRideRow({
  entry,
  variant,
  staffLabel = "DSP",
  onView,
  onEdit,
  onCancel,
  onDelete,
}: MileageRideRowProps) {
  const { distanceStr, scheduledDate, scheduledTime } = useRideDisplay(entry);

  if (variant === "mobile") {
    return (
      <article className="rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.45)] px-5 py-4 shadow-sm backdrop-blur-[50px] sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <RideClientCell entry={entry} />
            <RideDspCell entry={entry} staffLabel={staffLabel} />
          </div>
          <MileageRideActions
            entry={entry}
            variant="mobile"
            onView={onView}
            onEdit={onEdit}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
              Scheduled
            </p>
            <p className="mt-1 text-[13px] font-medium text-[#10141a]">{scheduledDate}</p>
            {scheduledTime ? (
              <p className="text-[12px] text-[#6b7280]">{scheduledTime}</p>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
              Service
            </p>
            <p className="mt-1 truncate text-[13px] font-medium text-[#10141a]">
              {formatRideServiceLabel(entry)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
              Segments
            </p>
            <p className="mt-1 text-[13px] font-medium tabular-nums text-[#10141a]">
              {entry.segmentCount ?? 0}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
              Distance
            </p>
            <p className="mt-1 whitespace-nowrap text-[13px] font-medium tabular-nums text-[#10141a]">
              {distanceStr}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
              Status
            </p>
            <div className="mt-1.5">
              <RideStatusBadges entry={entry} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className={MILEAGE_TABLE_ROW_CLASS}>
      <RideClientCell entry={entry} />
      <RideDspCell entry={entry} staffLabel={staffLabel} />
      <div className="min-w-0">
        <p className="whitespace-nowrap text-[13px] font-medium text-[#10141a]">
          {scheduledDate}
        </p>
        {scheduledTime ? (
          <p className="whitespace-nowrap text-[12px] text-[#6b7280]">{scheduledTime}</p>
        ) : null}
      </div>
      <p className="truncate text-[13px] text-[#10141a]">{formatRideServiceLabel(entry)}</p>
      <p className="text-[13px] tabular-nums text-[#10141a]">{entry.segmentCount ?? 0}</p>
      <p className="whitespace-nowrap text-[13px] tabular-nums text-[#10141a]">{distanceStr}</p>
      <RideStatusBadges entry={entry} />
      <span className="flex justify-end">
        <MileageRideActions
          entry={entry}
          variant="desktop"
          onView={onView}
          onEdit={onEdit}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      </span>
    </div>
  );
}

export function MileageTableHeader({ staffLabel = "DSP" }: { staffLabel?: string }) {
  return (
    <div className={MILEAGE_TABLE_HEADER_CLASS}>
      <span>Client</span>
      <span>{staffLabel}</span>
      <span>Scheduled</span>
      <span>Service</span>
      <span>Segments</span>
      <span>Distance</span>
      <span>Status</span>
      <span className="text-right">Action</span>
    </div>
  );
}

export function MileageRideRowSkeleton({ variant }: { variant: "desktop" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <div className="animate-pulse rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.4)] p-4 sm:p-5">
        <div className="flex justify-between gap-3">
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="h-10 w-10 rounded-[8px]" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-11 w-11 rounded-md bg-[#eef4f5]" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(MILEAGE_TABLE_ROW_CLASS, "animate-pulse")} aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full max-w-[120px]" />
      ))}
    </div>
  );
}

export default memo(MileageRideRow);
