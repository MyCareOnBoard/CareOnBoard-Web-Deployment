import { describe, expect, it } from "vitest";
import { ShiftStatus, type Shift } from "@/lib/api/shifts";
import {
  boardStatus,
  clientRef,
  clock24,
  clockSummary,
  formatDuration,
  groupOutings,
  outingStatus,
  scheduledMinutes,
  serviceLabel,
} from "./shift-board";

const future = new Date(Date.now() + 2 * 86400000).toLocaleDateString("en-CA");
const past = new Date(Date.now() - 2 * 86400000).toLocaleDateString("en-CA");

function shift(id: string, extra: Partial<Shift> = {}): Shift {
  return { id, date: future, startTime: "09:00 AM", endTime: "03:00 PM", status: ShiftStatus.PENDING, ...extra } as Shift;
}

describe("shift board helpers", () => {
  it("maps shifts to the four board states", () => {
    expect(boardStatus(shift("a"))).toBe("scheduled");
    expect(boardStatus(shift("b", { status: ShiftStatus.ONGOING, clockedInAt: new Date().toISOString() }))).toBe("active");
    expect(boardStatus(shift("c", { status: ShiftStatus.COMPLETED }))).toBe("completed");
    expect(boardStatus(shift("d", { status: ShiftStatus.EXPIRED }))).toBe("missed");
    expect(boardStatus(shift("e", { date: past }))).toBe("missed");
  });

  it("formats times and lengths, including shifts past midnight", () => {
    expect(clock24("09:00 AM")).toBe("09:00");
    expect(clock24("10.30:PM")).toBe("22:30");
    expect(scheduledMinutes({ startTime: "09:00 AM", endTime: "03:00 PM" })).toBe(360);
    expect(scheduledMinutes({ startTime: "10:00 PM", endTime: "06:00 AM" })).toBe(480);
    expect(formatDuration(360)).toBe("6 h");
    expect(formatDuration(183)).toBe("3 h 3 min");
    expect(formatDuration(45)).toBe("45 min");
  });

  it("reports clock times and worked minutes", () => {
    const start = new Date(2026, 10, 24, 8, 2);
    const end = new Date(2026, 10, 24, 11, 5);
    expect(clockSummary({ clockedInAt: start.toISOString(), clockedOutAt: end.toISOString() })).toEqual({ clockIn: "08:02", clockOut: "11:05", workedMinutes: 183 });
    expect(clockSummary({})).toEqual({ clockIn: null, clockOut: null, workedMinutes: null });
  });

  it("names clients by DDD number and services by the client's service name", () => {
    const withDdd = shift("a", { client: { id: "c1", dddId: "55120", services: [{ id: "s", code: "H2014", name: "Day habilitation" }] } as never, serviceCode: "H2014" });
    expect(clientRef(withDdd)).toBe("DDD-55120");
    expect(serviceLabel(withDdd)).toBe("Day habilitation (H2014)");
    expect(clientRef(shift("b", { clientId: "abcdef123" }))).toBe("#ABCDEF");
  });

  it("groups a group outing's shifts into one row and leaves lone shifts alone", () => {
    const items = groupOutings([
      shift("1"),
      shift("2", { ciSessionId: "o1" }),
      shift("3", { ciSessionId: "o1" }),
      shift("4", { ciSessionId: "o2" }),
      shift("5", { ciSessionId: "o1" }),
    ]);
    expect(items.map((i) => (i.kind === "outing" ? `outing:${i.shifts.map((s) => s.id).join("")}` : i.shift.id))).toEqual(["1", "outing:235", "4"]);
  });

  it("rolls an outing's status up from its shifts", () => {
    expect(outingStatus([shift("a"), shift("b", { status: ShiftStatus.EXPIRED })])).toBe("missed");
    expect(outingStatus([shift("a"), shift("b", { status: ShiftStatus.ONGOING })])).toBe("active");
    expect(outingStatus([shift("a", { status: ShiftStatus.COMPLETED }), shift("b", { status: ShiftStatus.COMPLETED })])).toBe("completed");
    expect(outingStatus([shift("a"), shift("b", { status: ShiftStatus.COMPLETED })])).toBe("scheduled");
  });
});
