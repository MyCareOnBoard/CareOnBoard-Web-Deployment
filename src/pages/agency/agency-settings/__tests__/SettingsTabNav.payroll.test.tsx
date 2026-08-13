import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsTabNav } from "@/pages/shared/settings/SettingsTabNav";
import { TabPanel } from "@/pages/shared/settings/TabPanel";
import { useState } from "react";

describe("SettingsTabNav", () => {
  it("provides tabs and arrow-key navigation", async () => {
    const change = vi.fn(); const user = userEvent.setup();
    const Harness = () => { const [active, setActive] = useState<"account" | "payroll">("account"); const onChange = (next: "account" | "payroll") => { change(next); setActive(next); }; return <><SettingsTabNav tabs={[{ id: "account", label: "Account" }, { id: "payroll", label: "Payroll Setup" }]} activeTab={active} onChange={onChange} /><TabPanel tabId="account" activeTab={active}>Account</TabPanel><TabPanel tabId="payroll" activeTab={active}>Payroll</TabPanel></>; };
    render(<Harness />);
    const account = screen.getByRole("tab", { name: "Account" });
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    await user.click(account); await user.keyboard("{ArrowRight}");
    expect(change).toHaveBeenLastCalledWith("payroll");
    const payroll = screen.getByRole("tab", { name: "Payroll Setup" });
    expect(payroll).toHaveAttribute("aria-controls", "settings-panel-payroll"); expect(screen.getByRole("tabpanel", { name: "Payroll Setup" })).toHaveAttribute("id", "settings-panel-payroll"); expect(payroll).toHaveAttribute("aria-selected", "true");
  });
});
