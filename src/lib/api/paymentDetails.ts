import axiosClient from "../axios";
import { z } from "zod";

export type PaymentMethod = "direct_deposit" | "check" | "debit_card";

export type CardBrand = "visa" | "mastercard" | "amex" | "discover";

export interface DspPaymentDetails {
  paymentMethod: PaymentMethod | null;
  bankName?: string;
  accountHolderName?: string;
  accountNumberMasked?: string;
  routingNumberMasked?: string;
  cardBrand?: CardBrand;
  cardLast4?: string;
  paymentDetailsSummary?: string;
  hasExistingRouting?: boolean;
  hasExistingAccount?: boolean;
  mailingAddressPreview?: string | null;
}

export interface UpdateDspPaymentDetailsPayload {
  paymentMethod: PaymentMethod;
  bankName?: string;
  accountHolderName?: string;
  routingNumber?: string;
  accountNumber?: string;
  cardBrand?: CardBrand;
  cardLast4?: string;
}

export interface PaymentFormValues {
  paymentMethod: PaymentMethod;
  bankName: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  cardBrand: CardBrand | "";
  cardLast4: string;
}

export const CARD_BRAND_OPTIONS: { value: CardBrand; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "Amex" },
  { value: "discover", label: "Discover" },
];

/** ABA mod-10 routing checksum (mirrors backend payment-details.schema.js) */
export function isValidAbaRoutingNumber(digits: string): boolean {
  if (!/^\d{9}$/.test(digits)) {
    return false;
  }

  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  const sum = digits
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);

  return sum % 10 === 0;
}

export const dspPaymentDetailsResponseSchema = z.object({
  paymentMethod: z.enum(["direct_deposit", "check", "debit_card"]).nullable(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumberMasked: z.string().optional(),
  routingNumberMasked: z.string().optional(),
  cardBrand: z.enum(["visa", "mastercard", "amex", "discover"]).optional(),
  cardLast4: z.string().optional(),
  paymentDetailsSummary: z.string().optional(),
  hasExistingRouting: z.boolean().optional(),
  hasExistingAccount: z.boolean().optional(),
  mailingAddressPreview: z.string().nullable().optional(),
});

export function createPaymentFormSchema(
  hasExistingRouting: boolean,
  hasExistingAccount: boolean,
) {
  return z
    .object({
      paymentMethod: z.enum(["direct_deposit", "check", "debit_card"]),
      bankName: z.string(),
      accountHolderName: z.string(),
      routingNumber: z.string(),
      accountNumber: z.string(),
      cardBrand: z.union([
        z.enum(["visa", "mastercard", "amex", "discover"]),
        z.literal(""),
      ]),
      cardLast4: z.string(),
    })
    .superRefine((data, ctx) => {
      if (data.paymentMethod === "direct_deposit") {
        if (!data.bankName.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["bankName"],
            message: "Bank name is required.",
          });
        }

        if (!data.accountHolderName.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["accountHolderName"],
            message: "Name on account is required.",
          });
        }

        const routingNumber = data.routingNumber.trim();
        const accountNumber = data.accountNumber.trim();

        if (!routingNumber && !hasExistingRouting) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["routingNumber"],
            message: "Routing number must be exactly 9 digits.",
          });
        } else if (routingNumber && !/^\d{9}$/.test(routingNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["routingNumber"],
            message: "Routing number must be exactly 9 digits.",
          });
        } else if (routingNumber && !isValidAbaRoutingNumber(routingNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["routingNumber"],
            message: "Routing number is invalid. Check the digits and try again.",
          });
        }

        if (!accountNumber && !hasExistingAccount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["accountNumber"],
            message: "Account number must be 4–17 digits.",
          });
        } else if (accountNumber && !/^\d{4,17}$/.test(accountNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["accountNumber"],
            message: "Account number must be 4–17 digits.",
          });
        }
      }

      if (data.paymentMethod === "debit_card") {
        if (!data.cardBrand) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cardBrand"],
            message: "Card type is required.",
          });
        }

        if (!/^\d{4}$/.test(data.cardLast4.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cardLast4"],
            message: "Enter the last 4 digits of your debit card.",
          });
        }
      }
    });
}

function parsePaymentDetails(raw: unknown): DspPaymentDetails {
  return dspPaymentDetailsResponseSchema.parse(raw);
}

export function mapPaymentDetailsToFormValues(
  details: DspPaymentDetails,
): PaymentFormValues {
  return {
    paymentMethod: details.paymentMethod ?? "direct_deposit",
    bankName: details.bankName ?? "",
    accountHolderName: details.accountHolderName ?? "",
    routingNumber: "",
    accountNumber: "",
    cardBrand: details.cardBrand ?? "",
    cardLast4: details.cardLast4 ?? "",
  };
}

export function buildUpdatePayload(
  values: PaymentFormValues,
): UpdateDspPaymentDetailsPayload {
  if (values.paymentMethod === "direct_deposit") {
    return {
      paymentMethod: "direct_deposit",
      bankName: values.bankName.trim(),
      accountHolderName: values.accountHolderName.trim(),
      routingNumber: values.routingNumber.trim() || undefined,
      accountNumber: values.accountNumber.trim() || undefined,
    };
  }

  if (values.paymentMethod === "debit_card") {
    return {
      paymentMethod: "debit_card",
      cardBrand: values.cardBrand as CardBrand,
      cardLast4: values.cardLast4.trim(),
    };
  }

  return {
    paymentMethod: "check",
  };
}

export function arePaymentFormValuesDirty(
  current: PaymentFormValues,
  initial: PaymentFormValues,
  hasExistingRouting: boolean,
  hasExistingAccount: boolean,
): boolean {
  const normalizedCurrent = buildUpdatePayload(current);
  const normalizedInitial = buildUpdatePayload(initial);

  if (normalizedCurrent.paymentMethod !== normalizedInitial.paymentMethod) {
    return true;
  }

  if (normalizedCurrent.paymentMethod === "direct_deposit") {
    return (
      normalizedCurrent.bankName !== normalizedInitial.bankName ||
      normalizedCurrent.accountHolderName !== normalizedInitial.accountHolderName ||
      Boolean(normalizedCurrent.routingNumber) ||
      Boolean(normalizedCurrent.accountNumber) ||
      current.bankName !== initial.bankName ||
      current.accountHolderName !== initial.accountHolderName ||
      (!hasExistingRouting && current.routingNumber !== initial.routingNumber) ||
      (!hasExistingAccount && current.accountNumber !== initial.accountNumber)
    );
  }

  if (normalizedCurrent.paymentMethod === "debit_card") {
    return (
      normalizedCurrent.cardBrand !== normalizedInitial.cardBrand ||
      normalizedCurrent.cardLast4 !== normalizedInitial.cardLast4
    );
  }

  return false;
}

export async function getDspPaymentDetails(): Promise<DspPaymentDetails> {
  const response = await axiosClient.get("/employees/payment-details");
  return parsePaymentDetails(response.data?.paymentDetails ?? response.data);
}

export async function updateDspPaymentDetails(
  payload: UpdateDspPaymentDetailsPayload,
): Promise<DspPaymentDetails> {
  const response = await axiosClient.put("/employees/payment-details", payload);
  return parsePaymentDetails(response.data?.paymentDetails ?? response.data);
}

export function getAccountNumberLast4(accountNumberMasked?: string): string | null {
  if (!accountNumberMasked) return null;
  const match = accountNumberMasked.match(/(\d{4})$/);
  return match?.[1] ?? null;
}

export interface PaymentDetailsValidationError {
  field: string;
  message: string;
}

export function extractPaymentDetailsValidationErrors(
  error: unknown,
): PaymentDetailsValidationError[] {
  const details = (error as { response?: { data?: { details?: PaymentDetailsValidationError[] } } })
    ?.response?.data?.details;

  if (!Array.isArray(details)) {
    return [];
  }

  return details.filter(
    (item): item is PaymentDetailsValidationError =>
      typeof item?.field === "string" && typeof item?.message === "string",
  );
}
