import type { Client } from "@/lib/api/clients";
import type { ReadyToClaimRow } from "@/lib/api/claims";
import type { Shift } from "@/lib/api/shifts";
import type { MileageRide } from "@/lib/api/mileage";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import {
  computeClaimBilling,
  formatClaimCharge,
  parseRateToNumber,
} from "./claimReportPrefillUtils";
import { resolveWeekRangeForShift } from "./claimShiftBillingUtils";
import { rideDateYmd, serviceCodesMatch } from "./claimSelectionUtils";
import { mapReadyToClaimRowToRecentClaim } from "./readyToClaimUtils";

export type ClaimConfirmSelection = {
  shifts: Shift[];
  rides: MileageRide[];
  serviceCode: string;
  weekRange?: string;
};

export type ClaimBundlePreviewItem = {
  id: string;
  sourceId: string;
  sourceType: "shift" | "ride";
  title: string;
  metaLine: string;
  chargeAmount: number;
};

function normalizeServiceCode(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeWeekRange(value?: string | null) {
  return String(value ?? "").trim();
}

export function getClaimBundleKeyFromRow(row: Pick<ReadyToClaimRow, "clientId" | "serviceCode" | "weekRange">) {
  const clientId = String(row.clientId ?? "").trim() || "unknown";
  const serviceCode = normalizeServiceCode(row.serviceCode);
  const weekRange = normalizeWeekRange(row.weekRange);
  return `${clientId}::${serviceCode}::${weekRange}`;
}

export function getClaimBundleKey(claim: Pick<RecentClaim, "clientId" | "client" | "serviceCode" | "weekRange">) {
  const clientId = claim.clientId?.trim() || claim.client.trim() || "unknown";
  const serviceCode = normalizeServiceCode(claim.serviceCode);
  const weekRange = normalizeWeekRange(claim.weekRange);
  return `${clientId}::${serviceCode}::${weekRange}`;
}

export function filterClaimRowsByClient(
  rows: ReadyToClaimRow[],
  clientId?: string | null,
  clientName?: string,
): ReadyToClaimRow[] {
  const normalizedClientId = clientId?.trim();
  const normalizedClientName = clientName?.trim().toLowerCase();

  return rows.filter((row) => {
    if (normalizedClientId && row.clientId === normalizedClientId) {
      return true;
    }
    if (normalizedClientName && row.clientName?.trim().toLowerCase() === normalizedClientName) {
      return true;
    }
    return false;
  });
}

export type ClaimBundleSelection = {
  rows: ReadyToClaimRow[];
  serviceCode: string;
  weekRange?: string;
  sourceType: "shift" | "ride";
};

export function splitRowsIntoClaimBundles(rows: ReadyToClaimRow[]): ClaimBundleSelection[] {
  const grouped = new Map<string, ReadyToClaimRow[]>();

  for (const row of rows) {
    const key = `${row.sourceType}::${getClaimBundleKeyFromRow(row)}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }

  return [...grouped.values()].map((bundleRows) => ({
    rows: bundleRows,
    serviceCode: bundleRows[0]?.serviceCode?.trim() ?? "",
    weekRange: bundleRows[0]?.weekRange?.trim() || undefined,
    sourceType: bundleRows[0]?.sourceType ?? "shift",
  }));
}

export function filterClaimBundleRows(
  rows: ReadyToClaimRow[],
  anchor: Pick<RecentClaim, "clientId" | "client" | "serviceCode" | "weekRange" | "sourceType">,
): ReadyToClaimRow[] {
  if (!anchor.sourceType) {
    return [];
  }

  const bundleKey = getClaimBundleKey(anchor);

  return rows.filter((row) => {
    if (row.sourceType !== anchor.sourceType) {
      return false;
    }
    return getClaimBundleKeyFromRow(row) === bundleKey;
  });
}

function isMissingDisplayValue(value?: string | null): boolean {
  const trimmed = value?.trim();
  return !trimmed || trimmed === "—";
}

function parsePreviewHours(totalHours: string): number {
  if (isMissingDisplayValue(totalHours)) {
    return 0;
  }
  const value = parseFloat(totalHours);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatPreviewCharge(charge: number): string | null {
  return charge > 0 ? formatClaimCharge(charge) : null;
}

function computeShiftPreviewChargeAmount(row: ReadyToClaimRow, claim: RecentClaim): number {
  const hours = parsePreviewHours(claim.totalHours);
  const rate =
    parseRateToNumber(row.clientRate) ??
    parseRateToNumber(claim.rate);
  if (!hours || !rate) {
    return 0;
  }
  return computeClaimBilling(hours, rate, row.clientPayType ?? "hourly").charge;
}

function computeRidePreviewChargeAmount(row: ReadyToClaimRow, mileageRate: number): number {
  const miles = Number(row.actualDistance);
  const rate = Number(mileageRate);
  if (!Number.isFinite(miles) || miles <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  return computeClaimBilling(miles, rate, "mile").charge;
}

function buildShiftPreviewItem(
  row: ReadyToClaimRow,
  claim: RecentClaim,
): ClaimBundlePreviewItem {
  const serviceCode = row.serviceCode?.trim();
  const dateLabel = isMissingDisplayValue(claim.serviceDate) ? null : claim.serviceDate;
  const chargeAmount = computeShiftPreviewChargeAmount(row, claim);
  const chargeLabel = formatPreviewCharge(chargeAmount);
  const titleParts = [
    serviceCode || null,
    dateLabel ? `Shift on ${dateLabel}` : "Shift",
    chargeLabel,
  ].filter(Boolean);

  const duration =
    !isMissingDisplayValue(claim.durationStart) && !isMissingDisplayValue(claim.durationEnd)
      ? `${claim.durationStart} – ${claim.durationEnd}`
      : null;

  const metaParts = [
    duration,
    !isMissingDisplayValue(claim.totalHours) ? `${claim.totalHours} hrs` : null,
    !isMissingDisplayValue(claim.rate) ? claim.rate : null,
  ].filter(Boolean);

  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceType: row.sourceType,
    title: titleParts.join(" · "),
    metaLine: metaParts.join(" · "),
    chargeAmount,
  };
}

function buildRidePreviewItem(
  row: ReadyToClaimRow,
  claim: RecentClaim,
  mileageRate = 0,
): ClaimBundlePreviewItem {
  const serviceCode = row.serviceCode?.trim();
  const dateLabel = isMissingDisplayValue(claim.serviceDate) ? null : claim.serviceDate;
  const chargeAmount = computeRidePreviewChargeAmount(row, mileageRate);
  const chargeLabel = formatPreviewCharge(chargeAmount);
  const titleParts = [
    serviceCode || null,
    dateLabel ? `Ride on ${dateLabel}` : "Ride",
    chargeLabel,
  ].filter(Boolean);

  const duration =
    !isMissingDisplayValue(claim.durationStart) && !isMissingDisplayValue(claim.durationEnd)
      ? `${claim.durationStart} → ${claim.durationEnd}`
      : !isMissingDisplayValue(claim.totalHours)
        ? claim.totalHours
        : null;

  const metaParts = [
    duration,
    !isMissingDisplayValue(claim.rate) ? claim.rate : null,
  ].filter(Boolean);

  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceType: row.sourceType,
    title: titleParts.join(" · "),
    metaLine: metaParts.join(" · "),
    chargeAmount,
  };
}

export function buildCombinedPreviewListTitle(shiftCount: number, rideCount: number): string {
  const parts: string[] = [];
  if (shiftCount > 0) {
    parts.push(`Shifts (${shiftCount})`);
  }
  if (rideCount > 0) {
    parts.push(`Rides (${rideCount})`);
  }
  return parts.join(" & ");
}

export function sumSelectedPreviewCharges(
  items: ClaimBundlePreviewItem[],
  selectedIds: Set<string>,
): number {
  const total = items.reduce((sum, item) => {
    if (!selectedIds.has(item.id)) {
      return sum;
    }
    return sum + item.chargeAmount;
  }, 0);
  return Math.round(total * 100) / 100;
}

function getClientDisplayName(client: Client): string {
  return client.firstName && client.lastName
    ? `${client.firstName} ${client.lastName}`
    : client.id;
}

function filterRowsByServiceCodes(
  rows: ReadyToClaimRow[],
  serviceCodes: string[],
): ReadyToClaimRow[] {
  if (serviceCodes.length === 0) {
    return [];
  }

  return rows.filter((row) =>
    serviceCodes.some((code) => serviceCodesMatch(row.serviceCode, code)),
  );
}

function getCachedClaimableRowsForClient(
  client: Client,
  readyToClaimRows: ReadyToClaimRow[],
  selectedServiceCodes: string[],
): ReadyToClaimRow[] {
  const clientRows = filterClaimRowsByClient(
    readyToClaimRows,
    client.id,
    getClientDisplayName(client),
  );
  return filterRowsByServiceCodes(clientRows, selectedServiceCodes);
}

export function needsSupplementalFetch(
  client: Client,
  readyToClaimRows: ReadyToClaimRow[],
  selectedServiceCodes: string[],
): boolean {
  if (selectedServiceCodes.length === 0) {
    return false;
  }

  const clientRows = filterClaimRowsByClient(
    readyToClaimRows,
    client.id,
    getClientDisplayName(client),
  );
  const cachedCodes = new Set(
    clientRows
      .map((row) => normalizeServiceCode(row.serviceCode))
      .filter(Boolean),
  );

  return selectedServiceCodes.some(
    (code) => !cachedCodes.has(normalizeServiceCode(code)),
  );
}

export function buildClaimableRowsForClient(
  client: Client,
  readyToClaimRows: ReadyToClaimRow[],
  fetchedShifts: Shift[],
  fetchedRides: MileageRide[],
  selectedServiceCodes: string[],
): ReadyToClaimRow[] {
  const cachedRows = getCachedClaimableRowsForClient(
    client,
    readyToClaimRows,
    selectedServiceCodes,
  );
  const fetchedRows = filterRowsByServiceCodes(
    shiftsAndRidesToReadyRows(client, fetchedShifts, fetchedRides),
    selectedServiceCodes,
  );

  const merged = new Map<string, ReadyToClaimRow>();
  for (const row of fetchedRows) {
    merged.set(`${row.sourceType}:${row.sourceId}`, row);
  }
  for (const row of cachedRows) {
    merged.set(`${row.sourceType}:${row.sourceId}`, row);
  }

  return [...merged.values()];
}

export function mapBundlesToClaimConfirmSelections(
  bundles: ClaimBundleSelection[],
  clientId: string,
): ClaimConfirmSelection[] {
  return bundles.map((bundle) => ({
    shifts:
      bundle.sourceType === "shift"
        ? bundle.rows.map(
            (row) =>
              ({
                id: row.sourceId,
                clientId,
                serviceCode: bundle.serviceCode,
              }) as Shift,
          )
        : [],
    rides:
      bundle.sourceType === "ride"
        ? bundle.rows.map(
            (row) =>
              ({
                id: row.sourceId,
                clientId,
                serviceCode: bundle.serviceCode,
              }) as MileageRide,
          )
        : [],
    serviceCode: bundle.serviceCode,
    weekRange:
      bundle.sourceType === "ride"
        ? bundle.rows[0]?.sortDate?.slice(0, 10) || bundle.weekRange
        : bundle.weekRange,
  }));
}

function shiftsAndRidesToReadyRows(
  client: Client,
  shifts: Shift[],
  rides: MileageRide[],
): ReadyToClaimRow[] {
  const clientId = client.id;
  const clientName =
    client.firstName && client.lastName
      ? `${client.firstName} ${client.lastName}`
      : client.id;

  const shiftRows: ReadyToClaimRow[] = shifts.map((shift) => ({
    id: shift.id,
    sourceType: "shift",
    sourceId: shift.id,
    clientId,
    clientName,
    staffId: shift.employeeId ?? null,
    serviceCode: shift.serviceCode?.trim() ?? "",
    sortDate: shift.date ?? null,
    weekRange: resolveWeekRangeForShift(client, shift) ?? shift.date ?? null,
    shiftDate: shift.date ?? null,
    clockedInAt: shift.clockedInAt ?? null,
    clockedOutAt: shift.clockedOutAt ?? null,
    startTime: shift.startTime ?? null,
    endTime: shift.endTime ?? null,
    clientRate: null,
    clientPayType: null,
  }));

  const rideRows: ReadyToClaimRow[] = rides.map((ride) => {
    const sortDate = rideDateYmd(ride) || null;
    return {
      id: `ride:${ride.id}`,
      sourceType: "ride",
      sourceId: ride.id,
      clientId,
      clientName,
      staffId: ride.caregiverId ?? null,
      serviceCode: ride.serviceCode?.trim() ?? "",
      sortDate,
      weekRange: sortDate,
      completedAt: ride.completedAt ?? null,
      scheduledStartTime: ride.scheduledStartTime ?? null,
      actualDistance: ride.actualDistance ?? null,
    };
  });

  return [...shiftRows, ...rideRows];
}

export function mapBundleRowsToPreviewItems(
  rows: ReadyToClaimRow[],
  mileageRate = 0,
): ClaimBundlePreviewItem[] {
  return rows.map((row) => {
    const claim = mapReadyToClaimRowToRecentClaim(row, mileageRate);
    if (row.sourceType === "ride") {
      return buildRidePreviewItem(row, claim, mileageRate);
    }
    return buildShiftPreviewItem(row, claim);
  });
}
