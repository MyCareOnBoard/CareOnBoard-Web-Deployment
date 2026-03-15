import type { ClientServiceDefinition } from "./api";

type PayType = "hourly" | "15-min" | "daily";

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatCurrency = (amount: number) => currencyFormatter.format(amount);

export function getClientRate(service: ClientServiceDefinition | undefined): {
  rate: number;
  payType: PayType;
} {
  if (!service) return { rate: 0, payType: "hourly" };
  const rate = parseFloat(service.clientRate ?? service.rate) || 0;
  const payType = (service.clientPayType ?? service.payType ?? "hourly") as PayType;
  return { rate, payType };
}

export function getStaffRate(service: ClientServiceDefinition | undefined): {
  rate: number;
  payType: PayType;
} {
  if (!service) return { rate: 0, payType: "hourly" };
  const rate = parseFloat(service.rate) || 0;
  const payType = (service.payType ?? "hourly") as PayType;
  return { rate, payType };
}

export function computeBillingAmount(
  rate: number,
  payType: string,
  hours: number,
  units: number
): number {
  if (payType === "15-min") return (hours * 60) / 15 * rate;
  if (payType === "daily") return units * rate;
  return hours * rate;
}

export function formatRateLabel(rate: number, payType: string): string {
  const formatted = formatCurrency(rate);
  if (payType === "15-min") return `${formatted}/15-min`;
  if (payType === "daily") return `${formatted}/day`;
  return `${formatted}/hr`;
}

export function buildServiceByCodeMap(
  services: ClientServiceDefinition[] | undefined
): Map<string, ClientServiceDefinition> {
  const map = new Map<string, ClientServiceDefinition>();
  (services || []).forEach((s) => {
    if (s.code) map.set(String(s.code), s);
  });
  return map;
}
