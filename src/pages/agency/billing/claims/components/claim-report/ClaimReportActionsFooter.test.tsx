import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClaimReportActionsFooter from "./ClaimReportActionsFooter";

function setup(overrides: Partial<Parameters<typeof ClaimReportActionsFooter>[0]> = {}) {
  const props = {
    pdf: { label: "Download claim form (PDF)", detail: "CMS-1500 style, for printing or records", busy: false, onClick: vi.fn() },
    x12: { label: "Download 837P file", detail: "837P_TEST_20261016_000000001.x12", busy: false, onClick: vi.fn() },
    onSend: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<ClaimReportActionsFooter {...props} />);
  return props;
}

describe("ClaimReportActionsFooter", () => {
  it("labels each download by the file it gives", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: /Download claim form \(PDF\)\. CMS-1500 style/ }));
    await user.click(screen.getByRole("button", { name: /Download 837P file\. 837P_TEST_20261016_000000001\.x12/ }));
    await user.click(screen.getByRole("button", { name: "Send claim report" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(props.pdf.onClick).toHaveBeenCalledTimes(1);
    expect(props.x12!.onClick).toHaveBeenCalledTimes(1);
    expect(props.onSend).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("hides the 837P button without access and disables a download while it runs", () => {
    setup({ x12: null, pdf: { label: "Creating PDF…", detail: "CMS-1500 style, for printing or records", busy: true, onClick: vi.fn() } });
    expect(screen.queryByRole("button", { name: /837P/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Creating PDF/ })).toBeDisabled();
  });

  it("shows the save status and notice, and stays out of the PDF", () => {
    setup({ status: <p role="status">Saved</p>, notice: <div role="alert">Billing tax ID is missing</div> });
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("alert")).toHaveTextContent("Billing tax ID is missing");
    expect(screen.getByRole("contentinfo")).toHaveClass("claim-report-no-print");
  });
});
