import { beforeEach, expect, it, vi } from "vitest";
import axiosClient, { axiosClientWithoutAuth } from "@/lib/axios";
import { agencyCareApi } from "@/lib/api/agencyCare";

vi.mock("@/lib/axios", () => ({
  default: { request: vi.fn(), get: vi.fn(), patch: vi.fn() },
  axiosClientWithoutAuth: { request: vi.fn() },
}));
beforeEach(() => {
  vi.clearAllMocks();
});

it("sends organization selection and cancellation on exact-version commands and rejects malformed envelopes", async () => {
  const signal = new AbortController().signal;
  vi.mocked(axiosClient.request).mockResolvedValueOnce({
    data: { success: true, data: { id: "submission" } },
  } as never);
  await agencyCareApi.review(
    "submission",
    {
      versionId: "frozen-v2",
      expectedRevision: 4,
      decision: "reject",
      comment: "Needs clarification",
      operationId: "review-op",
    },
    { agencyKey: "internal:sc", signal },
  );
  expect(axiosClient.request).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "post",
      url: "/agencyCare/submissions/submission/reviews",
      params: { agencyKey: "internal:sc" },
      signal,
      data: expect.objectContaining({
        versionId: "frozen-v2",
        expectedRevision: 4,
      }),
    }),
  );
  vi.mocked(axiosClient.request).mockResolvedValueOnce({
    data: { success: false },
  } as never);
  await expect(agencyCareApi.me({ signal })).rejects.toThrow(
    "Agency Care is unavailable.",
  );
});

it("keeps notification list and individual writes scoped by care kind and selected organization", async () => {
  vi.mocked(axiosClient.get).mockResolvedValue({
    data: { notifications: [] },
  } as never);
  vi.mocked(axiosClient.patch).mockResolvedValue({ data: {} } as never);
  await agencyCareApi.notifications({ agencyKey: "external:org" });
  await agencyCareApi.readNotification("notice", { agencyKey: "external:org" });
  expect(axiosClient.get).toHaveBeenCalledWith(
    "/notifications",
    expect.objectContaining({
      params: expect.objectContaining({
        agencyKey: "external:org",
        sourceKind: "agency_care",
        surface: "care_on_board",
        limit: 50,
      }),
    }),
  );
  expect(axiosClient.patch).toHaveBeenCalledWith(
    "/notifications/notice/read",
    {},
    expect.objectContaining({
      params: expect.objectContaining({
        agencyKey: "external:org",
        sourceKind: "agency_care",
      }),
    }),
  );
});

it("uses the unauthenticated preview only for public invitations and never treats HTML as a document", async () => {
  vi.mocked(axiosClientWithoutAuth.request).mockResolvedValue({
    data: {
      success: true,
      data: { valid: true, status: "pending", verified: false },
    },
  } as never);
  await agencyCareApi.invitationPreview("opaque-token", undefined, true);
  expect(axiosClient.request).not.toHaveBeenCalled();
  expect(axiosClientWithoutAuth.request).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/agencyCare/invitations/opaque-token/preview",
    }),
  );
  vi.mocked(axiosClient.get).mockResolvedValue({
    data: new Blob(["html"], { type: "text/html" }),
  } as never);
  await expect(
    agencyCareApi.versionContent("s", "v2", { agencyKey: "external:org" }),
  ).rejects.toThrow("This document cannot be previewed here.");
});
