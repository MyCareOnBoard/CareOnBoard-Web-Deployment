import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/axios", () => ({ default: { get: vi.fn(), put: vi.fn() } }));

import {
  assertAllowedPaymentMethodChange,
  arePaymentFormValuesDirty,
  type PaymentFormValues,
} from "../paymentDetails";

const baseDirectDeposit: PaymentFormValues = {
  paymentMethod: "direct_deposit",
  bankName: "Test Bank",
  accountHolderName: "Jane Doe",
  routingNumber: "",
  accountNumber: "",
  cardBrand: "",
  cardLast4: "",
};

describe("assertAllowedPaymentMethodChange", () => {
  it("allows direct_deposit for first setup", () => {
    expect(assertAllowedPaymentMethodChange(null, "direct_deposit")).toEqual({ ok: true });
  });

  it("rejects check for first setup", () => {
    const result = assertAllowedPaymentMethodChange(null, "check");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("direct deposit");
    }
  });

  it("allows same-method legacy update", () => {
    expect(assertAllowedPaymentMethodChange("check", "check")).toEqual({ ok: true });
  });

  it("rejects switch to debit_card", () => {
    const result = assertAllowedPaymentMethodChange("check", "debit_card");
    expect(result.ok).toBe(false);
  });

  it("allows migration from check to direct_deposit", () => {
    expect(assertAllowedPaymentMethodChange("check", "direct_deposit")).toEqual({ ok: true });
  });

  it("rejects switch from direct_deposit to check", () => {
    const result = assertAllowedPaymentMethodChange("direct_deposit", "check");
    expect(result.ok).toBe(false);
  });
});

describe("arePaymentFormValuesDirty", () => {
  it("returns false when values match initial", () => {
    expect(
      arePaymentFormValuesDirty(baseDirectDeposit, baseDirectDeposit, true, true),
    ).toBe(false);
  });

  it("returns true when bank name changes", () => {
    const changed = { ...baseDirectDeposit, bankName: "Other Bank" };
    expect(arePaymentFormValuesDirty(changed, baseDirectDeposit, true, true)).toBe(true);
  });

  it("returns true when routing number is entered with existing on file", () => {
    const changed = { ...baseDirectDeposit, routingNumber: "021000021" };
    expect(arePaymentFormValuesDirty(changed, baseDirectDeposit, true, true)).toBe(true);
  });

  it("returns true when payment method changes", () => {
    const initial = { ...baseDirectDeposit, paymentMethod: "check" as const };
    expect(arePaymentFormValuesDirty(baseDirectDeposit, initial, false, false)).toBe(true);
  });
});
