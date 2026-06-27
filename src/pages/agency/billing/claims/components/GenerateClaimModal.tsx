import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MultiSelect, MultiSelectItem } from "@/components/ui/multi-select";
import type { ReadyToClaimRow } from "@/lib/api/claims";
import { getClientById, searchClients, type Client, type ClientService } from "@/lib/api/clients";
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
import { useAuth } from "@/utils/auth";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import {
  buildClaimableRowsForClient,
  buildCombinedPreviewListTitle,
  mapBundleRowsToPreviewItems,
  mapBundlesToClaimConfirmSelections,
  needsSupplementalFetch,
  splitRowsIntoClaimBundles,
  sumSelectedPreviewCharges,
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
import ClaimPreviewSection from "./claimPreviewSection";
import OutOfPocketBadge from "./OutOfPocketBadge";

type GenerateClaimModalProps = {
  open: boolean;
  initialClientGroup?: RecentClaimClientGroup | null;
  saving?: boolean;
  readyToClaimRows?: ReadyToClaimRow[];
  mileageRate?: number;
  onClose: () => void;
  onConfirm: (selections: ClaimConfirmSelection[]) => void;
  /** Out-of-pocket clients bill an invoice instead of a state claim. */
  onConfirmInvoice?: (clientId: string, selections: ClaimConfirmSelection[]) => void;
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
  onConfirm,
  onConfirmInvoice,
}: GenerateClaimModalProps) {
  const { user } = useAuth();
  const agencyMode = useEffectiveAgencyMode();
  const [clientQuery, setClientQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
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
  const prefillRequestIdRef = useRef(0);

  const isOutOfPocketClient = selectedClient?.billingDirection === "out-of-pocket";

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

  const resetWizard = useCallback(() => {
    setClientQuery("");
    setClientSearchResults([]);
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
    };
  }, []);

  useEffect(() => {
    const clientId = initialClientGroup?.clientId;
    if (!open || !clientId || !user?.agencyId) {
      return;
    }

    const requestId = prefillRequestIdRef.current + 1;
    prefillRequestIdRef.current = requestId;

    const loadPrefill = async () => {
      setLoadingClient(true);
      try {
        const fullClient = await getClientById(clientId, user.agencyId);
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
      } catch (error) {
        if (prefillRequestIdRef.current !== requestId) {
          return;
        }
        console.error("Failed to load client for claim generation:", error);
        setSelectedClient(null);
      } finally {
        if (prefillRequestIdRef.current === requestId) {
          setLoadingClient(false);
        }
      }
    };

    void loadPrefill();
  }, [open, initialClientGroup, readyToClaimRows, user?.agencyId]);

  const handleClientSearch = useCallback(
    (searchQuery: string) => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }

      if (searchQuery.trim().length < 2) {
        setClientSearchResults([]);
        setShowClientDropdown(false);
        return;
      }

      clientSearchTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSearchingClients(true);
          const results = await searchClients(searchQuery, user?.agencyId, agencyMode ?? undefined);
          setClientSearchResults(results);
          setShowClientDropdown(results.length > 0);
        } catch (error) {
          console.error("Failed to search clients:", error);
          setClientSearchResults([]);
          setShowClientDropdown(false);
        } finally {
          setIsSearchingClients(false);
        }
      }, 300);
    },
    [user?.agencyId, agencyMode],
  );

  const handleClientSelect = useCallback(
    async (client: Client) => {
      if (!user?.agencyId) return;

      setClientQuery(getClientDisplayName(client));
      setShowClientDropdown(false);
      setClientSearchResults([]);
      setLoadingClient(true);

      try {
        const fullClient = await getClientById(client.id, user.agencyId);
        setSelectedClient(fullClient);
        const nextServices = flattenClientServices(fullClient);
        const defaultIds = getDefaultServiceIdsFromReadyRows(
          fullClient.id,
          nextServices,
          readyToClaimRows,
        );
        setSelectedServiceIds(defaultIds);
      } catch (error) {
        console.error("Failed to load client:", error);
        setSelectedClient(null);
      } finally {
        setLoadingClient(false);
      }
    },
    [readyToClaimRows, user?.agencyId],
  );

  useEffect(() => {
    if (!open || !selectedClient?.id || !user?.agencyId) {
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
                  agencyId: user.agencyId,
                  limit: 200,
                },
                { signal: controller.signal },
              )
            : Promise.resolve({ shifts: [] as Shift[] }),
          needsRides
            ? mileageApi.listAgency(
                {
                  clientId: selectedClient.id,
                  status: "completed",
                  approved: true,
                  unclaimed: true,
                  limit: 100,
                  skipEnrichment: true,
                },
                { signal: controller.signal },
              )
            : Promise.resolve({ data: [] as MileageRide[] }),
        ]);

        if (controller.signal.aborted) return;

        setShifts(shiftResponse.shifts ?? []);
        setRides(rideResponse.data ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch claim wizard items:", error);
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
  }, [open, readyToClaimRows, selectedClient, selectedServiceCodes, user?.agencyId]);

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
    const bundles = splitRowsIntoClaimBundles(selectedRows);
    const selections = mapBundlesToClaimConfirmSelections(bundles, selectedClient.id);

    if (isOutOfPocketClient && onConfirmInvoice) {
      onConfirmInvoice(selectedClient.id, selections);
      return;
    }
    onConfirm(selections);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={`${BILLING_CORNER_MODAL_TALL_CLASS} ${BILLING_CORNER_MODAL_SHELL_CLASS}`}
      >
        <BillingCornerModalHeader
          title={isOutOfPocketClient ? "Generate invoice" : "Generate claim"}
          description="Search for a client, select services, then review approved shifts and rides to bill."
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
                      <span className="text-[14px] text-[#10141a]">{getClientDisplayName(client)}</span>
                      {client.billingDirection === "out-of-pocket" && <OutOfPocketBadge />}
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
                <ClaimPreviewSection
                  title={previewListTitle}
                  items={previewItems}
                  selectedIds={selectedIds}
                  totalAmount={selectedTotalAmount}
                  onToggleItem={toggleItem}
                  onToggleAll={toggleSection}
                />
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
            aria-label={
              canConfirm
                ? undefined
                : `Select at least one item to generate ${isOutOfPocketClient ? "an invoice" : "a claim"}.`
            }
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                {isOutOfPocketClient ? "Generating invoice…" : "Generating claim…"}
              </>
            ) : isOutOfPocketClient ? (
              "Generate invoice"
            ) : (
              "Generate claim"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
