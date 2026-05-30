import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getClientById, searchClients, type Client, type ClientService } from "@/lib/api/clients";
import { listShifts, ShiftStatus, formatShiftLocation, type Shift } from "@/lib/api/shifts";
import { formatWeeklyDistributionDropdownLabel } from "@/pages/agency/scheduling/weeklyDistributionSchedule";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CORNER_MODAL_SHELL_CLASS,
  BILLING_CORNER_MODAL_TALL_CLASS,
  BILLING_FIELD_CLASS,
  BILLING_FIELD_LABEL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { useAuth } from "@/utils/auth";
import { computeTotalHours } from "../utils/claimShiftBillingUtils";
import {
  filterShiftsForClaimSelection,
  flattenClientServices,
  formatShiftDurationLabel,
  pickDefaultServiceWithWeekRows,
  pickDefaultWeekRowIndex,
  resolveServiceCode,
  resolveWeekRangeIsoBounds,
} from "../utils/claimSelectionUtils";
import { SectionLabel } from "./claimsModalShared";
import { CLAIM_REPORT_CHECKBOX_CLASS } from "./claimsModalStyles";

type GenerateClaimModalProps = {
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (
    selectedShifts: Shift[],
    context: { serviceCode: string; weekRange?: string },
  ) => void;
};

function getClientDisplayName(client: Client) {
  return client.firstName && client.lastName
    ? `${client.firstName} ${client.lastName}`
    : client.id;
}

function formatShiftServiceDate(shift: Shift): string {
  if (!shift.date) return "—";
  try {
    return format(parseISO(shift.date), "MMM d, yyyy");
  } catch {
    return shift.date;
  }
}

function getShiftEmployeeLabel(shift: Shift): string {
  return shift.employee?.fullName?.trim() || shift.employeeId || "—";
}

function isShiftClaimed(shift: Shift): boolean {
  return Boolean(shift.claimId);
}

export default function GenerateClaimModal({
  open,
  saving = false,
  onClose,
  onConfirm,
}: GenerateClaimModalProps) {
  const { user } = useAuth();
  const [clientQuery, setClientQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const clientSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const services = useMemo(
    () => flattenClientServices(selectedClient ?? undefined),
    [selectedClient],
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [services, selectedServiceId],
  );

  const weekRows = selectedService?.sdrWeeklyDistribution?.rows ?? [];
  const selectedWeekRow = weekRows[selectedWeekIndex];
  const weekBounds = useMemo(
    () => resolveWeekRangeIsoBounds(selectedWeekRow?.weekRange),
    [selectedWeekRow?.weekRange],
  );

  const serviceCode = resolveServiceCode(selectedService);

  const filteredShifts = useMemo(
    () => filterShiftsForClaimSelection(shifts, serviceCode, weekBounds),
    [shifts, serviceCode, weekBounds],
  );

  const selectableShifts = useMemo(
    () => filteredShifts.filter((shift) => !isShiftClaimed(shift)),
    [filteredShifts],
  );

  const resetWizard = useCallback(() => {
    setClientQuery("");
    setClientSearchResults([]);
    setShowClientDropdown(false);
    setSelectedClient(null);
    setSelectedServiceId("");
    setSelectedWeekIndex(0);
    setShifts([]);
    setSelectedShiftIds(new Set());
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
          const results = await searchClients(searchQuery, user?.agencyId);
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
    [user?.agencyId],
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

        const defaultService = pickDefaultServiceWithWeekRows(fullClient);
        const nextServices = flattenClientServices(fullClient);
        const service =
          defaultService ??
          nextServices.find((item) => (item.sdrWeeklyDistribution?.rows?.length ?? 0) > 0) ??
          nextServices[0];

        if (service?.id) {
          setSelectedServiceId(service.id);
          const rows = service.sdrWeeklyDistribution?.rows ?? [];
          setSelectedWeekIndex(pickDefaultWeekRowIndex(rows));
        } else {
          setSelectedServiceId("");
          setSelectedWeekIndex(0);
        }
      } catch (error) {
        console.error("Failed to load client:", error);
        setSelectedClient(null);
      } finally {
        setLoadingClient(false);
      }
    },
    [user?.agencyId],
  );

  useEffect(() => {
    if (!open || !selectedClient?.id || !user?.agencyId || !weekBounds) {
      setShifts([]);
      setSelectedShiftIds(new Set());
      return;
    }

    const controller = new AbortController();
    const activeServiceCode = serviceCode;

    const fetchShifts = async () => {
      try {
        setLoadingShifts(true);
        const response = await listShifts(
          {
            clientId: selectedClient.id,
            startDate: weekBounds.start,
            endDate: weekBounds.end,
            status: ShiftStatus.COMPLETED,
            approvedForClaim: true,
            employee: true,
            billingClaim: true,
            agencyId: user.agencyId,
            limit: 200,
          },
          { signal: controller.signal },
        );
        const nextShifts = response.shifts ?? [];
        const nextFilteredShifts = filterShiftsForClaimSelection(
          nextShifts,
          activeServiceCode,
          weekBounds,
        );
        const nextSelectableShifts = nextFilteredShifts.filter((shift) => !isShiftClaimed(shift));
        setShifts(nextShifts);
        setSelectedShiftIds(new Set(nextSelectableShifts.map((shift) => shift.id)));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch shifts for claim wizard:", error);
        setShifts([]);
        setSelectedShiftIds(new Set());
      } finally {
        if (!controller.signal.aborted) {
          setLoadingShifts(false);
        }
      }
    };

    void fetchShifts();

    return () => {
      controller.abort();
    };
  }, [open, selectedClient?.id, user?.agencyId, weekBounds, serviceCode]);

  const allSelected =
    selectableShifts.length > 0 &&
    selectableShifts.every((shift) => selectedShiftIds.has(shift.id));

  const toggleAllShifts = () => {
    if (allSelected) {
      setSelectedShiftIds(new Set());
      return;
    }
    setSelectedShiftIds(new Set(selectableShifts.map((shift) => shift.id)));
  };

  const toggleShift = (shiftId: string) => {
    const shift = filteredShifts.find((item) => item.id === shiftId);
    if (shift && isShiftClaimed(shift)) {
      return;
    }

    setSelectedShiftIds((previous) => {
      const next = new Set(previous);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = services.find((item) => item.id === serviceId);
    const rows = service?.sdrWeeklyDistribution?.rows ?? [];
    setSelectedWeekIndex(pickDefaultWeekRowIndex(rows));
  };

  const selectedShifts = selectableShifts.filter((shift) => selectedShiftIds.has(shift.id));
  const canConfirm = selectedShifts.length > 0 && !saving && !loadingShifts && !loadingClient;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(selectedShifts, {
      serviceCode,
      weekRange: selectedWeekRow?.weekRange,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={`${BILLING_CORNER_MODAL_TALL_CLASS} ${BILLING_CORNER_MODAL_SHELL_CLASS}`}
      >
        <BillingCornerModalHeader
          title="Generate claim"
          description="Search for a client, pick a service and week, then choose which approved shifts to bill."
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
                    setSelectedServiceId("");
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
                        className="w-full cursor-pointer border-b border-[#f0f0f0] px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                      >
                        <p className="text-[14px] text-[#10141a]">{getClientDisplayName(client)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedClient && (
              <>
                <div className="w-full">
                  <label className={BILLING_FIELD_LABEL_CLASS}>Service</label>
                  <Select
                    value={selectedServiceId}
                    onValueChange={handleServiceChange}
                    disabled={services.length === 0}
                  >
                    <SelectTrigger className={`${BILLING_FIELD_CLASS} w-full`}>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service: ClientService) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} — {service.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full">
                  <label className={BILLING_FIELD_LABEL_CLASS}>Week range</label>
                  <Select
                    value={String(selectedWeekIndex)}
                    onValueChange={(value) => setSelectedWeekIndex(Number(value))}
                    disabled={weekRows.length === 0}
                  >
                    <SelectTrigger className={`${BILLING_FIELD_CLASS} w-full`}>
                      <SelectValue placeholder="Select week range" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekRows.map((row, index) => (
                        <SelectItem key={`${row.weekRange}-${index}`} value={String(index)}>
                          {formatWeeklyDistributionDropdownLabel(row)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <SectionLabel>Shifts to include</SectionLabel>

                  {loadingShifts ? (
                    <div className="flex items-center gap-2 py-8 text-[14px] text-[#808081]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading approved shifts…
                    </div>
                  ) : filteredShifts.length === 0 ? (
                    <p className="rounded-[12px] border border-[#e5e5e6] bg-[#fafafa] px-4 py-6 text-[14px] text-[#808081]">
                      No approved shifts for this week. Choose a different week range, or approve
                      shifts in Billing first.
                    </p>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center gap-3">
                        <Checkbox
                          checked={allSelected}
                          onChange={toggleAllShifts}
                          disabled={selectableShifts.length === 0}
                          className={CLAIM_REPORT_CHECKBOX_CLASS}
                          aria-label="Select all available shifts"
                        />
                        <span className="text-[14px] font-medium text-[#10141a]">
                          Select all available ({selectableShifts.length})
                        </span>
                      </div>

                      <div className="space-y-2">
                        {filteredShifts.map((shift) => {
                          const claimed = isShiftClaimed(shift);
                          const employeeName = getShiftEmployeeLabel(shift);
                          const visitLocation = formatShiftLocation(shift.location);
                          const shiftDateLabel = formatShiftServiceDate(shift);
                          const durationLabel = formatShiftDurationLabel(shift);

                          return (
                          <div
                            key={shift.id}
                            className={`flex gap-3 rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4 ${
                              claimed ? "opacity-60" : ""
                            }`}
                          >
                            <Checkbox
                              checked={!claimed && selectedShiftIds.has(shift.id)}
                              onChange={() => toggleShift(shift.id)}
                              disabled={claimed}
                              className={`${CLAIM_REPORT_CHECKBOX_CLASS} mt-0.5`}
                              aria-label={
                                claimed
                                  ? `Shift on ${shiftDateLabel} is already on a claim and cannot be added`
                                  : `Include shift on ${shiftDateLabel} in this claim`
                              }
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-[14px] font-medium text-[#10141a]">
                                {serviceCode} · {shiftDateLabel} · {durationLabel} ·{" "}
                                {computeTotalHours(shift)} hrs
                              </p>
                              <p className="text-[13px] text-[#808081]">
                                Staff: {employeeName}
                              </p>
                              {claimed && shift.billingClaim?.claimNumber ? (
                                <p className="text-[12px] font-medium text-[#808081]">
                                  Already on claim {shift.billingClaim.claimNumber}
                                </p>
                              ) : null}
                              {visitLocation ? (
                                <p
                                  className="truncate text-[12px] text-[#808081]"
                                  title={visitLocation}
                                >
                                  Visit location: {visitLocation}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 px-6 pb-8 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={BILLING_SECONDARY_BUTTON_CLASS}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={BILLING_PRIMARY_BUTTON_CLASS}
          >
            {saving ? "Creating claim…" : "Create claim"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
