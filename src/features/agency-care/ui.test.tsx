import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CareFailure, CareFormDialog, CareInvitationDelivery, CarePager, CareRoleBadge } from "./ui";

it.each([
  ["invitation_url_unavailable", "The invitation link is not configured."],
  ["invitation_transport_unavailable", "The email service is not configured."],
  ["invitation_signing_unavailable", "Secure invitation verification is not configured."],
  ["invitation_configuration_unavailable", "Invitation email delivery is not configured."],
])("explains external delivery configuration failure %s before resending", (reason, explanation) => {
  const { rerender } = render(<CareInvitationDelivery delivery={{ status: "failed", reason }} showResendHint />);
  expect(screen.getByText(explanation)).toBeInTheDocument();
  expect(screen.getByText("Ask a platform administrator to fix delivery configuration before using Resend.")).toBeInTheDocument();
  rerender(<CareInvitationDelivery delivery={{ status: "pending", reason, nextAttemptAt: "2026-10-12T12:00:00Z" }} showResendHint />);
  expect(screen.getByText(explanation)).toBeInTheDocument();
  expect(screen.queryByText("Invitation email queued.")).not.toBeInTheDocument();
  expect(screen.queryByText(/Next delivery attempt:/)).not.toBeInTheDocument();
});

it("retains ordinary provider failure and internal administrator notification copy", () => {
  const { rerender } = render(<CareInvitationDelivery delivery={{ status: "failed", reason: "provider_rejected" }} />);
  expect(screen.getByText("Email delivery failed.")).toBeInTheDocument();
  expect(screen.queryByText(/platform administrator/)).not.toBeInTheDocument();
  rerender(<CareInvitationDelivery recipientMode="agency_administrators" delivery={{ status: "failed", reason: "invitation_configuration_unavailable" }} />);
  expect(screen.getByText("Administrator notification delivery failed.")).toBeInTheDocument();
  expect(screen.queryByText(/platform administrator/)).not.toBeInTheDocument();
});

it("retains uncertain email delivery and replacement invitation guidance", () => {
  render(<CareInvitationDelivery delivery={{ status: "failed", reason: "ambiguous_provider_result" }} showResendHint />);
  expect(screen.getByText("Email delivery uncertain.")).toBeInTheDocument();
  expect(screen.getByText("Resend creates a replacement invitation.")).toBeInTheDocument();
});

it("reserves the SC badge for coordinators and leaves unrecorded roles unlabeled", () => {
  render(<>
    <CareRoleBadge role="support_supervisor" />
    <CareRoleBadge role="support_coordinator" />
    <div data-testid="unrecorded-role"><CareRoleBadge /></div>
  </>);
  expect(screen.getByLabelText("Support supervisor")).toHaveTextContent("Supervisor");
  expect(screen.getByLabelText("Support Coordinator")).toHaveTextContent(/^SC$/);
  expect(screen.queryByText("SC supervisor")).not.toBeInTheDocument();
  expect(screen.getByTestId("unrecorded-role")).toBeEmptyDOMElement();
});

it("changes pages without submitting the surrounding form", () => {
  const submit = vi.fn();
  const next = vi.fn();
  render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <CarePager cursor="next-page" onNext={next} />
    </form>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(next).toHaveBeenCalledWith("next-page");
  expect(submit).not.toHaveBeenCalled();
});

it("retries failed reads without submitting an action form", () => {
  const submit = vi.fn();
  const retry = vi.fn();
  render(<form onSubmit={event => { event.preventDefault(); submit(); }}>
    <CareFailure message="Could not load staff" onRetry={retry} />
  </form>);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
  expect(submit).not.toHaveBeenCalled();
});

it("returns keyboard focus to the opener after a controlled form dialog closes", async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Add a document</button>
        {open && (
          <CareFormDialog
            open
            title="Add document"
            onClose={() => setOpen(false)}
          >
            <label>
              Title
              <input />
            </label>
            <button onClick={() => setOpen(false)}>Cancel</button>
          </CareFormDialog>
        )}
      </>
    );
  }
  render(<Harness />);
  const opener = screen.getByRole("button", { name: "Add a document" });
  opener.focus();
  fireEvent.click(opener);
  expect(await screen.findByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(opener).toHaveFocus());
});

it("keeps a pending action's dialog open until saving finishes", () => {
  const close = vi.fn();
  const { rerender } = render(
    <CareFormDialog open busy title="Assign staff" onClose={close}>
      <p>Saving the assignment.</p>
    </CareFormDialog>,
  );
  expect(screen.getByRole("button", { name: /^Close$/ })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(close).not.toHaveBeenCalled();
  rerender(
    <CareFormDialog open title="Assign staff" onClose={close}>
      <p>Assignment saved.</p>
    </CareFormDialog>,
  );
  fireEvent.click(screen.getByRole("button", { name: /^Close$/ }));
  expect(close).toHaveBeenCalledOnce();
});
