import { useCallback, useRef, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Info, X } from "lucide-react";
import type { CareInvitation, CareRole } from "@/lib/api/agencyCare";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Keep Agency Care's approved palette scoped to this module while retaining
// the app's controls, keyboard behavior and asChild links.
export function CareButton({ variant = "default", className = "", ...props }: ComponentProps<typeof Button>) {
  return <Button variant={variant} data-care-variant={variant} className={`ac-button ${className}`} {...props} />;
}

export const CARE_ROLE_LABELS: Record<CareRole, string> = {
  dsp: "DSP", caregiver: "Caregiver", support_coordinator: "Support Coordinator",
  support_supervisor: "Support supervisor", agency_contact: "Agency contact",
};

export function careRoleLabel(role?: string | null) {
  const label = CARE_ROLE_LABELS[role as CareRole];
  return typeof label === "string" ? label : "Care team member";
}

export function CareRoleBadge({ role }: { role?: CareRole | null }) {
  if (!role || typeof CARE_ROLE_LABELS[role] !== "string") return null;
  const label = role === "dsp" ? "Direct support professional" : careRoleLabel(role);
  const shortLabel = role === "support_coordinator" ? "SC" : role === "support_supervisor" ? "Supervisor" : careRoleLabel(role);
  return <span className="ac-care-role-badge" aria-label={label} title={label}>{shortLabel}</span>;
}

export function CareAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}` : parts[0]?.slice(0, 2) || "?";
  return <span className={`ac-avatar${size === "sm" ? " ac-avatar-sm" : ""}`} aria-hidden="true">{initials.toUpperCase()}</span>;
}

export function CarePerson({ name, detail, children }: { name: string; detail?: ReactNode; children?: ReactNode }) {
  return <div className="ac-person"><CareAvatar name={name} size="sm" /><div><strong>{name}</strong>{detail && <small>{detail}</small>}{children}</div></div>;
}

export function CarePanel({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="ac-panel">
      {(title || actions) && (
        <header className="ac-panel-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="ac-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
export function CareHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ac-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ac-actions">{actions}</div>}
    </header>
  );
}
export function CareStatus({ children, tone }: { children: ReactNode; tone?: "neutral" | "warning" | "danger" | "success" }) {
  const label = typeof children === "string" ? children.toLowerCase().replace(/_/g, " ") : "";
  const stateTone = tone ?? (/failed|rejected|revoked|expired|unavailable|declined/.test(label) ? "danger" : /pending|suspended|revision|withheld|processing|unverified/.test(label) ? "warning" : /\b(active|accepted|approved|verified|succeeded|published)\b/.test(label) ? "success" : "neutral");
  return <span className={`ac-status ac-status-${stateTone}`}>{children}</span>;
}
export function CareInvitationDelivery({
  delivery,
  showResendHint = false,
  recipientMode,
}: {
  delivery: CareInvitation["delivery"];
  showResendHint?: boolean;
  recipientMode?: CareInvitation["recipientMode"];
}) {
  const uncertain =
    delivery?.status === "failed" &&
    ["ambiguous_provider_result", "ambiguous_expired_lease"].includes(
      delivery.reason || "",
    );
  const labels = recipientMode === "agency_administrators" ? {
    pending: "Administrator notifications pending.",
    processing: "Preparing administrator notifications.",
    succeeded: "Administrator notifications queued. Acceptance is separate.",
    failed: "Administrator notification delivery failed.",
    cancelled: "Administrator notification delivery cancelled.",
    unavailable: "Administrator notification status unavailable.",
  } : {
    pending: "Invitation email queued.",
    processing: "Sending invitation email.",
    succeeded: "Email sent. Acceptance is separate.",
    failed: "Email delivery failed.",
    cancelled: "Email delivery cancelled.",
    unavailable: "Email delivery status unavailable.",
  };
  return (
    <div className="ac-muted">
      <p>
        {uncertain
          ? "Email delivery uncertain."
          : labels[delivery?.status || "unavailable"]}
      </p>
      {uncertain && showResendHint && (
        <p>Resend creates a replacement invitation.</p>
      )}
      {delivery?.status === "pending" && delivery.nextAttemptAt && (
        <p>Next delivery attempt: {careDate(delivery.nextAttemptAt)}</p>
      )}
    </div>
  );
}
export function CareNotice({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`ac-notice${danger ? " ac-danger" : ""}`}
      role={danger ? "alert" : undefined}
    >
      {danger ? <AlertCircle aria-hidden="true" className="ac-notice-icon" /> : <Info aria-hidden="true" className="ac-notice-icon" />}
      <div className="ac-notice-copy">{children}</div>
    </div>
  );
}
export function CareEmpty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="ac-empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function CareLoad({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading Agency Care" className="ac-stack">
      <span className="sr-only">Loading Agency Care records.</span>
      <div aria-hidden="true" className="ac-stack">
        <Skeleton className="h-7 w-56 max-w-full" />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
export function CareFailure({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <CareNotice danger>
      <p>{message}</p>
      <CareButton type="button" variant="outline" onClick={onRetry}>
        Try again
      </CareButton>
    </CareNotice>
  );
}
export function CareFormDialog({
  open,
  title,
  description,
  children,
  onClose,
  busy = false,
  className = "",
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  className?: string;
}) {
  const restoreFocus = useCareDialogFocus(open);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <DialogContent
        className={`ac-dialog w-[min(94vw,680px)] max-h-[88dvh] overflow-y-auto p-6 ${className}`}
        overlayClassName="ac-dialog-overlay"
        showCloseButton={false}
        aria-busy={busy}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || "Review the details before confirming."}
          </DialogDescription>
        </DialogHeader>
        <DialogClose className="ac-dialog-close" disabled={busy} aria-label="Close">
          <X aria-hidden="true" />
        </DialogClose>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function useCareDialogFocus(open: boolean) {
  const previous = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  if (open && !previous.current)
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  previous.current = open;
  return useCallback(() => {
    const target = opener.current;
    window.setTimeout(() => {
      if (target?.isConnected) target.focus();
    }, 0);
  }, []);
}
export function CarePager({
  cursor,
  onNext,
  disabled,
}: {
  cursor?: string | null;
  onNext: (cursor: string) => void;
  disabled?: boolean;
}) {
  return cursor ? (
    <div className="ac-actions">
      <CareButton
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onNext(cursor)}
      >
        Next page
      </CareButton>
    </div>
  ) : null;
}
export function careDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}
export function careLabel(value: string) {
  if (/^(hha|ddd|sc)$/i.test(value)) return value.toUpperCase();
  return value
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
