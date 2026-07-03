import { describe, expect, it } from "vitest";
import type { ClientDocument } from "@/lib/api/clients";
import { hasSignedForm485, form485GraceInfo } from "./form485GenerationEligibility";

const DAY = 24 * 60 * 60 * 1000;
const url = "https://example.com/485.pdf";
const signed: ClientDocument[] = [{ key: "form485", url, signed: true }];
const unsigned: ClientDocument[] = [{ key: "form485", url, signed: false }];
const legacy: ClientDocument[] = [{ key: "form485", url }]; // no `signed` field
const noUrl: ClientDocument[] = [{ key: "form485", url: "", signed: false }];
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

describe("hasSignedForm485", () => {
  it("signed for explicit true and grandfathered legacy; not for explicit false", () => {
    expect(hasSignedForm485(signed)).toBe(true);
    expect(hasSignedForm485(legacy)).toBe(true); // grandfathered
    expect(hasSignedForm485(unsigned)).toBe(false);
    expect(hasSignedForm485(noUrl)).toBe(false);
    expect(hasSignedForm485(null)).toBe(false);
  });
});

describe("form485GraceInfo", () => {
  it("non-HHA is always 'none'", () => {
    expect(form485GraceInfo({ type: "ddd", documents: unsigned }).state).toBe("none");
  });

  it("no uploaded 485 → 'none'", () => {
    expect(form485GraceInfo({ type: "hha", documents: [] }).state).toBe("none");
    expect(form485GraceInfo({ type: "hha", documents: noUrl }).state).toBe("none");
  });

  it("signed 485 → 'signed'", () => {
    expect(form485GraceInfo({ type: "hha", documents: signed }).state).toBe("signed");
  });

  it("legacy 485 (no signed field) is grandfathered → 'signed'", () => {
    expect(
      form485GraceInfo({
        type: "hha",
        documents: legacy,
        form485UnsignedActivatedAt: daysAgo(30),
      }).state,
    ).toBe("signed");
  });

  it("unsigned within window → 'unsigned-grace' with days left", () => {
    const info = form485GraceInfo({
      type: "hha",
      documents: unsigned,
      form485UnsignedActivatedAt: daysAgo(5),
    });
    expect(info.state).toBe("unsigned-grace");
    expect(info.daysLeft).toBeGreaterThan(7);
    expect(info.daysLeft).toBeLessThanOrEqual(9);
    expect(info.deadline).toBeInstanceOf(Date);
  });

  it("unsigned past 14 days → 'expired'", () => {
    expect(
      form485GraceInfo({
        type: "hha",
        documents: unsigned,
        form485UnsignedActivatedAt: daysAgo(15),
      }).state,
    ).toBe("expired");
  });

  it("unsigned with no clock yet → 'unsigned-grace' without countdown", () => {
    const info = form485GraceInfo({ type: "hha", documents: unsigned });
    expect(info.state).toBe("unsigned-grace");
    expect(info.daysLeft).toBeUndefined();
  });
});
