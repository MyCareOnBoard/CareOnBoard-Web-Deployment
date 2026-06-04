import { describe, it, expect } from "vitest";
import {
  OPERATIONAL_FORM_DEFAULTS,
  agencyOperationalToForm,
  hasOperationalDirtyFields,
  normalizeAllowedFileTypes,
  operationalFormToUpdatePayload,
  parseMaxShiftPerDay,
  parseMileageRate,
  pickOperationalFormValues,
} from "./operational-settings";

describe("normalizeAllowedFileTypes", () => {
  it('expands "all" to pdf, jpg, png', () => {
    expect(normalizeAllowedFileTypes(["all"])).toEqual(["pdf", "jpg", "png"]);
  });

  it('filters standalone "all" when mixed with other values', () => {
    expect(normalizeAllowedFileTypes(["pdf", "all"])).toEqual(["pdf", "jpg", "png"]);
  });

  it("strips invalid file types", () => {
    expect(normalizeAllowedFileTypes(["pdf", "exe"])).toEqual(["pdf"]);
  });
});

describe("pickOperationalFormValues", () => {
  it("fills defaults for partial input", () => {
    expect(pickOperationalFormValues({ mileageRate: 0.5 })).toMatchObject({
      mileageRate: 0.5,
      maxShiftPerDay: "5",
      allowRecurringSchedules: false,
    });
  });
});

describe("parseMileageRate", () => {
  it("returns 0 for NaN", () => {
    expect(parseMileageRate(Number.NaN)).toBe(0);
  });

  it("preserves finite values", () => {
    expect(parseMileageRate(0.67)).toBe(0.67);
  });
});

describe("parseMaxShiftPerDay", () => {
  it("defaults invalid values to 5", () => {
    expect(parseMaxShiftPerDay("")).toBe(5);
    expect(parseMaxShiftPerDay("abc")).toBe(5);
  });

  it("clamps to 1-5", () => {
    expect(parseMaxShiftPerDay("3")).toBe(3);
    expect(parseMaxShiftPerDay("9")).toBe(5);
  });
});

describe("agencyOperationalToForm", () => {
  it("applies defaults for missing agency fields", () => {
    expect(agencyOperationalToForm({})).toEqual(OPERATIONAL_FORM_DEFAULTS);
  });

  it("maps stored agency values", () => {
    expect(
      agencyOperationalToForm({
        maxShiftPerDay: 2,
        travelTimeRules: "30 min",
        mileageRate: 0.58,
        whoReceivesNotifications: "manager",
        allowedFileTypes: ["pdf"],
        allowRecurringSchedules: true,
        allowOverlappingVisits: false,
        offerMileageReimbursements: true,
        realtimeGpsTracking: false,
      }),
    ).toMatchObject({
      maxShiftPerDay: "2",
      travelTimeRules: "30 min",
      mileageRate: 0.58,
      whoReceivesNotifications: "manager",
      allowedFileTypes: ["pdf"],
      allowRecurringSchedules: true,
      offerMileageReimbursements: true,
    });
  });
});

describe("operationalFormToUpdatePayload", () => {
  it("nulls empty optional strings", () => {
    const payload = operationalFormToUpdatePayload({
      ...OPERATIONAL_FORM_DEFAULTS,
      travelTimeRules: "  ",
      whoReceivesNotifications: "",
    });
    expect(payload.travelTimeRules).toBeNull();
    expect(payload.whoReceivesNotifications).toBeNull();
  });
});

describe("hasOperationalDirtyFields", () => {
  it("returns false when no operational fields are dirty", () => {
    expect(hasOperationalDirtyFields({ name: true } as never)).toBe(false);
  });

  it("returns true when an operational field is dirty", () => {
    expect(hasOperationalDirtyFields({ mileageRate: true })).toBe(true);
  });
});
