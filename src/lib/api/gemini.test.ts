import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());

vi.mock("../axios", () => ({
  default: { post },
}));

import { getGeminiLiveTranscriptionToken } from "./gemini";

describe("getGeminiLiveTranscriptionToken", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("posts to the authenticated live transcription token endpoint", async () => {
    const connection = {
      token: "ephemeral-token",
      model: "gemini-3.5-transcribe-live" as const,
      config: {
        responseModalities: ["TEXT"] as ["TEXT"],
        inputAudioTranscription: { languageCodes: [], mode: "SMART" as const },
      },
      expiresAt: "2026-09-03T00:11:00.000Z",
      newSessionExpiresAt: "2026-09-03T00:01:00.000Z",
    };
    post.mockResolvedValue({ data: connection });

    await expect(getGeminiLiveTranscriptionToken()).resolves.toEqual(connection);
    expect(post).toHaveBeenCalledWith("/gemini/live-transcription-token");
  });
});
