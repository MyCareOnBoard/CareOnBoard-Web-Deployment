import { describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@/lib/axios", () => ({ default: { post } }));

import { authorizationsApi } from "../authorizations";

describe("authorizationsApi.sendAlert", () => {
  it("posts an actionable authorization alert to the canonical endpoint", async () => {
    post.mockResolvedValueOnce({ data: { success: true } });

    await authorizationsApi.sendAlert("applicant-1", "drugTest", {
      message: "Please complete the pending drug test requirement.",
    });

    expect(post).toHaveBeenCalledWith(
      "/agencyApplicants/applicant-1/authorizations/drugTest/send-alert",
      {
        message: "Please complete the pending drug test requirement.",
        severity: "high",
      },
    );
  });
});
