import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ServiceHoursUsage } from "@/lib/api/shifts";

const getServiceHoursUsage = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/shifts", () => ({ getServiceHoursUsage }));

import { ServiceHoursRemaining, serviceHoursRemainingLines } from "./ServiceHoursRemaining";

const usage: ServiceHoursUsage = {
  service: { id: "svc1", code: "W1726", name: "Individual Supports" },
  weekly: { capHours: 20, usedHours: 12.5, remainingHours: 7.5, weekStart: "2026-11-22", weekEnd: "2026-11-28" },
  total: {
    capHours: 100,
    usedHours: 6,
    remainingHours: 94,
    unitType: "15 min",
    capUnits: 400,
    usedUnits: 24,
    remainingUnits: 376,
    startDate: "2026-01-01",
    endDate: "2027-03-31",
    source: "units",
  },
};

describe("serviceHoursRemainingLines", () => {
  it("shows weekly hours and authorized units left", () => {
    expect(serviceHoursRemainingLines(usage)).toEqual([
      { text: "This week: 7.5 of 20 h left", exhausted: false },
      { text: "Authorization: 376 of 400 units left (94 h) through Mar 31, 2027", exhausted: false },
    ]);
  });

  it("falls back to hours and flags a used-up limit", () => {
    const lines = serviceHoursRemainingLines({
      service: null,
      weekly: { capHours: 10, usedHours: 12, remainingHours: -2, weekStart: "2026-11-22", weekEnd: "2026-11-28" },
      total: { ...usage.total!, capUnits: null, usedUnits: null, remainingUnits: null, unitType: null, source: "hours" },
    });
    expect(lines).toEqual([
      { text: "This week: 0 of 10 h left", exhausted: true },
      { text: "Authorization: 94 of 100 h left through Mar 31, 2027", exhausted: false },
    ]);
  });

  it("shows nothing when the service has no limits", () => {
    expect(serviceHoursRemainingLines({ service: null, weekly: null, total: null })).toEqual([]);
  });
});

describe("ServiceHoursRemaining", () => {
  it("loads usage for the selected service and date, leaving the edited shift out", async () => {
    getServiceHoursUsage.mockResolvedValue(usage);
    render(
      <ServiceHoursRemaining
        agencyId="agency-1"
        clientId="client-1"
        serviceCode="W1726"
        serviceAuthorizationId="svc1"
        date={new Date(2026, 10, 25)}
        excludeShiftId="shift-9"
      />,
    );
    expect(await screen.findByText("This week: 7.5 of 20 h left")).toBeInTheDocument();
    expect(getServiceHoursUsage).toHaveBeenCalledWith(
      {
        agencyId: "agency-1",
        clientId: "client-1",
        serviceCode: "W1726",
        date: "2026-11-25",
        serviceAuthorizationId: "svc1",
        excludeShiftId: "shift-9",
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("stays quiet when the lookup fails", async () => {
    getServiceHoursUsage.mockImplementation(() => Promise.reject(new Error("offline")));
    const { container } = render(
      <ServiceHoursRemaining agencyId="agency-1" clientId="client-1" serviceCode="W1726" date={null} />,
    );
    expect(getServiceHoursUsage).toHaveBeenCalledTimes(1);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });
});
