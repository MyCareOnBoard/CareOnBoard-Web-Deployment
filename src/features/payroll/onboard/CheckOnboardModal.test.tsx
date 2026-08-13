import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckOnboardModal } from "./CheckOnboardModal";
import { clearPayrollOnboardSessions } from "./payrollOnboardSession";
import * as loader from "./loadCheckOnboard";
describe("CheckOnboardModal", () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  it("requests only one fresh session for double Continue", async () => { const requestSession = vi.fn(() => new Promise<{ link: string }>(() => {})); const user = userEvent.setup(); render(<CheckOnboardModal requestSession={requestSession} onRefetch={vi.fn()} />); const button = screen.getByRole("button"); await user.dblClick(button); expect(requestSession).toHaveBeenCalledOnce(); });
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
    await user.click(screen.getByRole("button")); clearPayrollOnboardSessions();
    await act(async () => { resolveSession({ link: "https://session.example/stale" }); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("restores focus to the actual Continue button when the SDK closes", async () => {
    let onClose!: () => void;
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn((options) => { onClose = options.onClose; return { open: vi.fn(), close: vi.fn() }; }) });
    const user = userEvent.setup(); render(<CheckOnboardModal requestSession={vi.fn().mockResolvedValue({ link: "https://session.example/fresh" })} onRefetch={vi.fn()} />);
    const button = screen.getByRole("button", { name: /continue secure setup/i });
    await user.click(button); await vi.waitFor(() => expect(onClose).toBeTypeOf("function"));
    button.blur(); expect(button).not.toHaveFocus();
    act(() => onClose());
    expect(button).toHaveFocus();
  });
});
