import type { ClientServiceDefinition } from "./api";

type ClientBillingPayType = "hourly" | "15-min" | "daily" | "mile";
type StaffBillingPayType = "hourly" | "15-min" | "daily" | "mile";

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatCurrency = (amount: number) => currencyFormatter.format(amount);

export function getClientRate(service: ClientServiceDefinition | undefined): {
  rate: number;
  payType: ClientBillingPayType;
} {
  if (!service) return { rate: 0, payType: "hourly" };
  const rate = parseFloat(service.clientRate ?? service.rate) || 0;
  const payType = (service.clientPayType ??
    service.payType ??
    "hourly") as ClientBillingPayType;
  return { rate, payType };
}

export function getStaffRate(service: ClientServiceDefinition | undefined): {
  rate: number;
  payType: StaffBillingPayType;
} {
  if (!service) return { rate: 0, payType: "hourly" };
  const rate = parseFloat(service.rate) || 0;
  const raw = (service.payType ?? "hourly") as string;
  const payType: StaffBillingPayType =
    raw === "hourly" || raw === "15-min" || raw === "daily" || raw === "mile"
      ? (raw as StaffBillingPayType)
      : "hourly";
  return { rate, payType };
}

export function computeBillingAmount(
  rate: number,
  payType: string,
  hours: number,
  units: number
): number {
  if (payType === "15-min") return (hours * 60) / 15 * rate;
  if (payType === "daily" || payType === "mile") return units * rate;
  return hours * rate;
}

export function formatRateLabel(rate: number, payType: string): string {
  const formatted = formatCurrency(rate);
  if (payType === "15-min") return `${formatted}/15-min`;
  if (payType === "daily") return `${formatted}/day`;
  if (payType === "mile") return `${formatted}/mile`;
  return `${formatted}/hr`;
}

export function buildServiceByCodeMap(
  services: ClientServiceDefinition[] | Array<{ code?: string; rate?: string; clientRate?: string; payType?: string; clientPayType?: string }> | undefined
): Map<string, ClientServiceDefinition> {
  const map = new Map<string, ClientServiceDefinition>();
  (services || []).forEach((s) => {
    if (s.code) map.set(String(s.code), s as ClientServiceDefinition);
  });
  return map;
}
