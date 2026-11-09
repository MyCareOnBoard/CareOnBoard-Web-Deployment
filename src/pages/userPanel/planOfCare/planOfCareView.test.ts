import { describe, expect, it } from "vitest";
import { clientLabel, filterPlans, formatDate, goalsHref, planOverview, planStatus } from "./planOfCareView";
import type { PlanOfCare } from "./types";

const now = new Date(2026, 10, 9, 12);
const plan = (id: string, overrides: Partial<PlanOfCare> = {}): PlanOfCare => ({
  id, clientId: `${id}xyz123`, agencyId: "a1", clientName: "Jane Doe", serviceName: "Day Habilitation", location: "12 Main St, Trenton",
  planOfCare: { url: "https://storage.googleapis.com/care-on-board.appspot.com/poc.pdf", title: "POC", fileName: "poc.pdf", autoReminder: false, expiryDate: "2027-06-01" },
  ...overrides,
});

describe("planStatus", () => {
  it("is missing without a document and active without an expiry", () => {
    expect(planStatus(plan("a", { planOfCare: null }), now)).toBe("missing");
    expect(planStatus(plan("a", { planOfCare: { ...plan("a").planOfCare!, url: "https://evil.example.com/poc.pdf" } }), now)).toBe("missing");
    expect(planStatus(plan("a", { planOfCare: { ...plan("a").planOfCare!, expiryDate: null } }), now)).toBe("active");
  });

  it("is due for review within 30 days and expired after the date", () => {
    const withExpiry = (expiryDate: string) => plan("a", { planOfCare: { ...plan("a").planOfCare!, expiryDate } });
    expect(planStatus(withExpiry("2026-12-09"), now)).toBe("review_due");
    expect(planStatus(withExpiry("2026-11-09"), now)).toBe("review_due");
    expect(planStatus(withExpiry("2026-11-08"), now)).toBe("expired");
    expect(planStatus(withExpiry("2026-12-10"), now)).toBe("active");
  });
});

describe("overview and search", () => {
  const plans = [
    plan("a"),
    plan("b", { planOfCare: { ...plan("b").planOfCare!, expiryDate: "2026-11-20" }, serviceName: "Supported Employment" }),
    plan("c", { planOfCare: { ...plan("c").planOfCare!, expiryDate: "2026-01-01" } }),
    plan("d", { planOfCare: null }),
  ];

  it("counts plans by state", () => {
    expect(planOverview(plans, now)).toEqual({ clients: 4, activePlans: 2, reviewsDue: 2, missing: 1 });
  });

  it("searches the shown label, service and location but never the hidden name", () => {
    expect(filterPlans(plans, "BXYZ12", false).map((p) => p.id)).toEqual(["b"]);
    expect(filterPlans(plans, "employment", false).map((p) => p.id)).toEqual(["b"]);
    expect(filterPlans(plans, "jane", false)).toEqual([]);
    expect(filterPlans(plans, "jane", true)).toHaveLength(4);
    expect(filterPlans(plans, "not uploaded", false).map((p) => p.id)).toEqual(["d"]);
  });
});

it("labels clients by short id unless names are allowed", () => {
  expect(clientLabel(plan("a"), false)).toBe("Client #AXYZ12");
  expect(clientLabel(plan("a"), true)).toBe("Jane Doe");
  expect(clientLabel(plan("a", { clientName: "" }), true)).toBe("Client #AXYZ12");
});

it("builds goals links and formats dates", () => {
  expect(goalsHref(plan("a"))).toBeNull();
  expect(goalsHref(plan("a", { goalsType: "day_habilitation_services", goalsAndDocumentId: "g 1" }))).toMatch(/\?firebaseId=g%201&fromList=true$/);
  expect(formatDate("2026-05-18")).toBe("May 18, 2026");
  expect(formatDate("")).toBeNull();
});
