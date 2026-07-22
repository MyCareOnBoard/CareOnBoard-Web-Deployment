import { describe, expect, it } from "vitest";

import {
  buildScopedComplianceQuery,
  parseComplianceMonitorScope,
} from "./complianceMonitorScope";

describe("compliance monitor agency scope", () => {
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

  it("adds the selected agency to every compliance query", () => {
    expect(
      buildScopedComplianceQuery(
        { page: 2, limit: 10, search: "license" },
        { agencyId: "agency-1", agencyName: "Bright Care" },
      ),
    ).toEqual({
      page: 2,
      limit: 10,
      search: "license",
      agencyId: "agency-1",
    });
  });
});
