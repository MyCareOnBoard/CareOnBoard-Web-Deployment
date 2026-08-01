import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MultiSelect, MultiSelectItem } from "@/components/ui/multi-select";
import type { ReadyToClaimRow } from "@/lib/api/claims";
import type { Client, ClientService } from "@/lib/api/clients";
import { listShifts, ShiftStatus, type Shift } from "@/lib/api/shifts";
import { mileageApi, type MileageRide } from "@/lib/api/mileage";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CORNER_MODAL_SHELL_CLASS,
  BILLING_CORNER_MODAL_TALL_CLASS,
  BILLING_FIELD_CLASS,
  BILLING_FIELD_LABEL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { cn } from "@/lib/utils";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import type { OperationalClientOption } from "@/lib/operational-agency/types";
import {
  buildClaimableRowsForClient,
  buildCombinedPreviewListTitle,
  mapBundleRowsToPreviewItems,
  mapBundlesToClaimConfirmSelections,
  needsSupplementalFetch,
  splitRowsIntoClaimBundles,
  sumSelectedPreviewCharges,
  sumSelectedPreviewSplit,
  type ClaimConfirmSelection,
} from "../utils/claimBundleUtils";
import {
  computeClaimWizardShiftFetchBounds,
  flattenClientServices,
  getDefaultServiceIdsFromReadyRows,
  isTransportationServiceForClaims,
  resolveServiceCode,
  resolveServiceIdsFromCodes,
} from "../utils/claimSelectionUtils";
import type { RecentClaimClientGroup } from "../utils/groupRecentClaimsByClient";
import ClaimPreviewSection, { CoverageLegend } from "./claimPreviewSection";
import OutOfPocketBadge from "./OutOfPocketBadge";
import { COVERAGE } from "@/lib/coverage";

type GenerateClaimModalProps = {
  open: boolean;
  initialClientGroup?: RecentClaimClientGroup | null;
  saving?: boolean;
  readyToClaimRows?: ReadyToClaimRow[];
  mileageRate?: number;
  onClose: () => void;
  /**
   * Coverage-aware generate: claim-leg selections (payer / both lines) bill a state claim;
   * invoice-leg selections (out-of-pocket / both lines) bill an out-of-pocket invoice. A `both`
   * line appears in both lists so generating produces both legs.
   */
  onGenerate: (
    clientId: string,
    claimSelections: ClaimConfirmSelection[],
    invoiceSelections: ClaimConfirmSelection[],
  ) => void;
};

function getClientDisplayName(client: Client) {
  return client.firstName && client.lastName
    ? `${client.firstName} ${client.lastName}`
    : client.id;
}

function getServiceCodesFromClientGroup(group: RecentClaimClientGroup): string[] {
  const codes = group.claims
    .map((claim) => claim.serviceCode?.trim())
    .filter((code): code is string => Boolean(code) && code !== "—");
  return [...new Set(codes)];
}

export default function GenerateClaimModal({
  open,
  initialClientGroup = null,
  saving = false,
  readyToClaimRows = [],
  mileageRate = 0,
  onClose,
  onGenerate,
}: GenerateClaimModalProps) {
  const { agencyId, mode, data } = useOperationalAgency();
  const [clientQuery, setClientQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<OperationalClientOption[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [rides, setRides] = useState<MileageRide[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const clientSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientSearchControllerRef = useRef<AbortController | null>(null);
  const clientSearchRequestIdRef = useRef(0);
  const clientLoadControllerRef = useRef<AbortController | null>(null);
  const prefillRequestIdRef = useRef(0);

  const services = useMemo(
    () => flattenClientServices(selectedClient ?? undefined),
    [selectedClient],
  );

  const selectedServices = useMemo(
    () => services.filter((service) => service.id && selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds],
  );

  const selectedServiceCodes = useMemo(
    () =>
      selectedServices
        .map((service) => resolveServiceCode(service))
        .filter((code) => code.length > 0),
    [selectedServices],
  );

  const displayRows = useMemo(
    () =>
      selectedClient
        ? buildClaimableRowsForClient(
            selectedClient,
            readyToClaimRows,
            shifts,
            rides,
            selectedServiceCodes,
          )
        : [],
    [selectedClient, readyToClaimRows, shifts, rides, selectedServiceCodes],
  );

  const previewItems = useMemo(
    () => mapBundleRowsToPreviewItems(displayRows, mileageRate),
    [displayRows, mileageRate],
  );

  const shiftRowCount = useMemo(
    () => displayRows.filter((row) => row.sourceType === "shift").length,
    [displayRows],
  );

  const rideRowCount = useMemo(
    () => displayRows.filter((row) => row.sourceType === "ride").length,
    [displayRows],
  );

  const previewListTitle = useMemo(
    () => buildCombinedPreviewListTitle(shiftRowCount, rideRowCount),
    [rideRowCount, shiftRowCount],
  );

  const displayRowIdsKey = useMemo(
    () => displayRows.map((row) => row.id).sort().join(","),
    [displayRows],
  );

  const selectedTotalAmount = useMemo(
    () => sumSelectedPreviewCharges(previewItems, selectedIds),
    [previewItems, selectedIds],
  );

  const selectedSplitTotals = useMemo(
    () => sumSelectedPreviewSplit(previewItems, selectedIds),
    [previewItems, selectedIds],
  );

  const resetWizard = useCallback(() => {
    setClientQuery("");
    setClientSearchResults([]);
    setIsSearchingClients(false);
    setShowClientDropdown(false);
    setSelectedClient(null);
    setSelectedServiceIds([]);
    setShifts([]);
    setRides([]);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (!open) {
      resetWizard();
    }
  }, [open, resetWizard]);

  useEffect(() => {
    return () => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
      clientSearchRequestIdRef.current += 1;
      clientSearchControllerRef.current?.abort();
      clientLoadControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const clientId = initialClientGroup?.clientId;
    if (!open || !clientId) {
      return;
    }

    const requestId = prefillRequestIdRef.current + 1;
    prefillRequestIdRef.current = requestId;
    clientLoadControllerRef.current?.abort();
    const controller = new AbortController();
    clientLoadControllerRef.current = controller;

    const loadPrefill = async () => {
      setLoadingClient(true);
      try {
        const fullClient = await data.getClientSchedulingContext(clientId, {
          signal: controller.signal,
        });
        if (prefillRequestIdRef.current !== requestId) {
          return;
        }

        setSelectedClient(fullClient);
        setClientQuery(getClientDisplayName(fullClient));

        const nextServices = flattenClientServices(fullClient);
        const codes = getServiceCodesFromClientGroup(initialClientGroup);
        const resolvedIds = resolveServiceIdsFromCodes(nextServices, codes);
        const defaultIds =
          resolvedIds.length > 0
            ? resolvedIds
            : getDefaultServiceIdsFromReadyRows(
                fullClient.id,
                nextServices,
                readyToClaimRows,
              );
        setSelectedServiceIds(defaultIds);
      } catch {
        if (controller.signal.aborted) return;
        if (prefillRequestIdRef.current !== requestId) {
          return;
        }
        console.error("Failed to load client for claim generation.");
        setSelectedClient(null);
      } finally {
        if (prefillRequestIdRef.current === requestId) {
          setLoadingClient(false);
        }
      }
    };

    void loadPrefill();
    return () => controller.abort();
  }, [data, open, initialClientGroup, readyToClaimRows]);

  const handleClientSearch = useCallback(
    (searchQuery: string) => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
      const requestId = clientSearchRequestIdRef.current + 1;
      clientSearchRequestIdRef.current = requestId;
      clientSearchControllerRef.current?.abort();
      setIsSearchingClients(false);

      if (searchQuery.trim().length < 2) {
        setClientSearchResults([]);
        setShowClientDropdown(false);
        return;
      }

      clientSearchTimeoutRef.current = setTimeout(async () => {
        const controller = new AbortController();
        clientSearchControllerRef.current = controller;
        try {
          if (clientSearchRequestIdRef.current === requestId) setIsSearchingClients(true);
          const response = await data.searchClients({
            search: searchQuery,
            mode: mode ?? undefined,
            limit: 20,
            signal: controller.signal,
          });
          if (controller.signal.aborted || clientSearchRequestIdRef.current !== requestId) return;
          setClientSearchResults(response.items);
          setShowClientDropdown(response.items.length > 0);
        } catch {
          if (controller.signal.aborted || clientSearchRequestIdRef.current !== requestId) return;
          console.error("Failed to search clients.");
          setClientSearchResults([]);
          setShowClientDropdown(false);
        } finally {
          if (clientSearchRequestIdRef.current === requestId) setIsSearchingClients(false);
        }
      }, 300);
    },
    [agencyId, data, mode],
  );

  const handleClientSelect = useCallback(
    async (client: OperationalClientOption) => {
      setClientQuery(client.name);
      setShowClientDropdown(false);
      setClientSearchResults([]);
      setLoadingClient(true);
      clientLoadControllerRef.current?.abort();
      const controller = new AbortController();
      clientLoadControllerRef.current = controller;

      try {
        const fullClient = await data.getClientSchedulingContext(client.id, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSelectedClient(fullClient);
        const nextServices = flattenClientServices(fullClient);
        const defaultIds = getDefaultServiceIdsFromReadyRows(
          fullClient.id,
          nextServices,
          readyToClaimRows,
        );
        setSelectedServiceIds(defaultIds);
      } catch {
        if (controller.signal.aborted) return;
        console.error("Failed to load client.");
        setSelectedClient(null);
      } finally {
        if (!controller.signal.aborted) setLoadingClient(false);
      }
    },
    [data, readyToClaimRows],
  );

  useEffect(() => {
    if (!open || !selectedClient?.id) {
      setShifts([]);
      setRides([]);
      return;
    }

    if (selectedServiceCodes.length === 0) {
      setShifts([]);
      setRides([]);
      setLoadingItems(false);
      return;
    }

    if (!needsSupplementalFetch(selectedClient, readyToClaimRows, selectedServiceCodes)) {
      setShifts([]);
      setRides([]);
      setLoadingItems(false);
      return;
    }

    const clientServices = flattenClientServices(selectedClient);
    const needsShifts = clientServices.some(
      (service) => !isTransportationServiceForClaims(service),
    );
    const needsRides = clientServices.some(isTransportationServiceForClaims);
    const shiftBounds = computeClaimWizardShiftFetchBounds(selectedClient);
    const controller = new AbortController();

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const rideQuery: NonNullable<Parameters<typeof mileageApi.listAgency>[0]> & {
          agencyId: string;
        } = {
          clientId: selectedClient.id,
          status: "completed",
          approved: true,
          unclaimed: true,
          limit: 100,
          skipEnrichment: true,
          agencyId,
          ...(mode ? { clientType: mode } : {}),
        };
        const [shiftResponse, rideResponse] = await Promise.all([
          needsShifts
            ? listShifts(
                {
                  clientId: selectedClient.id,
                  startDate: shiftBounds.start,
                  endDate: shiftBounds.end,
                  status: ShiftStatus.COMPLETED,
                  approved: true,
                  employee: true,
                  billingClaim: true,
                  agencyId,
                  limit: 200,
                },
                { signal: controller.signal },
              )
            : Promise.resolve({ shifts: [] as Shift[] }),
          needsRides
            ? mileageApi.listAgency(rideQuery, { signal: controller.signal })
            : Promise.resolve({ data: [] as MileageRide[] }),
        ]);

        if (controller.signal.aborted) return;

        setShifts(shiftResponse.shifts ?? []);
        setRides(rideResponse.data ?? []);
      } catch {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch claim wizard items.");
        setShifts([]);
        setRides([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingItems(false);
        }
      }
    };

    void fetchItems();

    return () => {
      controller.abort();
    };
  }, [agencyId, mode, open, readyToClaimRows, selectedClient, selectedServiceCodes]);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      return;
    }

    if (displayRows.length > 0) {
      setSelectedIds(new Set(displayRows.map((row) => row.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [open, selectedClient?.id, selectedServiceIds.join(","), displayRowIdsKey]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSection = useCallback((itemIds: string[], checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const id of itemIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }, []);

  const selectedCount = previewItems.filter((item) => selectedIds.has(item.id)).length;
  const canConfirm =
    Boolean(selectedClient) &&
    selectedServiceIds.length > 0 &&
    selectedCount > 0 &&
    !saving &&
    !loadingItems &&
    !loadingClient;

  const handleConfirm = () => {
    if (!canConfirm || !selectedClient) return;

    const selectedRows = displayRows.filter((row) => selectedIds.has(row.id));
    // Claim leg: payer + both lines. Invoice leg: out-of-pocket + both lines. A `both` line is in
    // both, so generating produces both a claim (payer portion) and an invoice (out-of-pocket).
    // A leg already billed (needs* === false) is skipped so a half-billed line never re-POSTs;
    // undefined means the row came from the supplemental unclaimed fetch and is safe to bill.
    const claimRows = selectedRows.filter(
      (row) => row.coverage !== COVERAGE.OUT_OF_POCKET && row.needsClaim !== false,
    );
    const invoiceRows = selectedRows.filter(
      (row) =>
        (row.coverage === COVERAGE.OUT_OF_POCKET || row.coverage === COVERAGE.BOTH) &&
        row.needsInvoice !== false,
    );
    const claimSelections = mapBundlesToClaimConfirmSelections(
      splitRowsIntoClaimBundles(claimRows),
      selectedClient.id,
    );
    const invoiceSelections = mapBundlesToClaimConfirmSelections(
      splitRowsIntoClaimBundles(invoiceRows),
      selectedClient.id,
    );
    onGenerate(selectedClient.id, claimSelections, invoiceSelections);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={`${BILLING_CORNER_MODAL_TALL_CLASS} ${BILLING_CORNER_MODAL_SHELL_CLASS}`}
      >
        <BillingCornerModalHeader
          title="Generate bills"
          description="Search for a client, select services, then review approved shifts and rides to bill. Coverage routes each line to a payer claim, an out-of-pocket invoice, or both."
          onClose={onClose}
          closeDisabled={saving}
        />

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pt-6">
          <div>
            <label className={BILLING_FIELD_LABEL_CLASS}>Client</label>
            <div className="relative">
              <input
                type="text"
                value={clientQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setClientQuery(value);
                  setSelectedClient(null);
                  setSelectedServiceIds([]);
                  handleClientSearch(value);
                }}
                placeholder="Search client name..."
                className={`${BILLING_FIELD_CLASS} w-full pr-10`}
              />
              {(isSearchingClients || loadingClient) && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#808081]" />
              )}
              {showClientDropdown && clientSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-[#cccccd] bg-white shadow-lg">
                  {clientSearchResults.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => void handleClientSelect(client)}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                    >
                      <span className="text-[14px] text-[#10141a]">{client.name}</span>
                      <span className="text-[12px] uppercase text-[#808081]">{client.mode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedClient && (
            <>
              <div className="w-full">
                <label className={BILLING_FIELD_LABEL_CLASS}>Services</label>
                <MultiSelect
                  value={selectedServiceIds}
                  onValueChange={setSelectedServiceIds}
                  placeholder="Select services"
                  className="w-full"
                  buttonClassName={`${BILLING_FIELD_CLASS} w-full`}
                  disabled={services.length === 0}
                >
                  {services.map((service: ClientService) => (
                    <MultiSelectItem key={service.id} value={service.id ?? ""}>
                      {service.name} — {service.code}
                    </MultiSelectItem>
                  ))}
                </MultiSelect>
              </div>

              {loadingItems ? (
                <div className="flex items-center gap-2 py-8 text-[14px] text-[#808081]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading approved shifts and rides…
                </div>
              ) : selectedServiceIds.length === 0 ? (
                <p className="rounded-[12px] border border-[#e5e5e6] bg-[#fafafa] px-4 py-6 text-[14px] text-[#808081]">
                  Select at least one service to see claimable items.
                </p>
              ) : previewItems.length === 0 ? (
                <p className="rounded-[12px] border border-[#e5e5e6] bg-[#fafafa] px-4 py-6 text-[14px] text-[#808081]">
                  No approved shifts or rides for the selected services. Approve items in
                  Billing or Mileage first.
                </p>
              ) : (
                <>
                  <CoverageLegend />
                  <ClaimPreviewSection
                    title={previewListTitle}
                    items={previewItems}
                    selectedIds={selectedIds}
                    totalAmount={selectedTotalAmount}
                    payerSubtotal={selectedSplitTotals.payer}
                    outOfPocketSubtotal={selectedSplitTotals.outOfPocket}
                    onToggleItem={toggleItem}
                    onToggleAll={toggleSection}
                  />
                </>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 px-6 pb-8 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={cn(BILLING_SECONDARY_BUTTON_CLASS, "w-full sm:w-auto")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(BILLING_PRIMARY_BUTTON_CLASS, "w-full gap-2 sm:w-auto")}
            aria-busy={saving}
            aria-label={canConfirm ? undefined : "Select at least one item to generate bills."}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
