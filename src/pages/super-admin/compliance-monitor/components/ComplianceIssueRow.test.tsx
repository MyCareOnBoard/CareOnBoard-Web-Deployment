import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ComplianceIssue } from "../complianceApi";
import ComplianceIssueRow from "./ComplianceIssueRow";

const issue: ComplianceIssue = {
  id: "issue-1",
  userId: "user-1",
  userName: "Avery Johnson",
  userEmail: "avery@example.com",
  agencyId: "agency-1",
  agencyName: "Bright Care",
  status: "open",
  issueType: "expired_document",
  documentType: "CPR certification",
  details: "Certification expired",
  fileUrl: "https://example.com/cpr.pdf",
  expiryStatus: "Expired",
  createdAt: "2026-07-20T12:00:00.000Z",
};

function renderRow(overrides = {}) {
  const props = {
    issue,
    category: "documents" as const,
    expanded: false,
    sending: false,
    onToggle: vi.fn(),
    onViewDocument: vi.fn(),
    onViewClient: vi.fn(),
    onSendAlert: vi.fn(),
    ...overrides,
  };
  render(<ComplianceIssueRow {...props} />);
  return props;
}

describe("ComplianceIssueRow", () => {
  it("uses one adaptive issue tree with an accessible disclosure", () => {
    const props = renderRow();

    expect(screen.getAllByText("Bright Care")).toHaveLength(1);
    expect(screen.getAllByText("CPR certification")).toHaveLength(1);

    const row = screen.getByTestId("compliance-issue-row");
    const actions = screen.getByTestId("compliance-issue-actions");
    expect(row).toHaveClass(
      "min-w-0",
      "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)]",
    );
    expect(actions).toHaveClass("min-w-0", "flex-wrap");

    const content = row.textContent || "";
    expect(content.indexOf("Bright Care")).toBeGreaterThan(
      content.indexOf("Avery Johnson"),
    );
    expect(content.indexOf("CPR certification")).toBeGreaterThan(
      content.indexOf("Bright Care"),
    );
    expect(content.indexOf("Expired")).toBeGreaterThan(
      content.indexOf("CPR certification"),
    );
    expect(
      screen.getByRole("button", {
        name: "Show details for Avery Johnson",
      }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("compliance-issue-details")).toHaveClass(
      "hidden",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show details for Avery Johnson",
      }),
    );
    expect(props.onToggle).toHaveBeenCalledOnce();
  });

  it("reveals details and exposes touch-sized document and alert actions", () => {
    const props = renderRow({ expanded: true });

    expect(screen.getByTestId("compliance-issue-details")).not.toHaveClass(
      "hidden",
    );
    expect(
      screen.getByRole("button", {
        name: "View CPR certification for Avery Johnson",
      }),
    ).toHaveClass("h-11");
    expect(
      screen.getByRole("button", {
        name: "Send compliance alert to Avery Johnson",
      }),
    ).toHaveClass("h-11");

    fireEvent.click(
      screen.getByRole("button", {
        name: "View CPR certification for Avery Johnson",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Send compliance alert to Avery Johnson",
      }),
    );
    expect(props.onViewDocument).toHaveBeenCalledWith(issue);
    expect(props.onSendAlert).toHaveBeenCalledWith(issue);
  });

  it("shows progress only for the active issue and labels alerted issues", () => {
    const { rerender } = render(
      <ComplianceIssueRow
        issue={issue}
        category="documents"
        expanded
        sending
        onToggle={vi.fn()}
        onViewDocument={vi.fn()}
        onViewClient={vi.fn()}
        onSendAlert={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Sending compliance alert to Avery Johnson",
      }),
    ).toBeDisabled();

    rerender(
      <ComplianceIssueRow
        issue={{ ...issue, status: "alerted" }}
        category="documents"
        expanded
        sending={false}
        onToggle={vi.fn()}
        onViewDocument={vi.fn()}
        onViewClient={vi.fn()}
        onSendAlert={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Compliance alert sent to Avery Johnson",
      }),
    ).toBeDisabled();
  });

  it("offers View client and Send alert for client compliance", () => {
    const clientIssue: ComplianceIssue = {
      ...issue,
      id: "client-form485-client-1",
      userId: "client-1",
      subjectType: "client",
      clientId: "client-1",
      userName: "Jordan Lee",
      userEmail: "",
      documentType: "Form 485",
      issueType: "incomplete",
      expiryStatus: "Unsigned - overdue",
    };
    const props = renderRow({ issue: clientIssue, expanded: true });

    expect(
      screen.getByRole("button", { name: "View client Jordan Lee" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Send compliance alert to Jordan Lee",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /View Form 485/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "View client Jordan Lee" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Send compliance alert to Jordan Lee",
      }),
    );
    expect(props.onViewClient).toHaveBeenCalledWith(clientIssue);
    expect(props.onSendAlert).toHaveBeenCalledWith(clientIssue);
  });

  it("shows sending progress for a client compliance alert", () => {
    const clientIssue: ComplianceIssue = {
      ...issue,
      id: "client-form485-client-1",
      userId: "client-1",
      subjectType: "client",
      clientId: "client-1",
      userName: "Jordan Lee",
      userEmail: "",
      documentType: "Form 485",
      issueType: "incomplete",
      expiryStatus: "Unsigned - overdue",
    };

    renderRow({ issue: clientIssue, expanded: true, sending: true });

    expect(
      screen.getByRole("button", {
        name: "Sending compliance alert to Jordan Lee",
      }),
    ).toBeDisabled();
  });
});
