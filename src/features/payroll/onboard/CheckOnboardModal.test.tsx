import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckOnboardModal } from "./CheckOnboardModal";
import { clearPayrollOnboardSessions } from "./payrollOnboardSession";
import * as loader from "./loadCheckOnboard";
describe("CheckOnboardModal", () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  it("requests only one fresh session for double Continue", async () => { const requestSession = vi.fn(() => new Promise<{ link: string }>(() => {})); const user = userEvent.setup(); render(<CheckOnboardModal requestSession={requestSession} onRefetch={vi.fn()} />); const button = screen.getByRole("button"); await user.dblClick(button); expect(requestSession).toHaveBeenCalledOnce(); });
  it("locks the action with its local opening label while a fresh session is pending", async () => {
    const requestSession = vi.fn(() => new Promise<{ link: string }>(() => {}));
    const user = userEvent.setup();
    render(<CheckOnboardModal actionLabel="Complete payroll onboarding" openingLabel="Opening payroll onboarding..." requestSession={requestSession} onRefetch={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Complete payroll onboarding" }));
    expect(screen.getByRole("button", { name: /opening payroll onboarding/i })).toBeDisabled();
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
  it("shows an accessible retry error when a fresh session fails", async () => { const user = userEvent.setup(); render(<CheckOnboardModal requestSession={vi.fn().mockRejectedValue(new Error("no"))} onRefetch={vi.fn()} />); await user.click(screen.getByRole("button")); expect(await screen.findByRole("alert")).toHaveTextContent(/could not be opened/i); });
  it("ignores a session that resolves after unmount", async () => {
    let resolveSession!: (value: { link: string }) => void;
    const requestSession = vi.fn(() => new Promise<{ link: string }>((resolve) => { resolveSession = resolve; }));
    const load = vi.spyOn(loader, "loadCheckOnboard"); const user = userEvent.setup(); const view = render(<CheckOnboardModal requestSession={requestSession} onRefetch={vi.fn()} />);
    await user.click(screen.getByRole("button")); view.unmount();
    await act(async () => { resolveSession({ link: "https://session.example/late" }); });
    expect(requestSession).toHaveBeenCalledOnce(); expect(load).not.toHaveBeenCalled();
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
    const user = userEvent.setup();
    render(<CheckOnboardModal requestSession={vi.fn().mockResolvedValue({ link: "https://session.example/fresh" })} onRefetch={onRefetch} />);
    const button = screen.getByRole("button");
    await user.click(button);
    await vi.waitFor(() => expect(onClose).toBeTypeOf("function"));
    button.blur();
    act(() => clearPayrollOnboardSessions());
    expect(close).toHaveBeenCalledOnce();
    expect(onRefetch).not.toHaveBeenCalled();
    expect(button).not.toHaveFocus();
  });
  it("restores focus and refetches when the SDK closes", async () => {
    let onClose!: () => void;
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn((options) => { onClose = options.onClose; return { open: vi.fn(), close: vi.fn() }; }) });
    const onRefetch = vi.fn(); const user = userEvent.setup(); render(<CheckOnboardModal requestSession={vi.fn().mockResolvedValue({ link: "https://session.example/fresh" })} onRefetch={onRefetch} />);
    const button = screen.getByRole("button", { name: /continue secure setup/i });
    await user.click(button); await vi.waitFor(() => expect(onClose).toBeTypeOf("function"));
    await vi.waitFor(() => expect(button).toHaveAttribute("aria-busy", "false"));
    button.blur(); expect(button).not.toHaveFocus();
    act(() => onClose());
    expect(button).toHaveFocus();
    expect(onRefetch).toHaveBeenCalledOnce();
  });
});
