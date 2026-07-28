import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarShiftPage, CompactCalendarShift } from "@/lib/api/shifts";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";

const listCalendarShifts = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/shifts", () => ({ listCalendarShifts }));

import SuperAdminShiftsCalendar from "./SuperAdminShiftsCalendar";

function agency(id: string, name: string, supportedClientTypes: readonly ("ddd" | "hha")[] = ["ddd", "hha"]): OperationalAgencySummary {
  return { id, name, status: "active", supportedClientTypes, timezone: "America/New_York" };
}

function shift(id: string, date: string, overrides: Partial<CompactCalendarShift> = {}): CompactCalendarShift {
  return {
    id,
    date,
    startTime: "09:00",
    endTime: "12:00",
    status: "pending" as CompactCalendarShift["status"],
    clientId: `client-${id}`,
    clientName: `Client ${id}`,
    employeeId: `staff-${id}`,
    staffName: `Staff ${id}`,
    serviceCode: "H2021",
    ...overrides,
  };
}

function page(shifts: CompactCalendarShift[], nextCursor: string | null = null, month = "2026-08"): CalendarShiftPage {
  return { month, shifts, nextCursor };
}

function abortable<T>(signal: AbortSignal | undefined, work: () => Promise<T>): Promise<T> {
  if (!signal) return work();
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    void work().then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

describe("SuperAdminShiftsCalendar", () => {
  const navigate = vi.fn();

  beforeEach(() => {
    listCalendarShifts.mockReset();
    navigate.mockReset();
    vi.mocked(useNavigate).mockReturnValue(navigate);
  });

  it("issues no request for an explicit empty selection", () => {
    render(
      <SuperAdminShiftsCalendar
        agencies={[]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Choose one or more agencies to view shifts.")).toBeVisible();
    expect(listCalendarShifts).not.toHaveBeenCalled();
  });

  it("keeps at most four agency chains active and consumes pages sequentially", async () => {
    const agencies = Array.from({ length: 6 }, (_, index) => agency(`agency-${index}`, `Agency ${index}`));
    const active = new Set<string>();
    let peak = 0;
    const cursors = new Map<string, Array<string | undefined>>();

    listCalendarShifts.mockImplementation((params, options) => abortable(options?.signal, async () => {
      const seen = cursors.get(params.agencyId) ?? [];
      seen.push(params.cursor);
      cursors.set(params.agencyId, seen);
      active.add(params.agencyId);
      peak = Math.max(peak, active.size);
      await new Promise((resolve) => window.setTimeout(resolve, 5));
      if (!params.cursor) {
        return page([shift(`${params.agencyId}-one`, "2026-08-04")], "next-page");
      }
      active.delete(params.agencyId);
      return page([shift(`${params.agencyId}-two`, "2026-08-05")]);
    }));

    render(
      <SuperAdminShiftsCalendar
        agencies={agencies}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /Open shift details for Client agency-0-one/i })).toBeVisible();
    await waitFor(() => expect(screen.getByText("12 shifts across 6 agencies.")).toBeVisible());
    expect(peak).toBe(4);
    for (const selectedAgency of agencies) {
      expect(cursors.get(selectedAgency.id)).toEqual([undefined, "next-page"]);
    }
  });

  it("retains successful agencies and retries only the failed chain", async () => {
    const atlas = agency("atlas", "Atlas Care");
    const beacon = agency("beacon", "Beacon Supports");
    let beaconAttempts = 0;

    listCalendarShifts.mockImplementation(async (params) => {
      if (params.agencyId === "atlas") return page([shift("atlas-shift", "2026-08-03")]);
      beaconAttempts += 1;
      if (beaconAttempts === 1) throw new Error("Gateway timeout");
      return page([shift("beacon-shift", "2026-08-06")]);
    });

    render(
      <SuperAdminShiftsCalendar
        agencies={[atlas, beacon]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /Open shift details for Client atlas-shift/i })).toBeVisible();
    const retry = await screen.findByRole("button", { name: "Retry Beacon Supports" });
    await userEvent.click(retry);

    expect(await screen.findByRole("button", { name: /Open shift details for Client beacon-shift/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Open shift details for Client atlas-shift/i })).toBeVisible();
    expect(listCalendarShifts.mock.calls.filter(([params]) => params.agencyId === "atlas")).toHaveLength(1);
    expect(beaconAttempts).toBe(2);
  });

  it("skips agencies that do not support the selected mode", async () => {
    listCalendarShifts.mockResolvedValue(page([shift("hha-shift", "2026-08-03")]));

    render(
      <SuperAdminShiftsCalendar
        agencies={[
          agency("hha", "Home Health", ["hha"]),
          agency("ddd", "Community Supports", ["ddd"]),
        ]}
        month="2026-08"
        mode="hha"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /Open shift details for Client hha-shift/i })).toBeVisible();
    expect(screen.getByText("Community Supports does not support HHA.")).toBeVisible();
    expect(listCalendarShifts).toHaveBeenCalledTimes(1);
  });

  it("aborts a stale month generation and never renders its late result", async () => {
    const observedSignals: AbortSignal[] = [];
    listCalendarShifts.mockImplementation((params, options) => {
      observedSignals.push(options.signal);
      if (params.month === "2026-08") {
        return abortable(options.signal, () => new Promise((resolve) => {
          window.setTimeout(() => resolve(page([shift("stale-shift", "2026-08-03")], null, "2026-08")), 50);
        }));
      }
      return Promise.resolve(page([shift("fresh-shift", "2026-09-03")], null, "2026-09"));
    });

    const view = render(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );
    view.rerender(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care")]}
        month="2026-09"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /Open shift details for Client fresh-shift/i })).toBeVisible();
    expect(observedSignals[0]?.aborted).toBe(true);
    expect(screen.queryByText("Client stale-shift")).not.toBeInTheDocument();
  });

  it("preserves calendar state and the owning agency when opening details", async () => {
    listCalendarShifts.mockResolvedValue(page([shift("shared-id", "2026-08-03")]));
    render(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care"), agency("beacon", "Beacon Supports")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    const open = await screen.findAllByRole("button", { name: /Open shift details for Client shared-id/i });
    fireEvent.click(open[0]);

    expect(navigate).toHaveBeenCalledWith(
      "/super-admin/shifts/shared-id?agencyIds=atlas&agencyIds=beacon&month=2026-08&view=calendar&agencyId=atlas",
    );
  });
});
