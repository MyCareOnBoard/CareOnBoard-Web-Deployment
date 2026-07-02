import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import type { ReadyToClaimRow } from "@/lib/api/claims";
import type { Shift } from "@/lib/api/shifts";
import type { MileageRide } from "@/lib/api/mileage";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import {
  buildClaimableRowsForClient,
  buildCombinedPreviewListTitle,
  filterClaimBundleRows,
  filterClaimRowsByClient,
  getClaimBundleKey,
  getClaimBundleKeyFromRow,
  mapBundleRowsToPreviewItems,
  mapBundlesToClaimConfirmSelections,
  needsSupplementalFetch,
  splitRowsIntoClaimBundles,
  sumSelectedPreviewCharges,
} from "./claimBundleUtils";

const anchorClaim: RecentClaim = {
  id: "row-1",
  client: "Alex Bran-Monzon",
  clientId: "client-1",
  staffId: "rHxnNp",
  serviceCode: "H2021HI",
  paNumber: "1553253313",
  serviceDate: "June 5, 2026",
  durationStart: "8:00 AM",
  durationEnd: "11:30 AM",
  totalHours: "3.5",
  rate: "$9.61/hr",
  sourceType: "shift",
  sourceId: "shift-1",
  weekRange: "June 1 - June 7, 2026",
};

const rows: ReadyToClaimRow[] = [
  {
    id: "row-1",
    sourceType: "shift",
    sourceId: "shift-1",
    clientId: "client-1",
    clientName: "Alex Bran-Monzon",
    staffId: "rHxnNp",
    serviceCode: "H2021HI",
    sortDate: "2026-06-05",
    weekRange: "June 1 - June 7, 2026",
    paNumber: "1553253313",
    shiftDate: "2026-06-05",
    clockedInAt: "2026-06-05T13:00:00.000Z",
    clockedOutAt: "2026-06-05T16:30:00.000Z",
    clientRate: "9.61",
  },
  {
    id: "row-2",
    sourceType: "shift",
    sourceId: "shift-2",
    clientId: "client-1",
    clientName: "Alex Bran-Monzon",
    staffId: "rHxnNp",
    serviceCode: "H2021HI",
    sortDate: "2026-06-06",
    weekRange: "June 1 - June 7, 2026",
    paNumber: "1553253313",
    shiftDate: "2026-06-06",
    clockedInAt: "2026-06-06T13:00:00.000Z",
    clockedOutAt: "2026-06-06T15:00:00.000Z",
    clientRate: "9.61",
  },
  {
    id: "row-3",
    sourceType: "shift",
    sourceId: "shift-3",
    clientId: "client-2",
    clientName: "Jane Doe",
    staffId: "abc123",
    serviceCode: "H2021HI",
    sortDate: "2026-06-06",
    weekRange: "June 1 - June 7, 2026",
    shiftDate: "2026-06-06",
  },
];

describe("claimBundleUtils", () => {
  it("getClaimBundleKey matches client service and week range", () => {
    const key = getClaimBundleKey(anchorClaim);
    expect(key).toBe("client-1::h2021hi::June 1 - June 7, 2026");
    expect(getClaimBundleKeyFromRow(rows[0])).toBe(key);
  });

  it("filterClaimBundleRows returns siblings with same bundle key and source type", () => {
    const bundle = filterClaimBundleRows(rows, anchorClaim);
    expect(bundle).toHaveLength(2);
    expect(bundle.map((row) => row.sourceId)).toEqual(["shift-1", "shift-2"]);
  });

  it("filterClaimBundleRows excludes different clients", () => {
    const bundle = filterClaimBundleRows(rows, {
      ...anchorClaim,
      clientId: "client-2",
      client: "Jane Doe",
    });
    expect(bundle).toHaveLength(1);
    expect(bundle[0]?.sourceId).toBe("shift-3");
  });

  it("mapBundleRowsToPreviewItems builds display labels", () => {
    const items = mapBundleRowsToPreviewItems([rows[0]]);
    expect(items[0]?.title).toBe("H2021HI · Shift on June 5, 2026");
    expect(items[0]?.chargeAmount).toBe(33.64);
    expect(items[0]?.payerAmount).toBe(33.64);
    expect(items[0]?.outOfPocketAmount).toBe(0);
    expect(items[0]?.metaLine).toMatch(/–/);
    expect(items[0]?.metaLine).toContain("3.5 hrs");
    expect(items[0]?.metaLine).toContain("$9.61/hr");
    expect(items[0]?.metaLine).not.toContain("$33.64");
    expect(items[0]?.metaLine).not.toContain("Staff");
    expect(items[0]?.sourceId).toBe("shift-1");
  });

  it("mapBundleRowsToPreviewItems splits a both-coverage charge into payer and out-of-pocket", () => {
    const items = mapBundleRowsToPreviewItems([
      {
        ...rows[0],
        coverage: "both",
        splitMode: "percentage",
        splitValue: 60,
      },
    ]);
    expect(items[0]?.payerAmount).toBe(20.18);
    expect(items[0]?.outOfPocketAmount).toBe(13.46);
    expect(items[0]?.chargeAmount).toBe(33.64);
  });

  it("mapBundleRowsToPreviewItems includes ride details", () => {
    const rideRow: ReadyToClaimRow = {
      id: "ride:ride-1",
      sourceType: "ride",
      sourceId: "ride-1",
      clientId: "client-1",
      clientName: "Alex Bran-Monzon",
      staffId: "rHxnNp",
      serviceCode: "A0090HI22",
      sortDate: "2026-06-05",
      weekRange: "2026-06-05",
      completedAt: "2026-06-05T14:30:00.000Z",
      actualDistance: 5,
    };

    const items = mapBundleRowsToPreviewItems([rideRow], 10);
    expect(items[0]?.title).toBe("A0090HI22 · Ride on Jun 5, 2026");
    expect(items[0]?.chargeAmount).toBe(50);
    expect(items[0]?.payerAmount).toBe(50);
    expect(items[0]?.metaLine).toContain("→ 5 km");
    expect(items[0]?.metaLine).not.toContain("Staff");
    expect(items[0]?.metaLine).toContain("$10.00/mi");
    expect(items[0]?.metaLine).not.toContain("$50.00");
  });

  it("filterClaimRowsByClient returns all rows for a client", () => {
    const clientRows = filterClaimRowsByClient(rows, "client-1", "Alex Bran-Monzon");
    expect(clientRows).toHaveLength(2);
    expect(clientRows.every((row) => row.clientId === "client-1")).toBe(true);
  });

  it("splitRowsIntoClaimBundles groups rows by source type and bundle key", () => {
    const bundles = splitRowsIntoClaimBundles(rows);
    expect(bundles).toHaveLength(2);
    expect(bundles.find((bundle) => bundle.rows.length === 2)?.sourceType).toBe("shift");
  });

  it("buildCombinedPreviewListTitle formats shift and ride counts", () => {
    expect(buildCombinedPreviewListTitle(1, 1)).toBe("Shifts (1) & Rides (1)");
    expect(buildCombinedPreviewListTitle(2, 0)).toBe("Shifts (2)");
    expect(buildCombinedPreviewListTitle(0, 3)).toBe("Rides (3)");
  });

  it("sumSelectedPreviewCharges totals only selected preview items", () => {
    const items = mapBundleRowsToPreviewItems(rows.slice(0, 1));
    expect(sumSelectedPreviewCharges(items, new Set([items[0]?.id ?? ""]))).toBe(33.64);
    expect(sumSelectedPreviewCharges(items, new Set())).toBe(0);
  });

  it("mapBundleRowsToPreviewItems uses 15-min billing for shift preview charge", () => {
    const items = mapBundleRowsToPreviewItems([
      {
        ...rows[0],
        clientPayType: "15-min",
      },
    ]);
    expect(items[0]?.chargeAmount).toBe(134.54);
  });

  it("needsSupplementalFetch returns false when cache covers selected service codes", () => {
    const client = {
      id: "client-1",
      firstName: "Alex",
      lastName: "Bran-Monzon",
    } as Client;

    expect(needsSupplementalFetch(client, rows, ["H2021HI"])).toBe(false);
    expect(needsSupplementalFetch(client, rows, [])).toBe(false);
  });

  it("needsSupplementalFetch returns true when a selected code is missing from cache", () => {
    const client = {
      id: "client-1",
      firstName: "Alex",
      lastName: "Bran-Monzon",
    } as Client;

    expect(needsSupplementalFetch(client, rows, ["A0090HI22"])).toBe(true);
  });

  it("buildClaimableRowsForClient returns cache rows when no fetched items", () => {
    const client = {
      id: "client-1",
      firstName: "Alex",
      lastName: "Bran-Monzon",
    } as Client;

    const claimableRows = buildClaimableRowsForClient(
      client,
      rows,
      [],
      [],
      ["H2021HI"],
    );
    expect(claimableRows).toHaveLength(2);
    expect(claimableRows.every((row) => row.clientRate === "9.61")).toBe(true);
  });

  it("buildClaimableRowsForClient merges fetched rows and prefers cache on dedupe", () => {
    const client = {
      id: "client-1",
      firstName: "Alex",
      lastName: "Bran-Monzon",
    } as Client;

    const shifts = [
      {
        id: "shift-1",
        clientId: "client-1",
        serviceCode: "H2021HI",
        date: "2026-06-05",
      },
      {
        id: "shift-99",
        clientId: "client-1",
        serviceCode: "H2021HI",
        date: "2026-06-07",
      },
    ] as Shift[];

    const claimableRows = buildClaimableRowsForClient(
      client,
      rows,
      shifts,
      [],
      ["H2021HI"],
    );
    expect(claimableRows.map((row) => row.sourceId).sort()).toEqual(["shift-1", "shift-2", "shift-99"]);
    const cachedShift = claimableRows.find((row) => row.sourceId === "shift-1");
    expect(cachedShift?.clientRate).toBe("9.61");
  });

  it("mapBundlesToClaimConfirmSelections maps bundles to confirm payloads", () => {
    const bundles = splitRowsIntoClaimBundles(rows.slice(0, 1));
    const selections = mapBundlesToClaimConfirmSelections(bundles, "client-1");
    expect(selections).toHaveLength(1);
    expect(selections[0]?.shifts[0]?.id).toBe("shift-1");
    expect(selections[0]?.serviceCode).toBe("H2021HI");
  });
});
