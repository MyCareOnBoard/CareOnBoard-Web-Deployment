import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi, type CareNetwork, type CareSubmission, type CareVersion } from "@/lib/api/agencyCare";
import { CareSubmissionDetail, CareSubmissionsPage } from "./CareSubmissions";

vi.unmock("react-router");
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api/agencyCare", () => ({ agencyCareApi: {
  submission: vi.fn(), submissions: vi.fn(), versions: vi.fn(), versionContent: vi.fn(), review: vi.fn(),
} }));

const network: CareNetwork = { id: "network", client: { id: "john", name: "John Smith" }, sourceClient: { clientId: "john", agencyId: "sc", program: "sc" }, lifecycle: "active", revision: 1, permissionRevision: 1, reviewer: true, capabilities: ["view", "review"] };
const props = { network, scope: "me|internal:sc|network", agencyKey: "internal:sc", refreshNetwork: vi.fn() };
const historical: CareVersion = { id: "v1", number: 1, createdAt: "2026-10-01", body: { kind: "service_update", serviceDate: "2026-10-01", summary: "Historical version from the notification" } };
const current: CareVersion = { id: "v2", number: 2, createdAt: "2026-10-08", body: { kind: "service_update", serviceDate: "2026-10-08", summary: "Current submitted service update" } };
const item: CareSubmission = { id: "submission", networkId: network.id, kind: "care_update", title: "Service update", category: "service_update", audience: [{ agencyKey: props.agencyKey }], submitterAgencyKey: "internal:provider", reviewStatus: "pending_review", syncStatus: "not_required", currentVersionId: current.id, draftVersionId: null, revision: 9, currentVersion: current, capabilities: ["view", "review"] };

beforeEach(() => {
  vi.resetAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:private-preview");
  URL.revokeObjectURL = vi.fn();
  vi.mocked(agencyCareApi.submission).mockResolvedValue(item);
  vi.mocked(agencyCareApi.versions).mockResolvedValue({ items: [historical], nextCursor: null });
  vi.mocked(agencyCareApi.versionContent).mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));
});

it("consumes the exact notification version URL only after validating its parent client workspace", async () => {
  let finish!: (value: CareSubmission) => void;
  vi.mocked(agencyCareApi.submission).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<MemoryRouter initialEntries={["/updates?submission=submission&version=v1"]}><CareSubmissionsPage {...props} kind="care_update" /></MemoryRouter>);
  expect(agencyCareApi.versions).not.toHaveBeenCalled();
  await act(async () => finish(item));
  expect(await screen.findByText(historical.body!.summary)).toBeVisible();
  expect(screen.getByText(current.body!.summary)).toBeVisible();
  expect(screen.getByText(/This notification refers to version 1.*Review actions below apply to the current submitted version/)).toBeVisible();
  expect(agencyCareApi.versions).toHaveBeenCalledWith(item.id, expect.objectContaining({ version: "v1", agencyKey: props.agencyKey, signal: expect.any(AbortSignal) }));
  expect(vi.mocked(agencyCareApi.versions).mock.calls[0][1]).not.toHaveProperty("cursor");
  expect(agencyCareApi.submissions).not.toHaveBeenCalled();
  expect(agencyCareApi.versionContent).not.toHaveBeenCalled();
});

it("previews the selected historical file through the existing private preview only after a click", async () => {
  const document: CareSubmission = { ...item, kind: "document", currentVersion: { ...current, body: undefined, file: { fileName: "current-v2.pdf", mimeType: "application/pdf", sizeBytes: 1024 } } };
  vi.mocked(agencyCareApi.submission).mockResolvedValue(document);
  vi.mocked(agencyCareApi.versions).mockResolvedValue({ items: [{ ...historical, body: undefined, file: { fileName: "historical-v1.pdf", mimeType: "application/pdf", sizeBytes: 1024 } }], nextCursor: null });
  render(<CareSubmissionDetail {...props} submissionId={item.id} requestedVersionId="v1" onBack={() => {}} />);
  expect(await screen.findByText("historical-v1.pdf")).toBeVisible();
  expect(agencyCareApi.versionContent).not.toHaveBeenCalled();
  const panel = screen.getByRole("heading", { name: "Version linked to your notification" }).closest("section")!;
  fireEvent.click(within(panel).getByRole("button", { name: "View file" }));
  await waitFor(() => expect(agencyCareApi.versionContent).toHaveBeenCalledWith(item.id, "v1", expect.objectContaining({ agencyKey: props.agencyKey, signal: expect.any(AbortSignal) })));
  expect(await screen.findByRole("dialog", { name: "Service update · Version 1" })).toBeVisible();
});

it("explains an unavailable exact version without replacing it with another version or fetching private content", async () => {
  vi.mocked(agencyCareApi.versions).mockResolvedValue({ items: [], nextCursor: null });
  render(<CareSubmissionDetail {...props} submissionId={item.id} requestedVersionId="denied" onBack={() => {}} />);
  expect(await screen.findByRole("heading", { name: "This version is no longer available" })).toBeVisible();
  expect(screen.getByText(current.body!.summary)).toBeVisible();
  expect(screen.queryByText(historical.body!.summary)).not.toBeInTheDocument();
  expect(agencyCareApi.versionContent).not.toHaveBeenCalled();
});

it("never requests exact version metadata or content from a submission belonging to another client", async () => {
  vi.mocked(agencyCareApi.submission).mockResolvedValue({ ...item, networkId: "different-client" });
  render(<CareSubmissionDetail {...props} submissionId={item.id} requestedVersionId="v1" onBack={() => {}} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("This submission is unavailable in this client workspace.");
  expect(agencyCareApi.versions).not.toHaveBeenCalled();
  expect(agencyCareApi.versionContent).not.toHaveBeenCalled();
});

it("keeps review commands pinned to the current submitted version while showing a historical notification", async () => {
  vi.mocked(agencyCareApi.review).mockResolvedValue({ ...item, reviewStatus: "approved", revision: 10 });
  render(<CareSubmissionDetail {...props} submissionId={item.id} requestedVersionId="v1" onBack={() => {}} />);
  await screen.findByText(historical.body!.summary);
  fireEvent.click(screen.getByRole("button", { name: "Approve exact version" }));
  expect(screen.getByRole("dialog", { name: "Approve · Version 2" })).toBeVisible();
  fireEvent.submit(screen.getByRole("button", { name: "Confirm action" }).closest("form")!);
  await waitFor(() => expect(agencyCareApi.review).toHaveBeenCalledWith(item.id, expect.objectContaining({ versionId: "v2", expectedRevision: 9, decision: "approve" }), expect.objectContaining({ agencyKey: props.agencyKey, signal: expect.any(AbortSignal) })));
});

it("labels the current submitted version when it is the exact notification target", async () => {
  vi.mocked(agencyCareApi.versions).mockResolvedValue({ items: [current], nextCursor: null });
  render(<CareSubmissionDetail {...props} submissionId={item.id} requestedVersionId="v2" onBack={() => {}} />);
  expect(await screen.findByText("This is the version linked to your notification.")).toBeVisible();
  expect(screen.getAllByText(current.body!.summary)).toHaveLength(1);
  expect(screen.queryByRole("heading", { name: "Version linked to your notification" })).not.toBeInTheDocument();
});
