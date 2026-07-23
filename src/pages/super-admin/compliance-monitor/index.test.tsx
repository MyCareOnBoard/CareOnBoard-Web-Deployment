import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import {
  useGetComplianceDocumentsQuery,
  useGetComplianceEvvQuery,
  useGetComplianceNotesQuery,
  useGetComplianceOthersQuery,
  useSendClientComplianceAlertMutation,
  useSendComplianceAlertMutation,
} from "./complianceApi";
import { useListAllAgenciesQuery } from "@/pages/super-admin/agencies/api";
import ComplianceMonitor from "./index";

const { routerSearch, navigate } = vi.hoisted(() => ({
  routerSearch: { value: "" },
  navigate: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useLocation: () => ({
      pathname: "/super-admin/compliance-monitor",
      search: routerSearch.value,
      hash: "",
      state: null,
      key: "test",
    }),
    useNavigate: () => navigate,
  };
});

vi.mock("./complianceApi", () => ({
  useGetComplianceDocumentsQuery: vi.fn(),
  useGetComplianceNotesQuery: vi.fn(),
  useGetComplianceEvvQuery: vi.fn(),
  useGetComplianceOthersQuery: vi.fn(),
  useSendClientComplianceAlertMutation: vi.fn(),
  useSendComplianceAlertMutation: vi.fn(),
}));

vi.mock("@/pages/super-admin/agencies/api", () => ({
  useListAllAgenciesQuery: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const issue = {
  id: "issue-1",
  userId: "user-1",
  userName: "Avery Johnson",
  userEmail: "avery@example.com",
  agencyId: "agency-1",
  agencyName: "Bright Care",
  status: "open" as const,
  issueType: "expired_document",
  documentType: "CPR certification",
  details: "Certification expired",
  fileUrl: "https://example.com/cpr.pdf",
  expiryStatus: "Expired",
  createdAt: "2026-07-20T12:00:00.000Z",
};

function successResult(data = [issue], totalPages = 2) {
  return {
    data: {
      success: true,
      data,
      pagination: {
        page: 1,
        limit: 10,
        total: data.length,
        totalPages,
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never;
}

describe("ComplianceMonitor", () => {
  const sendAlert = vi.fn();
  const sendClientAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useListAllAgenciesQuery).mockReturnValue({
      data: {
        agencies: [
          { id: "agency-1", name: "Bright Care", status: "active" },
          { id: "agency-2", name: "Anchor Health", status: "active" },
          { id: "agency-3", name: "Inactive Care", status: "inactive" },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGetComplianceDocumentsQuery).mockReturnValue(successResult());
    vi.mocked(useGetComplianceNotesQuery).mockReturnValue(successResult([]));
    vi.mocked(useGetComplianceEvvQuery).mockReturnValue(successResult([]));
    vi.mocked(useGetComplianceOthersQuery).mockReturnValue(successResult([]));
    sendAlert.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });
    vi.mocked(useSendComplianceAlertMutation).mockReturnValue([
      sendAlert,
      {},
    ] as never);
    sendClientAlert.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          success: true,
          data: { notifiedCount: 1 },
        }),
    });
    vi.mocked(useSendClientComplianceAlertMutation).mockReturnValue([
      sendClientAlert,
      {},
    ] as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderPage(search = "") {
    routerSearch.value = search;

    return render(
      <MemoryRouter>
        <ComplianceMonitor />
      </MemoryRouter>,
    );
  }

  it("matches the dashboard hierarchy and keeps only one category request active", () => {
    renderPage("?agencyId=agency-1&agencyName=Bright+Care");

    expect(screen.getByText("Compliance operations")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Compliance monitor" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Showing compliance issues for Bright Care"),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(useGetComplianceDocumentsQuery).toHaveBeenLastCalledWith(
      { page: 1, limit: 10, agencyId: "agency-1" },
      { skip: false },
    );
    expect(useGetComplianceNotesQuery).toHaveBeenLastCalledWith(
      { page: 1, limit: 10, agencyId: "agency-1" },
      { skip: true },
    );
  });

  it("restores URL filters and applies them to every category query", () => {
    renderPage(
      "?agencyId=agency-1&agencyName=Bright+Care&search=Avery",
    );

    expect(
      screen.getByRole("searchbox", { name: "Search compliance issues" }),
    ).toHaveValue("Avery");
    expect(useListAllAgenciesQuery).toHaveBeenCalledWith({
      limit: 100,
      status: "active",
    });
    expect(useGetComplianceDocumentsQuery).toHaveBeenLastCalledWith(
      {
        page: 1,
        limit: 10,
        agencyId: "agency-1",
        search: "Avery",
      },
      { skip: false },
    );
  });

  it("debounces issue search and persists it in the URL", () => {
    vi.useFakeTimers();
    renderPage();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search compliance issues" }),
      { target: { value: " Avery " } },
    );
    act(() => vi.advanceTimersByTime(350));

    expect(useGetComplianceDocumentsQuery).toHaveBeenLastCalledWith(
      { page: 1, limit: 10, search: "Avery" },
      { skip: false },
    );
    expect(navigate).toHaveBeenCalledWith(
      "/super-admin/compliance-monitor?search=Avery",
      { replace: true },
    );
  });

  it("offers only active agencies and preserves search when one is selected", () => {
    renderPage("?search=Avery");

    fireEvent.click(screen.getByRole("button", { name: "All agencies" }));
    expect(
      screen.getByRole("button", { name: "Bright Care" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Anchor Health" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Inactive Care" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bright Care" }));
    expect(navigate).toHaveBeenCalledWith(
      "/super-admin/compliance-monitor?agencyId=agency-1&agencyName=Bright+Care&search=Avery",
      { replace: true },
    );
  });

  it("clears all filters and retries an unavailable agency selector", () => {
    const retryAgencies = vi.fn();
    vi.mocked(useListAllAgenciesQuery).mockReturnValue({
      isLoading: false,
      isError: true,
      refetch: retryAgencies,
    } as never);
    renderPage(
      "?agencyId=agency-1&agencyName=Bright+Care&search=Avery",
    );

    expect(screen.getByText("Couldn't load agencies.")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Retry agency filter" }),
    );
    expect(retryAgencies).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(navigate).toHaveBeenCalledWith(
      "/super-admin/compliance-monitor",
      { replace: true },
    );
  });

  it("expands one issue and clears disclosure state on page change", () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show details for Avery Johnson",
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "Hide details for Avery Johnson",
      }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Next compliance page" }),
    );
    expect(
      screen.getByRole("button", {
        name: "Show details for Avery Johnson",
      }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("uses dashboard skeletons while the active category loads", () => {
    vi.mocked(useGetComplianceDocumentsQuery).mockReturnValue({
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never);

    renderPage();

    expect(screen.getAllByTestId("compliance-issue-skeleton")).toHaveLength(5);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("keeps an active category failure independently retryable", () => {
    const retry = vi.fn();
    vi.mocked(useGetComplianceDocumentsQuery).mockReturnValue({
      isLoading: false,
      isError: true,
      refetch: retry,
    } as never);

    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Retry document alerts" }),
    );

    expect(retry).toHaveBeenCalledOnce();
  });

  it("shows category-aware empty copy", () => {
    vi.mocked(useGetComplianceDocumentsQuery).mockReturnValue(
      successResult([], 1),
    );

    renderPage();

    expect(
      screen.getByText("No document compliance issues found."),
    ).toBeInTheDocument();
  });

  it("shows mutation progress on only the selected issue", async () => {
    let resolveAlert!: () => void;
    sendAlert.mockReturnValue({
      unwrap: () =>
        new Promise<void>((resolve) => {
          resolveAlert = resolve;
        }),
    });
    renderPage();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Show details for Avery Johnson",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Send compliance alert to Avery Johnson",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: "Sending compliance alert to Avery Johnson",
      }),
    ).toBeDisabled();

    resolveAlert();
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Send compliance alert to Avery Johnson",
        }),
      ).toBeEnabled(),
    );
  });

  it("routes unsigned Form 485 client alerts to client details", () => {
    const clientIssue = {
      ...issue,
      id: "client-form485-client-1",
      userId: "client-1",
      subjectType: "client" as const,
      clientId: "client-1",
      userName: "Jordan Lee",
      userEmail: "",
      documentType: "Form 485",
      issueType: "incomplete",
      expiryStatus: "Unsigned - overdue",
    };
    vi.mocked(useGetComplianceDocumentsQuery).mockReturnValue(
      successResult([clientIssue], 1),
    );

    renderPage();
    expect(
      screen.getByText("Employee documents and client Form 485 issues"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Show details for Jordan Lee" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "View client Jordan Lee" }),
    );

    expect(navigate).toHaveBeenCalledWith("/super-admin/clients/client-1");
  });

  it("sends client Form 485 alerts to agency administrators", async () => {
    const clientIssue = {
      ...issue,
      id: "client-form485-client-1",
      userId: "client-1",
      subjectType: "client" as const,
      clientId: "client-1",
      userName: "Jordan Lee",
      userEmail: "",
      documentType: "Form 485",
      issueType: "incomplete",
      expiryStatus: "Unsigned - overdue",
    };
    vi.mocked(useGetComplianceDocumentsQuery).mockReturnValue(
      successResult([clientIssue], 1),
    );
    sendClientAlert.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          success: true,
          data: { notifiedCount: 1, skippedCount: 1 },
        }),
    });

    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Show details for Jordan Lee" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Send compliance alert to Jordan Lee",
      }),
    );

    expect(sendClientAlert).toHaveBeenCalledWith({ clientId: "client-1" });
    expect(sendAlert).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Alert sent to 1 agency administrator; 1 administrator could not receive it",
      ),
    );
  });

  it("shows a client-alert delivery error from the backend", async () => {
    const clientIssue = {
      ...issue,
      id: "client-form485-client-1",
      userId: "client-1",
      subjectType: "client" as const,
      clientId: "client-1",
      userName: "Jordan Lee",
      userEmail: "",
      documentType: "Form 485",
      issueType: "incomplete",
      expiryStatus: "Unsigned - overdue",
    };
    vi.mocked(useGetComplianceDocumentsQuery).mockReturnValue(
      successResult([clientIssue], 1),
    );
    sendClientAlert.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { error: "No agency administrators found" },
        }),
    });

    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Show details for Jordan Lee" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Send compliance alert to Jordan Lee",
      }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "No agency administrators found",
      ),
    );
  });
});
