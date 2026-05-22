import { describe, expect, it } from "vitest";
import {
  buildWeeklyDistributionSnapshot,
  computeTotalScheduledHours,
  describeWhyNoShiftsWouldBeBuilt,
  effectiveWeekdaySchedulesForShiftBuild,
  formatWeeklyDistributionDropdownLabel,
  isWeekdayEnabledForSchedule,
  isWeekdayInDateRange,
  parseSdrWeekRange,
  shiftDurationHoursFrom12h,
  validateScheduleAgainstWeeklyDistributionRow,
  weekdayIndicesInDateRange,
} from "./weeklyDistributionSchedule";

describe("weeklyDistributionSchedule", () => {
  it("formatWeeklyDistributionDropdownLabel includes authorized hours", () => {
    expect(
      formatWeeklyDistributionDropdownLabel({
        weekRange: "5/11/2025 - 5/17/2025",
        hours: "10.00 hours",
      }),
    ).toBe("5/11/2025 - 5/17/2025 — 10 hrs");
  });

  it("parseSdrWeekRange parses SDR-style ranges", () => {
    const r = parseSdrWeekRange("5/7/2025 - 5/10/2025");
    expect(r).not.toBeNull();
    expect(r!.start.getFullYear()).toBe(2025);
    expect(r!.start.getMonth()).toBe(4);
    expect(r!.start.getDate()).toBe(7);
    expect(r!.end.getDate()).toBe(10);
  });

  it("shiftDurationHoursFrom12h handles modal time strings", () => {
    expect(shiftDurationHoursFrom12h("09:00:AM", "05:00:PM")).toBe(8);
  });

  it("computeTotalScheduledHours counts only dates inside snapshot week", () => {
    const snapshot = buildWeeklyDistributionSnapshot({
      weekRange: "5/11/2025 - 5/17/2025",
      hours: "10",
    })!;
    const total = computeTotalScheduledHours(
      {
        schedulingType: "recurring",
        startDate: new Date(2025, 4, 10),
        endDate: new Date(2025, 4, 18),
        clockInTime: "09:00:AM",
        clockOutTime: "05:00:PM",
      },
      snapshot,
    );
    expect(total).toBe(56);
  });

  it("computeTotalScheduledHours uses weekday-specific times", () => {
    const snapshot = buildWeeklyDistributionSnapshot({
      weekRange: "5/12/2025 - 5/14/2025",
      hours: "20",
    })!;
    const total = computeTotalScheduledHours(
      {
        schedulingType: "recurring",
        startDate: new Date(2025, 4, 12),
        endDate: new Date(2025, 4, 14),
        clockInTime: "",
        clockOutTime: "",
      },
      snapshot,
      [
        { dayIndex: 1, clockInTime: "09:00:AM", clockOutTime: "12:00:PM" },
        { dayIndex: 3, clockInTime: "01:00:PM", clockOutTime: "05:00:PM" },
      ],
    );
    expect(total).toBe(7);
  });

  it("validateScheduleAgainstWeeklyDistributionRow allows under-cap and blocks over-cap", () => {
    const snapshot = buildWeeklyDistributionSnapshot({
      weekRange: "5/12/2025 - 5/14/2025",
      hours: "5",
    })!;
    const form = {
      schedulingType: "recurring" as const,
      startDate: new Date(2025, 4, 12),
      endDate: new Date(2025, 4, 12),
      clockInTime: "09:00:AM",
      clockOutTime: "12:00:PM",
    };
    expect(
      validateScheduleAgainstWeeklyDistributionRow({ formData: form, snapshot }).ok,
    ).toBe(true);

    const over = validateScheduleAgainstWeeklyDistributionRow({
      formData: {
        ...form,
        clockOutTime: "05:00:PM",
      },
      snapshot,
    });
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.message).toMatch(/exceed authorized hours/);
    }
  });

  it("validateScheduleAgainstWeeklyDistributionRow skips when hours missing", () => {
    const snapshot = buildWeeklyDistributionSnapshot({
      weekRange: "5/12/2025 - 5/14/2025",
      hours: "not a number",
    })!;
    const form = {
      schedulingType: "recurring" as const,
      startDate: new Date(2025, 4, 12),
      endDate: new Date(2025, 4, 14),
      clockInTime: "09:00:AM",
      clockOutTime: "05:00:PM",
    };
    expect(
      validateScheduleAgainstWeeklyDistributionRow({ formData: form, snapshot }).ok,
    ).toBe(true);
  });

  it("describeWhyNoShiftsWouldBeBuilt explains weekday/date range mismatch", () => {
    const message = describeWhyNoShiftsWouldBeBuilt({
      formData: {
        schedulingType: "recurring",
        startDate: new Date(2025, 4, 13),
        endDate: new Date(2025, 4, 14),
        clockInTime: "09:00:AM",
        clockOutTime: "05:00:PM",
      },
      weekdaySchedules: [{ dayIndex: 1, clockInTime: "09:00:AM", clockOutTime: "05:00:PM" }],
      weekdayLabelByIndex: { 1: "Mon" },
      hasAgencyId: true,
      hasAssignedDspId: true,
      action: "schedule",
    });
    expect(message).toMatch(/No shifts fall on the selected weekdays \(Mon\)/);
    expect(message).toMatch(/5\/13\/2025 – 5\/14\/2025/);
  });

  it("weekdayIndicesInDateRange lists days present in range", () => {
    const indices = weekdayIndicesInDateRange(
      new Date(2025, 4, 7),
      new Date(2025, 4, 10),
    );
    expect(indices.has(2)).toBe(false);
    expect(indices.has(3)).toBe(true);
    expect(indices.has(4)).toBe(true);
    expect(indices.has(5)).toBe(true);
    expect(indices.has(6)).toBe(true);
  });

  it("isWeekdayInDateRange allows all days when range unset", () => {
    expect(isWeekdayInDateRange(2, null, null)).toBe(true);
  });

  it("effectiveWeekdaySchedulesForShiftBuild uses picker times for a single weekday", () => {
    const effective = effectiveWeekdaySchedulesForShiftBuild({
      weekdaySchedules: [
        { dayIndex: 3, clockInTime: "09:00:AM", clockOutTime: "12:00:PM" },
      ],
      clockInTime: "09:00:AM",
      clockOutTime: "05:00:PM",
      configuringWeekday: null,
    });
    expect(effective[0]?.clockOutTime).toBe("05:00:PM");
  });

  it("effectiveWeekdaySchedulesForShiftBuild leaves multi-weekday schedules unchanged", () => {
    const schedules = [
      { dayIndex: 1, clockInTime: "09:00:AM", clockOutTime: "12:00:PM" },
      { dayIndex: 3, clockInTime: "10:00:AM", clockOutTime: "01:00:PM" },
    ];
    const effective = effectiveWeekdaySchedulesForShiftBuild({
      weekdaySchedules: schedules,
      clockInTime: "09:00:AM",
      clockOutTime: "05:00:PM",
      configuringWeekday: null,
    });
    expect(effective).toEqual(schedules);
  });

  it("validateScheduleAgainstWeeklyDistributionRow blocks picker-synced over-cap hours", () => {
    const snapshot = buildWeeklyDistributionSnapshot({
      weekRange: "5/7/2025 - 5/10/2025",
      hours: "5.75",
    })!;
    const form = {
      schedulingType: "recurring" as const,
      startDate: new Date(2025, 4, 7),
      endDate: new Date(2025, 4, 10),
      clockInTime: "09:00:AM",
      clockOutTime: "05:00:PM",
    };
    const weekdaySchedules = effectiveWeekdaySchedulesForShiftBuild({
      weekdaySchedules: [
        { dayIndex: 3, clockInTime: "09:00:AM", clockOutTime: "12:00:PM" },
      ],
      clockInTime: form.clockInTime,
      clockOutTime: form.clockOutTime,
      configuringWeekday: null,
    });
    const result = validateScheduleAgainstWeeklyDistributionRow({
      formData: form,
      snapshot,
      weekdaySchedules,
    });
    expect(result.ok).toBe(false);
  });

  it("describeWhyNoShiftsWouldBeBuilt explains missing assigned DSP id", () => {
    const message = describeWhyNoShiftsWouldBeBuilt({
      formData: {
        schedulingType: "one-time",
        startDate: null,
        endDate: null,
        clockInTime: "09:00:AM",
        clockOutTime: "05:00:PM",
      },
      weekdaySchedules: [],
      hasAgencyId: true,
      hasAssignedDspId: false,
      action: "schedule",
    });
    expect(message).toMatch(/assigned DSP/);
  });

  it("capBucketKeyForShiftRequest groups same SDR week and splits different weeks", async () => {
    const { capBucketKeyForShiftRequest } = await import("./weeklyDistributionSchedule");
    const snapshot = buildWeeklyDistributionSnapshot({
      weekRange: "5/7/2025 - 5/10/2025",
      hours: "5.75",
    })!;
    const a = capBucketKeyForShiftRequest(
      { clientId: "c1", serviceCode: "SVC", date: "2025-05-07" },
      snapshot,
    );
    const b = capBucketKeyForShiftRequest(
      { clientId: "c1", serviceCode: "SVC", date: "2025-05-08" },
      snapshot,
    );
    const c = capBucketKeyForShiftRequest(
      { clientId: "c1", serviceCode: "SVC", date: "2025-05-14" },
      snapshot,
    );
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("isWeekdayEnabledForSchedule uses SDR range for one-time with snapshot", async () => {
    const { isWeekdayEnabledForSchedule } = await import("./weeklyDistributionSchedule");
    const snapshot = buildWeeklyDistributionSnapshot({
      weekRange: "5/7/2025 - 5/10/2025",
      hours: "5.75",
    })!;
    const wednesday = new Date(2025, 4, 7);
    expect(
      isWeekdayEnabledForSchedule({
        schedulingType: "one-time",
        dayIndex: 3,
        date: wednesday,
        snapshot,
      }),
    ).toBe(true);
    expect(
      isWeekdayEnabledForSchedule({
        schedulingType: "one-time",
        dayIndex: 4,
        date: wednesday,
        snapshot,
      }),
    ).toBe(true);
    expect(
      isWeekdayEnabledForSchedule({
        schedulingType: "one-time",
        dayIndex: 1,
        date: wednesday,
        snapshot,
      }),
    ).toBe(false);
    expect(
      isWeekdayEnabledForSchedule({
        schedulingType: "one-time",
        dayIndex: 3,
        date: null,
        snapshot,
      }),
    ).toBe(true);
    expect(
      isWeekdayEnabledForSchedule({
        schedulingType: "one-time",
        dayIndex: 6,
        date: null,
        snapshot,
      }),
    ).toBe(true);
    expect(
      isWeekdayEnabledForSchedule({
        schedulingType: "one-time",
        dayIndex: 0,
        date: null,
        snapshot,
      }),
    ).toBe(false);
  });

  it("validateScheduleAgainstWeeklyDistributionRow blocks one-time over-cap inside SDR week", () => {
    const snapshot = buildWeeklyDistributionSnapshot({
      weekRange: "5/7/2025 - 5/10/2025",
      hours: "5.75",
    })!;
    const form = {
      schedulingType: "one-time" as const,
      date: new Date(2025, 4, 7),
      startDate: null,
      endDate: null,
      clockInTime: "09:00:AM",
      clockOutTime: "05:00:PM",
    };
    const result = validateScheduleAgainstWeeklyDistributionRow({
      formData: form,
      snapshot,
      weekdaySchedules: [{ dayIndex: 3, clockInTime: "09:00:AM", clockOutTime: "05:00:PM" }],
    });
    expect(result.ok).toBe(false);
  });
});
