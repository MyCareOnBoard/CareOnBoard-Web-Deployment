import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { conversationTime } from "./ConversationList";
import { dayLabel } from "./MessageList";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 9, 15, 0)); });
afterEach(() => vi.useRealTimers());

it("shows the time today, Yesterday, then the date", () => {
  expect(conversationTime(new Date(2026, 10, 9, 14, 20).toISOString())).toBe("2:20 PM");
  expect(conversationTime(new Date(2026, 10, 8, 9, 0).toISOString())).toBe("Yesterday");
  expect(conversationTime(new Date(2026, 10, 3, 9, 0).toISOString())).toBe("Nov 3");
  expect(conversationTime(null)).toBe("");
  expect(conversationTime("not a date")).toBe("");
});

it("labels each day of messages", () => {
  expect(dayLabel(new Date(2026, 10, 9, 8))).toBe("Today");
  expect(dayLabel(new Date(2026, 10, 8, 8))).toBe("Yesterday");
  expect(dayLabel(new Date(2026, 10, 3, 8))).toBe("Tuesday, Nov 3");
});
