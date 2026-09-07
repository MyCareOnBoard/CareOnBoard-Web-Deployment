import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Care-On-Board and Care Connect share the `notifications` collection — deliberately, so
 * both get the email/push delivery trigger and one set of preference switches — and the
 * same uid is routinely both, since `applicant`, `employee` and `agency_staff` are all
 * Care Connect account types. Without a surface filter, a DSP with a Care Connect profile
 * saw booking requests in this bell, and "clear all" here cleared their Care Connect ones.
 *
 * The exclusion is by the Care Connect value rather than by requiring `care_on_board`, so
 * notifications written before the field existed still show. That is the case worth
 * pinning: getting it backwards would empty every existing user's bell.
 */

const mocks = vi.hoisted(() => ({
  batchUpdate: vi.fn(),
  batchCommit: vi.fn(async () => undefined),
  getDocs: vi.fn(),
  subscriptions: [] as Array<{ next: (snapshot: any) => void; error: (error: Error) => void }>,
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { uid: "dsp-1", userType: "employee" } }),
}));

vi.mock("../firebase-firestore", () => ({ db: {} }));

vi.mock("firebase/firestore", () => {
  class Timestamp {
    toDate() {
      return new Date(0);
    }
  }
  return {
    Timestamp,
    collection: vi.fn(() => ({})),
    query: vi.fn((...parts: unknown[]) => parts),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
    doc: vi.fn((_db: unknown, _path: string, id: string) => ({ id })),
    getDocs: mocks.getDocs,
    serverTimestamp: vi.fn(() => "server-time"),
    updateDoc: vi.fn(async () => undefined),
    writeBatch: vi.fn(() => ({ update: mocks.batchUpdate, commit: mocks.batchCommit })),
    onSnapshot: vi.fn((
      _query: unknown,
      next: (snapshot: any) => void,
      error: (caught: Error) => void,
    ) => {
      mocks.subscriptions.push({ next, error });
      return vi.fn();
    }),
  };
});

import { useNotifications } from "./useNotifications";

/** `surface: undefined` is what every notification written before the field looks like. */
function notificationDoc(
  id: string,
  surface: string | undefined,
  status: "unread" | "read" = "unread",
) {
  return {
    id,
    ref: { id },
    data: () => ({
      uid: "dsp-1",
      surface,
      title: id,
      message: "…",
      type: surface === "care_connect" ? "careconnect_booking_requested" : "shift_created",
      category: "shift",
      priority: "normal",
      status,
      cleared: false,
      createdAt: "2026-07-26T00:00:00.000Z",
    }),
  };
}

const MIXED = [
  notificationDoc("cob-legacy", undefined),
  notificationDoc("cob-new", "care_on_board"),
  notificationDoc("careconnect", "care_connect"),
];

function emit(docs: ReturnType<typeof notificationDoc>[]) {
  act(() => {
    mocks.subscriptions[0].next({ docs });
  });
}

beforeEach(() => {
  mocks.subscriptions.length = 0;
  mocks.batchUpdate.mockClear();
  mocks.batchCommit.mockClear();
  mocks.getDocs.mockReset();
});

describe("useNotifications surface scoping", () => {
  it("lists Care-On-Board notifications, including ones written before the field", async () => {
    const { result } = renderHook(() => useNotifications());
    emit(MIXED);

    await waitFor(() =>
      expect(result.current.notifications.map((n) => n.id)).toEqual(["cob-legacy", "cob-new"]),
    );
  });

  it("hides Care Connect notifications", async () => {
    const { result } = renderHook(() => useNotifications());
    emit(MIXED);

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(result.current.notifications.some((n) => n.id === "careconnect")).toBe(false);
  });

  it("counts only its own unread, so the badge matches the list", async () => {
    const { result } = renderHook(() => useNotifications());
    emit(MIXED);

    await waitFor(() => expect(result.current.unreadCount).toBe(2));
  });

  it("still honours the in-app preference alongside the surface filter", async () => {
    const { result } = renderHook(() => useNotifications());
    act(() => {
      mocks.subscriptions[0].next({
        docs: [
          notificationDoc("cob-new", "care_on_board"),
          {
            ...notificationDoc("cob-muted", "care_on_board"),
            data: () => ({
              ...notificationDoc("cob-muted", "care_on_board").data(),
              deliveredVia: { inApp: false },
            }),
          },
        ],
      });
    });

    await waitFor(() => expect(result.current.notifications.map((n) => n.id)).toEqual(["cob-new"]));
  });

  it("marks all read without touching Care Connect rows", async () => {
    const { result } = renderHook(() => useNotifications());
    emit(MIXED);
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    await act(async () => {
      await result.current.markAllAsRead();
    });

    // It works from the already-filtered list, so Care Connect is excluded by construction.
    const updatedIds = mocks.batchUpdate.mock.calls.map(([ref]) => ref.id);
    expect(updatedIds.sort()).toEqual(["cob-legacy", "cob-new"]);
  });

  it("clears all without clearing Care Connect rows", async () => {
    // clearAll re-queries rather than using the loaded list, so it filters separately —
    // the one place where getting this wrong would clear the other product's bell.
    mocks.getDocs.mockResolvedValue({ docs: MIXED });

    const { result } = renderHook(() => useNotifications());
    emit(MIXED);
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    await act(async () => {
      await result.current.clearAll();
    });

    const clearedIds = mocks.batchUpdate.mock.calls.map(([ref]) => ref.id);
    expect(clearedIds.sort()).toEqual(["cob-legacy", "cob-new"]);
    expect(clearedIds).not.toContain("careconnect");
  });
});
