import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { axiosPost, baseQuery } = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  baseQuery: vi.fn(async (_args: unknown) => ({
    data: {
      success: true,
      data: {
        fileName: "file.txt",
        fileSize: 4,
        fileType: "text/plain",
        url: "https://example.test/file.txt",
        storagePath: "messages/file.txt",
        uploadedAt: "2026-07-26T00:00:00.000Z",
      },
    },
  })),
}));

vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));
vi.mock("../axios", () => ({ default: { post: axiosPost } }));

import { userMessagingApi } from "./userMessaging";
import { uploadAttachment } from "./superAdminMessaging";

describe("messaging upload contracts", () => {
  beforeEach(() => {
    axiosPost.mockReset();
    axiosPost.mockResolvedValue({
      data: {
        success: true,
        message: "Uploaded",
        attachment: {
          url: "https://example.test/file.txt",
          fileName: "file.txt",
          fileType: "text/plain",
          fileSize: 4,
        },
      },
    });
    baseQuery.mockClear();
  });

  it("includes the encoded conversation ID in live userMessaging uploads", async () => {
    const store = configureStore({
      reducer: { [userMessagingApi.reducerPath]: userMessagingApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(userMessagingApi.middleware),
    });
    const file = new File(["test"], "file.txt", { type: "text/plain" });

    await store.dispatch(
      userMessagingApi.endpoints.uploadAttachment.initiate({
        conversationId: "conversation/a",
        file,
      }),
    );

    expect((baseQuery.mock.calls[0]![0] as { url: string }).url).toBe(
      "/userMessaging/upload?conversationId=conversation%2Fa",
    );
  });

  it("requires the conversation ID in dedicated super-admin uploads", async () => {
    const file = new File(["test"], "file.txt", { type: "text/plain" });

    await (uploadAttachment as unknown as (
      conversationId: string,
      file: File,
    ) => Promise<unknown>)("conversation/a", file);

    expect(axiosPost.mock.calls[0][0]).toBe(
      "/superAdminMessaging/upload?conversationId=conversation%2Fa",
    );
    expect((axiosPost.mock.calls[0][1] as FormData).get("file")).toBe(file);
  });
});
