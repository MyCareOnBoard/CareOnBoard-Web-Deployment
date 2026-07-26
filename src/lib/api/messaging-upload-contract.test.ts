import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { axiosPost, baseQuery } = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  baseQuery: vi.fn(async (_args: unknown): Promise<any> => ({
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
import {
  getConversations as getDedicatedConversations,
  searchUsers,
  uploadAttachment,
} from "./superAdminMessaging";

if (false) {
  // @ts-expect-error Cursor-migrated selected endpoints do not accept page numbers.
  void searchUsers({ page: 2 });
  // @ts-expect-error Cursor-migrated selected endpoints do not accept page numbers.
  void getDedicatedConversations({ page: 2 });
}

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
    baseQuery.mockReset();
    baseQuery.mockResolvedValue({
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
    });
  });

  it("follows guarded conversation continuation until the requested page is filled", async () => {
    baseQuery
      .mockResolvedValueOnce({
        data: {
          success: true,
          conversations: [],
          count: 0,
          pagination: {
            limit: 2,
            count: 0,
            hasMore: true,
            nextCursor: "cursor-1",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          conversations: [
            {
              id: "late-conversation",
              type: "direct",
              participantIds: ["super-1", "employee-a"],
              participants: [],
              unreadCount: 1,
              createdAt: "2026-07-26T00:00:00.000Z",
              updatedAt: "2026-07-26T00:00:00.000Z",
              createdBy: "super-1",
            },
          ],
          count: 1,
          pagination: {
            limit: 2,
            count: 1,
            hasMore: false,
            nextCursor: null,
          },
        },
      });
    const store = configureStore({
      reducer: { [userMessagingApi.reducerPath]: userMessagingApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(userMessagingApi.middleware),
    });

    const result = await store.dispatch(
      userMessagingApi.endpoints.getConversations.initiate({ limit: 2 }),
    ).unwrap();

    expect(result.conversations.map((conversation) => conversation.id)).toEqual(
      ["late-conversation"],
    );
    expect(baseQuery).toHaveBeenCalledTimes(2);
    expect((baseQuery.mock.calls[1]![0] as { url: string }).url).toBe(
      "/userMessaging?limit=2&cursor=cursor-1",
    );
  });

  it("follows guarded contact continuation until the requested page is filled", async () => {
    baseQuery
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [],
          count: 0,
          pagination: {
            limit: 1,
            total: null,
            hasMore: true,
            nextCursor: "contact-cursor",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{
            id: "late-contact",
            uid: "late-contact",
            name: "Late Contact",
            email: "late@example.test",
            role: "Agency Admin",
            isActive: true,
          }],
          count: 1,
          pagination: {
            limit: 1,
            total: null,
            hasMore: false,
            nextCursor: null,
          },
        },
      });
    const store = configureStore({
      reducer: { [userMessagingApi.reducerPath]: userMessagingApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(userMessagingApi.middleware),
    });

    const result = await store.dispatch(
      userMessagingApi.endpoints.getContacts.initiate({ limit: 1 }),
    ).unwrap();

    expect(result.data.map((contact) => contact.uid)).toEqual(["late-contact"]);
    expect(baseQuery).toHaveBeenCalledTimes(2);
    expect((baseQuery.mock.calls[1]![0] as { url: string }).url).toBe(
      "/userMessaging/contacts?limit=1&cursor=contact-cursor",
    );
  });

  it("caps sparse conversation continuation and preserves the next cursor", async () => {
    for (const cursor of ["cursor-1", "cursor-2", "cursor-3"]) {
      baseQuery.mockResolvedValueOnce({
        data: {
          success: true,
          conversations: [],
          count: 0,
          pagination: {
            limit: 5,
            count: 0,
            hasMore: true,
            nextCursor: cursor,
          },
        },
      });
    }
    baseQuery.mockResolvedValueOnce({
      data: {
        success: true,
        conversations: [],
        count: 0,
        pagination: {
          limit: 5,
          count: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    const store = configureStore({
      reducer: { [userMessagingApi.reducerPath]: userMessagingApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(userMessagingApi.middleware),
    });

    const result = await store.dispatch(
      userMessagingApi.endpoints.getConversations.initiate({ limit: 5 }),
    ).unwrap();

    expect(baseQuery).toHaveBeenCalledTimes(2);
    expect(result.pagination).toMatchObject({
      hasMore: true,
      nextCursor: "cursor-2",
    });
  });

  it("deduplicates conversations by ID across a bounded merge", async () => {
    const duplicate = {
      id: "conversation-a",
      type: "direct",
      participantIds: ["super-1", "employee-a"],
      participants: [],
      unreadCount: 1,
      createdAt: "2026-07-26T00:00:00.000Z",
      updatedAt: "2026-07-26T00:00:00.000Z",
      createdBy: "super-1",
    };
    baseQuery
      .mockResolvedValueOnce({
        data: {
          success: true,
          conversations: [duplicate],
          count: 1,
          pagination: {
            limit: 3,
            count: 1,
            hasMore: true,
            nextCursor: "cursor-1",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          conversations: [
            { ...duplicate, unreadCount: 2 },
            { ...duplicate, id: "conversation-b" },
          ],
          count: 2,
          pagination: {
            limit: 2,
            count: 2,
            hasMore: true,
            nextCursor: "cursor-2",
          },
        },
      });
    const store = configureStore({
      reducer: { [userMessagingApi.reducerPath]: userMessagingApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(userMessagingApi.middleware),
    });

    const result = await store.dispatch(
      userMessagingApi.endpoints.getConversations.initiate({ limit: 3 }),
    ).unwrap();

    expect(result.conversations.map(({ id }) => id)).toEqual([
      "conversation-a",
      "conversation-b",
    ]);
    expect(result.conversations[0]?.unreadCount).toBe(2);
    expect(result.pagination?.nextCursor).toBe("cursor-2");
  });

  it("caps sparse contact continuation and preserves the next cursor", async () => {
    for (const cursor of ["contact-1", "contact-2", "contact-3"]) {
      baseQuery.mockResolvedValueOnce({
        data: {
          success: true,
          data: [],
          count: 0,
          pagination: {
            limit: 5,
            count: 0,
            hasMore: true,
            nextCursor: cursor,
          },
        },
      });
    }
    baseQuery.mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
        count: 0,
        pagination: {
          limit: 5,
          count: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    const store = configureStore({
      reducer: { [userMessagingApi.reducerPath]: userMessagingApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(userMessagingApi.middleware),
    });

    const result = await store.dispatch(
      userMessagingApi.endpoints.getContacts.initiate({ limit: 5 }),
    ).unwrap();

    expect(baseQuery).toHaveBeenCalledTimes(2);
    expect(result.pagination).toMatchObject({
      hasMore: true,
      nextCursor: "contact-2",
    });
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
