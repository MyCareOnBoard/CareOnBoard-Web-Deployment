import { describe, expect, it } from "vitest";

import {
  buildComplianceMonitorLocationSearch,
  buildScopedComplianceQuery,
  parseComplianceMonitorScope,
  parseComplianceMonitorTextSearch,
} from "./complianceMonitorScope";

describe("compliance monitor filters", () => {
  it("reads the selected agency from the dashboard link", () => {
    expect(
      parseComplianceMonitorScope(
        "?agencyId=agency-1&agencyName=Bright+Care",
      ),
    ).toEqual({
      agencyId: "agency-1",
      agencyName: "Bright Care",
    });
  });

  it("ignores an incomplete agency scope", () => {
    expect(parseComplianceMonitorScope("?agencyName=Bright+Care")).toBeNull();
  });

  it("reads and trims the persisted issue search", () => {
    expect(
      parseComplianceMonitorTextSearch("?search=%20Avery%20Johnson%20"),
    ).toBe("Avery Johnson");
    expect(parseComplianceMonitorTextSearch("?search=%20%20")).toBe("");
  });

  it("adds the selected agency and search to every compliance query", () => {
    expect(
      buildScopedComplianceQuery(
        { page: 2, limit: 10 },
        { agencyId: "agency-1", agencyName: "Bright Care" },
        " Avery ",
      ),
    ).toEqual({
      page: 2,
      limit: 10,
      search: "Avery",
      agencyId: "agency-1",
    });
  });

  it("builds a shareable filter location and omits empty values", () => {
    expect(
      buildComplianceMonitorLocationSearch({
        scope: { agencyId: "agency-1", agencyName: "Bright Care" },
        search: " Avery ",
      }),
    ).toBe("?agencyId=agency-1&agencyName=Bright+Care&search=Avery");

    expect(
      buildComplianceMonitorLocationSearch({ scope: null, search: "  " }),
    ).toBe("");
  });
});
