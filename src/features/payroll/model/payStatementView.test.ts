import { describe, expect, it } from "vitest";
import { filterStatements, formatAmount, formatPayDate, payPeriod, statementHours } from "./payStatementView";
import type { PayStatement } from "./types";

const statement = (overrides: Partial<PayStatement> = {}): PayStatement => ({
  statementId: "s1", periodStart: "2026-06-01", periodEnd: "2026-06-14", payDate: "2026-06-20", status: "paid",
  grossPayCents: 120_000, deductionsCents: 30_000, netPayCents: 90_000,
  earnings: [], reimbursements: [], taxes: [], otherDeductions: [], paymentMethod: "direct_deposit", downloadAvailable: true, ...overrides,
});

describe("payStatementView", () => {
  it("formats amounts and calendar dates without shifting the day", () => {
    expect(formatAmount(123_456)).toBe("$1,234.56");
    expect(formatAmount(null)).toBe("—");
    expect(formatPayDate("2026-06-01")).toBe("Jun 1, 2026");
    expect(formatPayDate(null)).toBe("—");
    expect(formatPayDate("bad")).toBe("—");
    expect(payPeriod(statement())).toBe("Jun 1, 2026 – Jun 14, 2026");
  });

  it("adds up hours from earning lines and ignores lines without hours", () => {
    expect(statementHours(statement())).toBeNull();
    expect(statementHours(statement({ earnings: [
      { label: "Regular", hours: 80, rateCents: 1_500, amountCents: 120_000 },
      { label: "Overtime", hours: 2.5, rateCents: 2_250, amountCents: 5_625 },
      { label: "Bonus", hours: null, rateCents: null, amountCents: 10_000 },
    ] }))).toBe(82.5);
  });

  it("searches the shown period, pay date, status and amounts", () => {
    const list = [statement(), statement({ statementId: "s2", periodStart: "2026-07-01", periodEnd: "2026-07-14", payDate: "2026-07-20", status: "processing", netPayCents: 50_000 })];
    expect(filterStatements(list, " ").map((item) => item.statementId)).toEqual(["s1", "s2"]);
    expect(filterStatements(list, "jul").map((item) => item.statementId)).toEqual(["s2"]);
    expect(filterStatements(list, "PROCESSING").map((item) => item.statementId)).toEqual(["s2"]);
    expect(filterStatements(list, "$900").map((item) => item.statementId)).toEqual(["s1"]);
  });
});
