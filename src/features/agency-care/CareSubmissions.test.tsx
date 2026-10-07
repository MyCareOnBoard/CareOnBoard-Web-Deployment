import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  agencyCareApi,
  type CareNetwork,
  type CareSubmission,
} from "@/lib/api/agencyCare";
import {
  CareSubmissionDetail,
  CareSubmissionForm,
  validateCareVersion,
} from "./CareSubmissions";

vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: {
    relationships: vi.fn(),
    submission: vi.fn(),
    review: vi.fn(),
    createSubmission: vi.fn(),
    addVersion: vi.fn(),
    sourceDocuments: vi.fn(),
    sourceLinks: vi.fn(),
    publicationOperation: vi.fn(),
  },
}));
const network: CareNetwork = {
  id: "john-network",
  sourceClient: { clientId: "john", agencyId: "sc-agency", program: "sc" },
  client: { id: "john", name: "John" },
  lifecycle: "active",
  revision: 1,
  permissionRevision: 1,
  capabilities: ["view", "submit", "review"],
  reviewer: true,
};
const item: CareSubmission = {
  id: "report",
  networkId: "john-network",
  kind: "care_update",
  title: "Service update",
  category: "service_update",
  audience: [{ agencyKey: "internal:sc-agency" }],
  submitterAgencyKey: "external:provider",
  reviewStatus: "pending_review",
  syncStatus: "not_required",
  currentVersionId: "v2",
  draftVersionId: null,
  revision: 9,
  capabilities: ["view"],
  currentVersion: {
    id: "v2",
    number: 2,
    createdAt: "2026-10-07",
    body: {
      kind: "service_update",
      serviceDate: "2026-10-06",
      summary: "Selected care update",
    },
  },
};
const props = {
  network,
  scope: "uid|external:provider|john-network",
  agencyKey: "external:provider",
  refreshNetwork: vi.fn(),
};
beforeEach(() => {
  vi.mocked(agencyCareApi.sourceLinks).mockResolvedValue({
    items: [],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({
    items: [
      {
        agencyKey: "internal:sc-agency",
        name: "SC agency",
        state: "active",
        revision: 1,
      },
    ],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.submission).mockResolvedValue(item);
});

it("blocks reauthorization until the current exact destination is confirmed and acknowledged", async () => {
  const operation = {
    id: "withheld-op",
    destinationClientId: "provider-john",
    program: "hha",
    status: "withheld",
    capabilities: ["reauthorize"],
  };
  const approved = {
    ...item,
    reviewStatus: "approved",
    publicationOperations: [operation],
    capabilities: ["view", "review"],
  };
  vi.mocked(agencyCareApi.submission).mockResolvedValue(approved);
  render(
    <CareSubmissionDetail {...props} submissionId="report" onBack={() => {}} />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Reauthorize destination" }),
  );
  await screen.findByText(
    "No matching current confirmed destination is available in this page. Review the care team connection before continuing.",
  );
  expect(screen.getByRole("button", { name: "Confirm action" })).toBeDisabled();
  expect(agencyCareApi.publicationOperation).not.toHaveBeenCalled();
});

it("creates a first destination operation only for a confirmed original audience pin after explicit confirmation", async () => {
  const approved = {
    ...item,
    reviewStatus: "approved",
    audience: [
      ...item.audience,
      { agencyKey: "internal:provider-agency", acceptanceId: "original-pin" },
    ],
    publicationOperations: [],
    capabilities: ["view", "review"],
  };
  vi.mocked(agencyCareApi.submission).mockResolvedValue(approved);
  vi.mocked(agencyCareApi.sourceLinks).mockResolvedValue({
    items: [
      {
        clientId: "provider-john",
        agencyId: "provider-agency",
        agencyKey: "internal:provider-agency",
        clientName: "John",
        programs: ["hha"],
        state: "confirmed",
        revision: 3,
        acceptanceId: "original-pin",
        confirmationId: "confirmed-current",
        confirmedAt: "2026-10-07",
      },
    ],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.publicationOperation).mockResolvedValue(approved);
  render(
    <CareSubmissionDetail {...props} submissionId="report" onBack={() => {}} />,
  );
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Publish to newly linked record",
    }),
  );
  await screen.findByRole("option", { name: "John · HHA" });
  fireEvent.change(
    await screen.findByLabelText("Newly confirmed destination"),
    { target: { value: "provider-john|hha" } },
  );
  fireEvent.click(
    await screen.findByLabelText(
      "I confirm this currently connected client and program are the intended publication destination.",
    ),
  );
  fireEvent.change(screen.getByLabelText("Reason or instructions"), {
    target: {
      value: "The source client was confirmed after the original approval.",
    },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Confirm action" }).closest("form")!,
  );
  await waitFor(() =>
    expect(agencyCareApi.publicationOperation).toHaveBeenCalledWith(
      "report",
      expect.objectContaining({
        action: "reauthorize",
        destinationClientId: "provider-john",
        program: "hha",
        expectedRevision: 9,
      }),
      expect.objectContaining({ agencyKey: "external:provider" }),
    ),
  );
  expect(
    vi.mocked(agencyCareApi.publicationOperation).mock.calls.at(-1)![1],
  ).not.toHaveProperty("destinationOperationId");
});

it("reauthorizes only the displayed current confirmed program and source client after acknowledgement", async () => {
  const operation = {
    id: "withheld-op",
    destinationClientId: "provider-john",
    program: "hha",
    status: "withheld",
    capabilities: ["reauthorize"],
  };
  const approved = {
    ...item,
    reviewStatus: "approved",
    publicationOperations: [operation],
    capabilities: ["view", "review"],
  };
  vi.mocked(agencyCareApi.submission).mockResolvedValue(approved);
  vi.mocked(agencyCareApi.sourceLinks).mockResolvedValue({
    items: [
      {
        clientId: "provider-john",
        agencyId: "provider-agency",
        agencyKey: "internal:provider-agency",
        clientName: "John",
        programs: ["hha"],
        state: "confirmed",
        revision: 3,
        confirmationId: "confirmed-current",
        confirmedAt: "2026-10-07",
      },
    ],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.publicationOperation).mockResolvedValue(approved);
  render(
    <CareSubmissionDetail {...props} submissionId="report" onBack={() => {}} />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Reauthorize destination" }),
  );
  const confirmation = await screen.findByLabelText(
    "I confirm this currently connected client and program are the intended publication destination.",
  );
  expect(screen.getByRole("button", { name: "Confirm action" })).toBeDisabled();
  fireEvent.click(confirmation);
  fireEvent.change(screen.getByLabelText("Reason or instructions"), {
    target: { value: "The connection has been confirmed again." },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Confirm action" }).closest("form")!,
  );
  await waitFor(() =>
    expect(agencyCareApi.publicationOperation).toHaveBeenCalledWith(
      "report",
      expect.objectContaining({
        action: "reauthorize",
        destinationOperationId: "withheld-op",
        destinationClientId: "provider-john",
        expectedRevision: 9,
        reason: "The connection has been confirmed again.",
      }),
      expect.objectContaining({ agencyKey: "external:provider" }),
    ),
  );
});

it("does not offer a decision because the network role cannot substitute for submission review authority", async () => {
  render(
    <CareSubmissionDetail {...props} submissionId="report" onBack={() => {}} />,
  );
  await screen.findByText("Submitted version 2");
  expect(
    screen.queryByRole("button", { name: "Approve exact version" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Reject version" }),
  ).not.toBeInTheDocument();
});

it("requires a rejection reason and submits the exact displayed version and revision", async () => {
  vi.mocked(agencyCareApi.submission).mockResolvedValue({
    ...item,
    capabilities: ["view", "review"],
  });
  vi.mocked(agencyCareApi.review).mockResolvedValue({
    ...item,
    reviewStatus: "rejected",
    revision: 10,
  });
  render(
    <CareSubmissionDetail {...props} submissionId="report" onBack={() => {}} />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Reject version" }),
  );
  fireEvent.submit(
    screen.getByRole("button", { name: "Confirm action" }).closest("form")!,
  );
  expect(
    await screen.findByText("A reason or instruction is required."),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Reason or instructions"), {
    target: { value: "Service date requires confirmation." },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Confirm action" }).closest("form")!,
  );
  await waitFor(() =>
    expect(agencyCareApi.review).toHaveBeenCalledWith(
      "report",
      expect.objectContaining({
        versionId: "v2",
        expectedRevision: 9,
        decision: "reject",
        comment: "Service date requires confirmation.",
      }),
      expect.objectContaining({ agencyKey: "external:provider" }),
    ),
  );
});

it("keeps a new update summary empty instead of copying private monitoring findings", async () => {
  render(
    <CareSubmissionForm
      {...props}
      kind="care_update"
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
  expect(screen.getByLabelText("Service summary")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Visit update" },
  });
  fireEvent.change(screen.getByLabelText("Service date"), {
    target: { value: "2026-10-05" },
  });
  fireEvent.click(await screen.findByLabelText("SC agency"));
  fireEvent.submit(
    screen.getByRole("button", { name: "Save draft version" }).closest("form")!,
  );
  expect(
    await screen.findByText(
      "Enter a service summary of at most 5,000 characters.",
    ),
  ).toBeVisible();
});

it("rejects date rollover, active file content and empty files before submission", () => {
  expect(
    validateCareVersion("care_update", {
      serviceDate: "2026-02-31",
      summary: "Observed service",
    }),
  ).toBe("Enter a valid service date.");
  expect(
    validateCareVersion("document", {
      file: new File(["<html>"], "care.html", { type: "text/html" }),
    }),
  ).toContain("PDF");
  expect(
    validateCareVersion("document", {
      file: new File([], "empty.pdf", { type: "application/pdf" }),
    }),
  ).toContain("nonempty");
  expect(
    validateCareVersion("care_update", {
      serviceDate: "2026-10-05",
      summary: "Actual service summary",
    }),
  ).toBeNull();
});

it("keeps saved metadata locked when only the content step must be retried", async () => {
  const serverDraft = {
    ...item,
    id: "saved-draft",
    currentVersion: undefined,
    currentVersionId: null,
    reviewStatus: "draft",
    revision: 0,
  };
  vi.mocked(agencyCareApi.createSubmission).mockResolvedValue(serverDraft);
  vi.mocked(agencyCareApi.addVersion)
    .mockRejectedValueOnce({ response: { status: 400 } })
    .mockResolvedValue(serverDraft);
  render(
    <CareSubmissionForm
      {...props}
      kind="care_update"
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Visit update" },
  });
  fireEvent.change(screen.getByLabelText("Service date"), {
    target: { value: "2026-10-05" },
  });
  fireEvent.change(screen.getByLabelText("Service summary"), {
    target: { value: "Transport continuity was confirmed." },
  });
  fireEvent.click(await screen.findByLabelText("SC agency"));
  fireEvent.submit(
    screen.getByRole("button", { name: "Save draft version" }).closest("form")!,
  );
  await screen.findByText(
    "Agency Care could not load this request. Please try again.",
  );
  expect(screen.getByLabelText("Title")).toBeDisabled();
  expect(screen.getByLabelText("Category")).toBeDisabled();
  expect(screen.getByLabelText("SC agency")).toBeDisabled();
  expect(screen.getByLabelText("Service summary")).not.toBeDisabled();
  fireEvent.change(screen.getByLabelText("Service summary"), {
    target: { value: "The service summary was corrected." },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save draft version" }).closest("form")!,
  );
  await waitFor(() =>
    expect(agencyCareApi.addVersion).toHaveBeenCalledTimes(2),
  );
  expect(agencyCareApi.createSubmission).toHaveBeenCalledTimes(1);
});
