import { useCallback, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CareInvitation } from "@/lib/api/agencyCare";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
          <h2>{title}</h2>
          <div className="ac-actions">{actions}</div>
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
      <div className="ac-actions">{actions}</div>
    </header>
  );
}
export function CareStatus({ children }: { children: ReactNode }) {
  return <span className="ac-status">{children}</span>;
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
      {children}
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
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
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
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onNext(cursor)}
      >
        Next page
      </Button>
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
