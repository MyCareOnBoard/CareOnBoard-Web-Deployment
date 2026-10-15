import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("../axios", () => ({ default: { post } }));

import { extractScClientOnboardingViaApi } from "./sc-client-extraction";
import { EXTRACT_DOCUMENT_TIMEOUT_MS } from "./gemini";

describe("extractScClientOnboardingViaApi", () => {
  beforeEach(() => { post.mockReset(); });

  it("posts one multipart file with the extraction timeout and cancellation signal", async () => {
    const file = new File(["document"], "njcat.pdf", { type: "application/pdf" });
    const controller = new AbortController();
    post.mockResolvedValue({ data: { draft: {}, warnings: [" Review all fields ", { message: " Low confidence ", path: "dob", code: "review" }, null, { message: "" }, { message: 1 }] } });
    const result = await extractScClientOnboardingViaApi(file, { signal: controller.signal });
    expect(post).toHaveBeenCalledOnce();
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe("/gemini/extract-client-sc-onboarding");
    expect([...body.entries()]).toEqual([["file", file]]);
    expect(config).toMatchObject({ timeout: EXTRACT_DOCUMENT_TIMEOUT_MS, signal: controller.signal });
    const headers = { "Content-Type": "application/json" };
    expect(config.transformRequest[0](body, headers)).toBe(body);
    expect(headers).not.toHaveProperty("Content-Type");
    expect(result.warnings).toEqual([{ message: "Review all fields" }, { message: "Low confidence", path: "dob", code: "review" }]);
  });

  it.each([undefined, null, "unexpected", { message: "unexpected" }])("normalizes non-array warnings safely", async warnings => {
    post.mockResolvedValue({ data: { draft: {}, warnings } });
    expect((await extractScClientOnboardingViaApi(new File([], "client.pdf"))).warnings).toEqual([]);
  });

  it("preserves request errors for the import dialog", async () => {
    const error = new Error("cancelled");
    post.mockRejectedValue(error);
    await expect(extractScClientOnboardingViaApi(new File([], "client.pdf"))).rejects.toBe(error);
  });
});
