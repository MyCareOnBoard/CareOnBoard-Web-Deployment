import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckOnboardModal } from "./CheckOnboardModal";
import { clearPayrollOnboardSessions } from "./payrollOnboardSession";
import * as loader from "./loadCheckOnboard";

const loadingDialog = {
  preparing: {
    title: "Preparing payroll onboarding",
    description: "Creating a fresh, secure link to Check. This will open automatically.",
  },
  opening: {
    title: "Opening Check onboarding",
    description: "Your secure link is ready. Connecting you to Check now.",
  },
};

describe("CheckOnboardModal", () => {
  const originalLocation = window.location;
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, assign: vi.fn() },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", { writable: true, value: originalLocation });
  });
  it("requests only one fresh session for double Continue", async () => { const requestSession = vi.fn(() => new Promise<{ link: string }>(() => {})); const user = userEvent.setup(); render(<CheckOnboardModal requestSession={requestSession} onRefetch={vi.fn()} />); const button = screen.getByRole("button"); await user.dblClick(button); expect(requestSession).toHaveBeenCalledOnce(); });
  it("locks the action with its local opening label while a fresh session is pending", async () => {
    const requestSession = vi.fn(() => new Promise<{ link: string }>(() => {}));
    const user = userEvent.setup();
    render(<CheckOnboardModal actionLabel="Complete payroll onboarding" openingLabel="Opening payroll onboarding..." requestSession={requestSession} onRefetch={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Complete payroll onboarding" }));
    expect(screen.getByRole("button", { name: /opening payroll onboarding/i })).toBeDisabled();
  });
  it("announces the loading dialog's preparing and opening phases", async () => {
    let resolveSession!: (value: { link: string }) => void;
    let resolveLoader!: (value: Awaited<ReturnType<typeof loader.loadCheckOnboard>>) => void;
    const open = vi.fn();
    vi.spyOn(loader, "loadCheckOnboard").mockReturnValue(new Promise((resolve) => { resolveLoader = resolve; }));
    const user = userEvent.setup();
    render(<CheckOnboardModal loadingDialog={loadingDialog} requestSession={() => new Promise((resolve) => { resolveSession = resolve; })} onRefetch={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Continue secure setup" }));
    expect(screen.getByRole("dialog", { name: "Preparing payroll onboarding" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
    expect(screen.queryByRole("status", { name: "Opening secure setup..." })).not.toBeInTheDocument();

    await act(async () => { resolveSession({ link: "https://session.example/loading" }); });
    expect(await screen.findByRole("dialog", { name: "Opening Check onboarding" })).toBeVisible();
    expect(screen.getByText("Your secure link is ready. Connecting you to Check now.")).toBeVisible();
    await act(async () => { resolveLoader({ create: vi.fn(() => ({ open, close: vi.fn() })) }); });
  });
  it("keeps the Secure handoff dialog non-dismissible and motion-safe", async () => {
    const user = userEvent.setup();
    render(<CheckOnboardModal loadingDialog={loadingDialog} requestSession={vi.fn(() => new Promise<{ link: string }>(() => undefined))} onRefetch={vi.fn()} />);
    await user.click(screen.getByRole("button"));

    const dialog = screen.getByRole("dialog", { name: "Preparing payroll onboarding" });
    expect(dialog.querySelector("[data-slot=dialog-close]")).toBeNull();
    expect(screen.getByTestId("check-onboard-loading-ring")).toHaveClass("motion-safe:animate-spin");
    await user.keyboard("{Escape}");
    expect(dialog).toBeVisible();
    fireEvent.pointerDown(document.querySelector("[data-slot=dialog-overlay]")!);
    expect(dialog).toBeVisible();
  });
  it("closes the loading dialog without restoring trigger focus after a successful embedded handoff", async () => {
    let resolveSession!: (value: { link: string }) => void;
    const open = vi.fn();
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn(() => ({ open, close: vi.fn() })) });
    const user = userEvent.setup();
    render(<CheckOnboardModal loadingDialog={loadingDialog} requestSession={() => new Promise((resolve) => { resolveSession = resolve; })} onRefetch={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Continue secure setup" });
    await user.click(button);
    expect(screen.getByRole("dialog", { name: "Preparing payroll onboarding" })).toBeVisible();
    button.blur();
    await act(async () => { resolveSession({ link: "https://session.example/success" }); });
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(button).not.toHaveFocus();
  });
  it("closes the loading dialog before showing a failure and focusing the retry trigger", async () => {
    let rejectSession!: (reason: Error) => void;
    const user = userEvent.setup();
    render(<CheckOnboardModal loadingDialog={loadingDialog} requestSession={() => new Promise((_, reject) => { rejectSession = reject; })} onRefetch={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Continue secure setup" });
    await user.click(button);
    expect(screen.getByRole("dialog", { name: "Preparing payroll onboarding" })).toBeVisible();
    await act(async () => { rejectSession(new Error("no")); });
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be opened/i);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(button).toHaveFocus();
  });
  it("retires a session request promptly and ignores its late rejection", async () => {
    let rejectSession!: (reason: Error) => void;
    const requestSession = vi.fn(() => new Promise<{ link: string }>((_, reject) => { rejectSession = reject; }));
    const onClosed = vi.fn();
    const renderModal = (cancelPending: boolean) => <CheckOnboardModal loadingDialog={loadingDialog} cancelPending={cancelPending} requestSession={requestSession} onRefetch={vi.fn()} onClosed={onClosed} />;
    const user = userEvent.setup();
    const view = render(renderModal(false));
    await user.click(screen.getByRole("button"));
    view.rerender(renderModal(true));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await act(async () => { rejectSession(new Error("late request failure")); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue secure setup" })).toBeEnabled();
    expect(onClosed).not.toHaveBeenCalled();
  });
  it("keeps shared employee-style loading inline when loadingDialog is absent", async () => {
    const user = userEvent.setup();
    render(<CheckOnboardModal requestSession={vi.fn(() => new Promise<{ link: string }>(() => undefined))} onRefetch={vi.fn()} />);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Opening secure setup...");
  });
  it("preserves redirect mode without loading the embedded SDK", async () => {
    const assign = window.location.assign as ReturnType<typeof vi.fn>;
    const load = vi.spyOn(loader, "loadCheckOnboard");
    const user = userEvent.setup();
    render(<CheckOnboardModal launchMode="redirect" loadingDialog={loadingDialog} requestSession={vi.fn().mockResolvedValue({ link: "https://session.example/redirect" })} onRefetch={vi.fn()} />);

    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://session.example/redirect"));
    expect(load).not.toHaveBeenCalled();
  });
  it("does not let a retired launch unlock a newer launch", async () => {
    let resolveFirst!: (session: { link: string }) => void;
    const requestSession = vi.fn()
      .mockImplementationOnce(() => new Promise<{ link: string }>((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<{ link: string }>(() => undefined));
    const user = userEvent.setup();
    const renderModal = (cancelPending: boolean) => <CheckOnboardModal loadingDialog={loadingDialog} cancelPending={cancelPending} requestSession={requestSession} onRefetch={vi.fn()} />;
    const view = render(renderModal(false));
    await user.click(screen.getByRole("button"));
    view.rerender(renderModal(true));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    view.rerender(renderModal(false));
    await user.click(screen.getByRole("button"));
    expect(requestSession).toHaveBeenCalledTimes(2);
    await act(async () => { resolveFirst({ link: "https://session.example/retired" }); });
    expect(screen.getByRole("button", { hidden: true })).toBeDisabled();
    expect(requestSession).toHaveBeenCalledTimes(2);
  });
  it("opens the resolved session and releases the action under Strict Mode", async () => {
    const open = vi.fn();
    const create = vi.fn(() => ({ open, close: vi.fn() }));
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create });
    const user = userEvent.setup();
    render(<StrictMode><CheckOnboardModal actionLabel="Complete payroll onboarding" requestSession={vi.fn().mockResolvedValue({ link: "https://session.example/company" })} onRefetch={vi.fn()} /></StrictMode>);

    await user.click(screen.getByRole("button", { name: "Complete payroll onboarding" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ link: "https://session.example/company" })));
    expect(open).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Complete payroll onboarding" })).toHaveAttribute("aria-busy", "false");
  });
  it("automatically consumes a key and opens one embedded session under Strict Mode", async () => {
    const open = vi.fn(); const show = vi.fn(); const create = vi.fn(() => ({ open, _show: show, close: vi.fn() }));
    const requestSession = vi.fn().mockResolvedValue({ link: "https://session.example/agency-a" });
    const onAutoStartConsumed = vi.fn();
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create });
    const view = render(<StrictMode><CheckOnboardModal autoStartKey="setup:agency-a:3:1" onAutoStartConsumed={onAutoStartConsumed} requestSession={requestSession} onRefetch={vi.fn()} /></StrictMode>);

    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(onAutoStartConsumed).toHaveBeenCalledOnce();
    expect(onAutoStartConsumed).toHaveBeenCalledWith("setup:agency-a:3:1");
    expect(requestSession).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledOnce();

    view.rerender(<StrictMode><CheckOnboardModal autoStartKey="setup:agency-a:3:1" onAutoStartConsumed={onAutoStartConsumed} requestSession={requestSession} onRefetch={vi.fn()} /></StrictMode>);
    await act(async () => {});
    expect(requestSession).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledOnce();
  });
  it("keeps a disabled automatic launch unconsumed until the launcher is reenabled", async () => {
    const open = vi.fn();
    const requestSession = vi.fn().mockResolvedValue({ link: "https://session.example/agency-a" });
    const onAutoStartConsumed = vi.fn();
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn(() => ({ open, close: vi.fn() })) });
    const view = render(<CheckOnboardModal disabled autoStartKey="setup:agency-a:3:1" onAutoStartConsumed={onAutoStartConsumed} requestSession={requestSession} onRefetch={vi.fn()} />);

    expect(screen.getByRole("button")).toBeDisabled();
    await act(async () => {});
    expect(requestSession).not.toHaveBeenCalled();
    expect(onAutoStartConsumed).not.toHaveBeenCalled();

    view.rerender(<CheckOnboardModal disabled={false} autoStartKey="setup:agency-a:3:1" onAutoStartConsumed={onAutoStartConsumed} requestSession={requestSession} onRefetch={vi.fn()} />);
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(requestSession).toHaveBeenCalledOnce();
    expect(onAutoStartConsumed).toHaveBeenCalledOnce();
  });
  it("keeps a newer automatic key pending until the active launch settles", async () => {
    let resolveFirst!: (value: { link: string }) => void;
    const open = vi.fn(); const create = vi.fn(() => ({ open, close: vi.fn() }));
    const requestSession = vi.fn(() => Promise.resolve({ link: "https://session.example/default" }));
    requestSession.mockImplementationOnce(() => new Promise<{ link: string }>((resolve) => { resolveFirst = resolve; }));
    requestSession.mockResolvedValueOnce({ link: "https://session.example/agency-b" });
    const onAutoStartConsumed = vi.fn();
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create });
    const view = render(<CheckOnboardModal autoStartKey="setup:agency-a:3:1" onAutoStartConsumed={onAutoStartConsumed} requestSession={requestSession} onRefetch={vi.fn()} />);

    await waitFor(() => expect(requestSession).toHaveBeenCalledOnce());
    expect(onAutoStartConsumed).toHaveBeenCalledWith("setup:agency-a:3:1");
    view.rerender(<CheckOnboardModal autoStartKey="setup:agency-b:3:1" onAutoStartConsumed={onAutoStartConsumed} requestSession={requestSession} onRefetch={vi.fn()} />);
    await act(async () => {});
    expect(onAutoStartConsumed).toHaveBeenCalledOnce();
    expect(requestSession).toHaveBeenCalledOnce();

    await act(async () => { resolveFirst({ link: "https://session.example/agency-a" }); });
    await waitFor(() => expect(requestSession).toHaveBeenCalledTimes(2));
    expect(onAutoStartConsumed).toHaveBeenNthCalledWith(2, "setup:agency-b:3:1");
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));

    view.rerender(<CheckOnboardModal autoStartKey="setup:agency-b:3:1" onAutoStartConsumed={onAutoStartConsumed} requestSession={requestSession} onRefetch={vi.fn()} />);
    await act(async () => {});
    expect(requestSession).toHaveBeenCalledTimes(2);
    expect(onAutoStartConsumed).toHaveBeenCalledTimes(2);
  });
  it("does not retry a failed automatic launch until the user clicks Continue", async () => {
    const open = vi.fn(); const create = vi.fn(() => ({ open, close: vi.fn() }));
    const requestSession = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ link: "https://session.example/retry" });
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create });
    const user = userEvent.setup();
    const view = render(<CheckOnboardModal autoStartKey="setup:agency-a:3:1" requestSession={requestSession} onRefetch={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be opened/i);
    expect(requestSession).toHaveBeenCalledOnce();
    view.rerender(<CheckOnboardModal autoStartKey="setup:agency-a:3:1" requestSession={requestSession} onRefetch={vi.fn()} />);
    await act(async () => {});
    expect(requestSession).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Continue secure setup" }));
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(requestSession).toHaveBeenCalledTimes(2);
  });
  it("does not open the SDK when a pending automatic request is torn down", async () => {
    let resolveSession!: (value: { link: string }) => void;
    const requestSession = vi.fn(() => new Promise<{ link: string }>((resolve) => { resolveSession = resolve; }));
    const load = vi.spyOn(loader, "loadCheckOnboard");
    render(<CheckOnboardModal autoStartKey="setup:agency-a:3:1" requestSession={requestSession} onRefetch={vi.fn()} />);

    await waitFor(() => expect(requestSession).toHaveBeenCalledOnce());
    act(() => clearPayrollOnboardSessions());
    await act(async () => { resolveSession({ link: "https://session.example/late" }); });
    expect(load).not.toHaveBeenCalled();
  });
  it.each(["automatic", "manual"] as const)("retires a pending SDK load for a %s launch without constructing the SDK", async (launch) => {
    let resolveLoader!: (value: Awaited<ReturnType<typeof loader.loadCheckOnboard>>) => void;
    const open = vi.fn();
    const show = vi.fn();
    const create = vi.fn(() => ({ open, _show: show, close: vi.fn() }));
    const load = vi.spyOn(loader, "loadCheckOnboard").mockReturnValue(new Promise((resolve) => { resolveLoader = resolve; }));
    const requestSession = vi.fn().mockResolvedValue({ link: "https://session.example/pending-sdk" });
    const renderModal = (cancelPending: boolean) => <CheckOnboardModal
      {...(launch === "automatic" ? { autoStartKey: "setup:agency-a:3:1" } : {})}
      cancelPending={cancelPending}
      requestSession={requestSession}
      onRefetch={vi.fn()}
    />;
    const view = render(renderModal(false));

    if (launch === "manual") await userEvent.setup().click(screen.getByRole("button", { name: "Continue secure setup" }));
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    view.rerender(renderModal(true));
    await act(async () => { resolveLoader({ create }); });

    expect(requestSession).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });
  it("settles a cancelled automatic SDK load and re-enables the manual fallback", async () => {
    const load = vi.spyOn(loader, "loadCheckOnboard").mockImplementation(() => new Promise(() => {}));
    const requestSession = vi.fn().mockResolvedValue({ link: "https://session.example/pending-sdk" });
    const renderModal = (cancelPending: boolean) => <CheckOnboardModal
      autoStartKey="setup:agency-a:3:1"
      cancelPending={cancelPending}
      requestSession={requestSession}
      onRefetch={vi.fn()}
    />;
    const user = userEvent.setup();
    const view = render(renderModal(false));

    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: /opening secure setup/i })).toBeDisabled();
    view.rerender(renderModal(true));

    expect(await screen.findByRole("button", { name: "Continue secure setup" })).toBeEnabled();
    view.rerender(renderModal(false));
    await user.click(screen.getByRole("button", { name: "Continue secure setup" }));

    await waitFor(() => expect(requestSession).toHaveBeenCalledTimes(2));
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("ignores a loader rejection after a pending launch is cancelled", async () => {
    let rejectLoader!: (reason: Error) => void;
    const load = vi.spyOn(loader, "loadCheckOnboard").mockReturnValue(new Promise((_, reject) => { rejectLoader = reject; }));
    const requestSession = vi.fn().mockResolvedValue({ link: "https://session.example/pending-sdk" });
    const renderModal = (cancelPending: boolean) => <CheckOnboardModal
      autoStartKey="setup:agency-a:3:1"
      cancelPending={cancelPending}
      requestSession={requestSession}
      onRefetch={vi.fn()}
    />;
    const view = render(renderModal(false));

    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    view.rerender(renderModal(true));
    await act(async () => { rejectLoader(new Error("late SDK failure")); });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue secure setup" })).toBeEnabled();
  });
  it("shows an accessible retry error when a fresh session fails", async () => { const user = userEvent.setup(); render(<CheckOnboardModal requestSession={vi.fn().mockRejectedValue(new Error("no"))} onRefetch={vi.fn()} />); await user.click(screen.getByRole("button")); expect(await screen.findByRole("alert")).toHaveTextContent(/could not be opened/i); });
  it("ignores a session that resolves after unmount", async () => {
    let resolveSession!: (value: { link: string }) => void;
    const requestSession = vi.fn(() => new Promise<{ link: string }>((resolve) => { resolveSession = resolve; }));
    const onClosed = vi.fn(); const load = vi.spyOn(loader, "loadCheckOnboard"); const user = userEvent.setup(); const view = render(<CheckOnboardModal requestSession={requestSession} onRefetch={vi.fn()} onClosed={onClosed} />);
    await user.click(screen.getByRole("button")); view.unmount();
    await act(async () => { resolveSession({ link: "https://session.example/late" }); });
    expect(requestSession).toHaveBeenCalledOnce(); expect(load).not.toHaveBeenCalled(); expect(onClosed).not.toHaveBeenCalled();
  });
  it("ignores a session invalidated by a global payroll teardown", async () => {
    let resolveSession!: (value: { link: string }) => void;
    const requestSession = vi.fn(() => new Promise<{ link: string }>((resolve) => { resolveSession = resolve; }));
    const user = userEvent.setup(); render(<CheckOnboardModal requestSession={requestSession} onRefetch={vi.fn()} />);
    await user.click(screen.getByRole("button")); act(() => clearPayrollOnboardSessions());
    await act(async () => { resolveSession({ link: "https://session.example/stale" }); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("silently tears down an active SDK session during global teardown", async () => {
    let onClose!: () => void;
    const close = vi.fn();
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn((options) => { onClose = options.onClose; return { open: vi.fn(), close }; }) });
    const onRefetch = vi.fn();
    const onClosed = vi.fn();
    const user = userEvent.setup();
    render(<CheckOnboardModal requestSession={vi.fn().mockResolvedValue({ link: "https://session.example/fresh" })} onRefetch={onRefetch} onClosed={onClosed} />);
    const button = screen.getByRole("button");
    await user.click(button);
    await vi.waitFor(() => expect(onClose).toBeTypeOf("function"));
    button.blur();
    act(() => clearPayrollOnboardSessions());
    expect(close).toHaveBeenCalledOnce();
    expect(onRefetch).not.toHaveBeenCalled();
    expect(onClosed).not.toHaveBeenCalled();
    expect(button).not.toHaveFocus();
  });
  it("refetches for SDK progress but invokes onClosed once only for a genuine SDK close", async () => {
    let onClose!: () => void;
    let onEvent!: () => void;
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn((options) => { onClose = options.onClose; onEvent = options.onEvent; return { open: vi.fn(), close: vi.fn() }; }) });
    const onRefetch = vi.fn(); const onClosed = vi.fn(); const user = userEvent.setup(); render(<CheckOnboardModal requestSession={vi.fn().mockResolvedValue({ link: "https://session.example/fresh" })} onRefetch={onRefetch} onClosed={onClosed} />);
    const button = screen.getByRole("button", { name: /continue secure setup/i });
    await user.click(button); await vi.waitFor(() => expect(onClose).toBeTypeOf("function"));
    await vi.waitFor(() => expect(button).toHaveAttribute("aria-busy", "false"));
    button.blur(); expect(button).not.toHaveFocus();
    act(() => onEvent());
    expect(onRefetch).toHaveBeenCalledOnce();
    expect(onClosed).not.toHaveBeenCalled();
    act(() => onClose());
    act(() => onClose());
    expect(button).toHaveFocus();
    expect(onRefetch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(onClosed).toHaveBeenCalledOnce());
  });
  it("keeps refetch and focus restoration at expiry without invoking onClosed", async () => {
    vi.useFakeTimers();
    try {
      const close = vi.fn();
      const open = vi.fn();
      vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn(() => ({ open, close })) });
      const onRefetch = vi.fn();
      const onClosed = vi.fn();
      render(<CheckOnboardModal requestSession={vi.fn().mockResolvedValue({ link: "https://session.example/fresh", expiresAt: new Date(Date.now() + 100).toISOString() })} onRefetch={onRefetch} onClosed={onClosed} />);

      const button = screen.getByRole("button", { name: /continue secure setup/i });
      await act(async () => { fireEvent.click(button); });
      await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
      button.blur();
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });

      expect(close).toHaveBeenCalledOnce();
      expect(button).toHaveFocus();
      expect(onRefetch).toHaveBeenCalledOnce();
      expect(onClosed).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
