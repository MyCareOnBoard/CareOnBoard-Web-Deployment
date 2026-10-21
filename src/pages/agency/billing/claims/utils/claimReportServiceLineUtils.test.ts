import { describe, expect, it } from "vitest";
import type { ClaimReportServiceLine } from "../data/mockClaimReportData";
import { formatServiceLineDate, serviceLineNpi, sumServiceLines } from "./claimReportServiceLineUtils";

const line = (overrides: Partial<ClaimReportServiceLine> = {}): ClaimReportServiceLine => ({
  duration: "10/19/2026 -> 10/25/2026",
  placeOfService: "12",
  cptHcpcs: "T1019",
  modifier: "-",
  diagnosisPointer: "A",
  totalCharges: "$144.00",
  providerId: "",
  ...overrides,
});

describe("claimReportServiceLineUtils", () => {
  it("shows the single date of service, or the old duration label", () => {
    expect(formatServiceLineDate(line({ serviceDate: "2026-10-19" }))).toBe("10/19/2026");
    expect(formatServiceLineDate(line())).toBe("10/19/2026 -> 10/25/2026");
  });

  it("reads the NPI from npi or the older nipId", () => {
    expect(serviceLineNpi(line({ npi: "1234567893" }))).toBe("1234567893");
    expect(serviceLineNpi(line({ nipId: "1245319599" }))).toBe("1245319599");
    expect(serviceLineNpi(line())).toBe("");
  });

  it("adds up charges and units", () => {
    expect(
      sumServiceLines([
        line({ totalCharges: "$1,144.10", units: "24" }),
        line({ totalCharges: "$48.00", units: "8.5" }),
      ]),
    ).toEqual({ charges: "$1,192.10", units: "32.5" });
    expect(sumServiceLines([line()])).toEqual({ charges: "$144.00", units: "" });
  });
});
