import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { FieldLabel, SectionLabel } from "./claimsModalShared";
import {
  CLAIM_REPORT_CHECKBOX_CLASS,
  CLAIMS_FIELD_CLASS,
  CLAIMS_WIZARD_MODAL_CLASS,
  CLAIMS_WIZARD_MODAL_SHELL_CLASS,
} from "./claimsModalStyles";

const WIZARD_TABLE_GRID =
  "grid grid-cols-[40px_minmax(110px,1fr)_minmax(90px,1fr)_minmax(150px,1.2fr)_minmax(70px,0.8fr)] items-center gap-3 px-4";

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
      return;
    }

    const controller = new AbortController();

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
            client: true,
            agencyId: user.agencyId,
            limit: 200,
          },
          { signal: controller.signal },
        );
        setShifts(response.shifts ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch shifts for claim wizard:", error);
        setShifts([]);
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
  }, [open, selectedClient?.id, user?.agencyId, weekBounds?.start, weekBounds?.end]);

  useEffect(() => {
    setSelectedShiftIds(new Set(filteredShifts.map((shift) => shift.id)));
  }, [filteredShifts]);

  const allSelected =
    filteredShifts.length > 0 && filteredShifts.every((shift) => selectedShiftIds.has(shift.id));

  const toggleAllShifts = () => {
    if (allSelected) {
      setSelectedShiftIds(new Set());
      return;
    }
    setSelectedShiftIds(new Set(filteredShifts.map((shift) => shift.id)));
  };

  const toggleShift = (shiftId: string) => {
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

  const selectedShifts = filteredShifts.filter((shift) => selectedShiftIds.has(shift.id));
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
        className={`${CLAIMS_WIZARD_MODAL_CLASS} ${CLAIMS_WIZARD_MODAL_SHELL_CLASS}`}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-[#e5e5e6] px-6 pb-4 pt-6 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-[20px] font-bold text-[#10141a]">
                Generate claim
              </DialogTitle>
              <p className="mt-1 text-[14px] text-[#808081]">
                Choose a client, service, and week, then review approved shifts.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              disabled={saving}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#e5e5e6] bg-[#f5f5f5] text-[#808081] hover:bg-[#eef4f5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div>
              <FieldLabel>Client</FieldLabel>
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
                  className={`${CLAIMS_FIELD_CLASS} w-full pr-10`}
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
                <div>
                  <FieldLabel>Service</FieldLabel>
                  <Select
                    value={selectedServiceId}
                    onValueChange={handleServiceChange}
                    disabled={services.length === 0}
                  >
                    <SelectTrigger className={CLAIMS_FIELD_CLASS}>
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

                <div>
                  <FieldLabel>Week range</FieldLabel>
                  <Select
                    value={String(selectedWeekIndex)}
                    onValueChange={(value) => setSelectedWeekIndex(Number(value))}
                    disabled={weekRows.length === 0}
                  >
                    <SelectTrigger className={CLAIMS_FIELD_CLASS}>
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
                  <SectionLabel>Approved shifts</SectionLabel>

                  {loadingShifts ? (
                    <div className="flex items-center gap-2 py-8 text-[14px] text-[#808081]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading shifts…
                    </div>
                  ) : filteredShifts.length === 0 ? (
                    <p className="rounded-[12px] border border-[#e5e5e6] bg-[#fafafa] px-4 py-6 text-[14px] text-[#808081]">
                      No approved shifts in this week. Try another week range or approve shifts in
                      Billing.
                    </p>
                  ) : (
                    <>
                      <div className="hidden overflow-hidden rounded-[12px] border border-[#e5e5e6] lg:block">
                        <div className={`${WIZARD_TABLE_GRID} border-b border-[#e5e5e6] py-3 text-[13px] font-semibold text-[#10141a]`}>
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleAllShifts}
                            className={CLAIM_REPORT_CHECKBOX_CLASS}
                            aria-label="Select all shifts"
                          />
                          <span>Service date</span>
                          <span>Staff ID</span>
                          <span>Duration</span>
                          <span>Hours</span>
                        </div>
                        {filteredShifts.map((shift) => (
                          <label
                            key={shift.id}
                            className={`${WIZARD_TABLE_GRID} cursor-pointer border-b border-[#e5e5e6] py-3 text-[13px] last:border-b-0 hover:bg-[#fafafa]`}
                          >
                            <Checkbox
                              checked={selectedShiftIds.has(shift.id)}
                              onCheckedChange={() => toggleShift(shift.id)}
                              className={CLAIM_REPORT_CHECKBOX_CLASS}
                            />
                            <span>{formatShiftServiceDate(shift)}</span>
                            <span className="truncate">{shift.employeeId ?? "—"}</span>
                            <span>{formatShiftDurationLabel(shift)}</span>
                            <span>{computeTotalHours(shift)}</span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-2 lg:hidden">
                        {filteredShifts.map((shift) => (
                          <label
                            key={shift.id}
                            className="flex cursor-pointer gap-3 rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4"
                          >
                            <Checkbox
                              checked={selectedShiftIds.has(shift.id)}
                              onCheckedChange={() => toggleShift(shift.id)}
                              className={`${CLAIM_REPORT_CHECKBOX_CLASS} mt-0.5`}
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-[14px] font-medium text-[#10141a]">
                                {formatShiftServiceDate(shift)}
                              </p>
                              <p className="text-[13px] text-[#808081]">
                                Staff {shift.employeeId ?? "—"} · {formatShiftDurationLabel(shift)}
                              </p>
                              <p className="text-[13px] text-[#808081]">
                                {computeTotalHours(shift)} hrs · {serviceCode}
                              </p>
                              <p className="truncate text-[12px] text-[#808081]">
                                {formatShiftLocation(shift.location)}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-[#e5e5e6] px-6 py-4 sm:flex-row sm:justify-end sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-full border border-[#e5e5e6] bg-white px-5 text-[14px] font-medium text-[#10141a] hover:bg-[#eef4f5] sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-full bg-[#00b4b8] px-5 text-[14px] font-medium text-white hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Creating claim…" : "Create claim"}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
