import { beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { post } }));

import { agencyApplicantsExtraApi } from "../agencyApplicantsExtra";

describe("agencyApplicantsExtraApi.createAuthorizationAlert", () => {
  beforeEach(() => post.mockReset());

  it("uses the canonical authorization-alert endpoint", async () => {
    post.mockResolvedValueOnce({ data: { success: true } });

    await agencyApplicantsExtraApi.createAuthorizationAlert("applicant-1", {
      authorizationType: "drugTest",
      severity: "high",
      message: "Complete the drug test.",
    });

    expect(post).toHaveBeenCalledWith(
      "/agencyApplicants/applicant-1/authorizations/drugTest/send-alert",
      { message: "Complete the drug test.", severity: "high" },
    );
  });
});