import type { Service } from "@/lib/api/services";
import type { HhaAuthorization, ServicePayType } from "../types/formData";

export function unitTypeToPayType(unitType?: string | null): ServicePayType | undefined {
  const u = unitType?.trim().toLowerCase();
  if (!u) return undefined;
  if (u === "15-min" || u.includes("15")) return "15-min";
  if (u === "daily") return "daily";
  if (u === "hourly") return "hourly";
  if (u === "mile") return "mile";
  return undefined;
}

export function payTypeToLabel(payType?: ServicePayType): string {
  if (payType === "15-min") return "15 minutes";
  if (payType === "daily") return "Daily";
  if (payType === "hourly") return "Hourly";
  if (payType === "mile") return "Mile";
  return "";
}

const EMPTY_CATALOG_FIELDS = {
  serviceId: undefined,
  serviceCode: "",
  serviceName: "",
  unitType: "",
  rate: "",
  serviceType: undefined,
  modifier: undefined,
  clientPayType: undefined,
} as const;

export function applyHhaCatalogService(
  row: HhaAuthorization,
  svc: Service | undefined,
): HhaAuthorization {
  if (!svc) {
    return { ...row, ...EMPTY_CATALOG_FIELDS };
  }

  return {
    ...row,
    serviceId: svc.id,
    serviceCode: svc.code ?? "",
    serviceName: svc.name ?? "",
    unitType: svc.unitType ?? "",
    rate: svc.defaultRate ?? "",
    serviceType: svc.type || undefined,
    modifier: svc.modifier || undefined,
    clientPayType: unitTypeToPayType(svc.unitType),
  };
}
