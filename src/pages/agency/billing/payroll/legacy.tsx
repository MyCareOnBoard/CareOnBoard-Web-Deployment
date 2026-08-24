import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/utils/auth";
import { useSelector } from "react-redux";

import { getAgencyById } from "@/lib/api/agencies";

import {

  createPayrollInvoice,

  getPayrollInvoiceById,

  getCreatePayrollInvoiceErrorMessage,

  getPayrollBlockedShifts,

  getPayrollInvoiceMutationErrorMessage,

  getPayrollListErrorMessage,

  type PayrollInvoiceDetail,

  type PayrollInvoiceListItem,

  type PayrollInvoicePreview,

} from "@/lib/api/payroll";

import BillingDashboardHeader from "../components/BillingDashboardHeader";

import PayrollOverviewCards from "./components/PayrollOverviewCards";

import DuePayrollTable from "./components/DuePayrollTable";

import PayrollSummaryChart from "./components/PayrollSummaryChart";

import TopOvertimeAlerts from "./components/TopOvertimeAlerts";

import PayrollWorkspaceTabs, {

  type PayrollWorkspaceTab,

} from "./components/PayrollWorkspaceTabs";

import SavedPayrollTable from "./components/SavedPayrollTable";

import CancelPayrollInvoiceDialog from "./components/CancelPayrollInvoiceDialog";
import MarkPayrollInvoicePaidDialog, {
  type MarkPayrollInvoicePaidTarget,
} from "./components/MarkPayrollInvoicePaidDialog";

import PayrollActionLoadingOverlay, {

  getPayrollInvoiceLoadingCopy,

} from "./components/PayrollActionLoadingOverlay";

import type { DuePayrollEntry } from "@/lib/api/payroll";

import type { PayrollInvoiceDocument } from "./types";

import { usePayrollDashboard } from "./hooks/usePayrollDashboard";

import { useStaffToPay } from "./hooks/useStaffToPay";

import { useStaffTimesheetsToPay } from "./hooks/useStaffTimesheetsToPay";

import { createStaffPayrollInvoice, getStaffTimesheetErrorMessage } from "@/lib/api/staff-timesheets";

import { usePayrollInvoices } from "./hooks/usePayrollInvoices";

import { getCurrentWeekDateRange } from "./utils/payrollDashboardUtils";

import {

  buildCreatePayloadFromSelection,

  buildPayrollInvoiceDocument,

  needsAgencyFallback,

} from "./utils/buildPayrollInvoiceDocument";
import {
  OperationalAgencyProvider,
  useOperationalAgency,
} from "@/lib/operational-agency/OperationalAgencyProvider";
import { createAgencyOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import { agencyDirectoryRoutes } from "@/lib/operational-agency/routes";
import { resolveEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import type { RootState } from "@/store/redux/store";
import { UserType } from "@/utils/auth/types/user.types";



const PayrollInvoiceModal = lazy(() => import("./components/PayrollInvoiceModal"));
const CreatePayrollInvoiceModal = lazy(() => import("./components/CreatePayrollInvoiceModal"));



export function PayrollDashboardContent() {

  const { agencyId } = useOperationalAgency();

  const { toast } = useToast();

  const [dateRange, setDateRange] = useState(getCurrentWeekDateRange);

  const [activeTab, setActiveTab] = useState<PayrollWorkspaceTab>("staff");

  const [openingInvoice, setOpeningInvoice] = useState<{ staffName: string } | null>(null);

  const [createInvoiceEntry, setCreateInvoiceEntry] = useState<DuePayrollEntry | null>(null);

  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const [invoiceModal, setInvoiceModal] = useState<{

    staffName: string;

    invoice: PayrollInvoiceDocument;

    invoiceId?: string;

  } | null>(null);

  const [cancelModalInvoice, setCancelModalInvoice] = useState<PayrollInvoiceListItem | null>(null);

  const [markPaidConfirmTarget, setMarkPaidConfirmTarget] =
    useState<MarkPayrollInvoicePaidTarget | null>(null);

  const [cancellingInvoice, setCancellingInvoice] = useState(false);

  const [markingPaid, setMarkingPaid] = useState(false);

  const openingInvoiceRequestIdRef = useRef(0);
  const operationControllerRef = useRef<AbortController | null>(null);

  const lastDashboardErrorRef = useRef<string | null>(null);

  const lastGeneratedErrorRef = useRef<string | null>(null);

  const lastStaffToPayErrorRef = useRef<string | null>(null);

  const lastStaffTimesheetsErrorRef = useRef<string | null>(null);

  const beginOperation = useCallback(() => {
    operationControllerRef.current?.abort();
    const controller = new AbortController();
    operationControllerRef.current = controller;
    return controller;
  }, []);

  useEffect(() => () => {
    openingInvoiceRequestIdRef.current += 1;
    operationControllerRef.current?.abort();
  }, []);



  const {

    overviewStats,

    statusChart,

    overtimeAlerts,

    loading: dashboardLoading,

    isRefetching: dashboardRefetching,

    error: dashboardError,

    refetch: refetchDashboard,

  } = usePayrollDashboard(dateRange);



  const {

    entries: staffToPayEntries,

    total: staffToPayTotal,

    loading: staffToPayLoading,

    isRefetching: staffToPayRefetching,

    error: staffToPayError,

    refetch: refetchStaffToPay,

  } = useStaffToPay(dateRange, {

    enabled: activeTab === "staff",

    duePage: 1,

    dueLimit: 100,

  });

  const {
    entries: staffTimesheetEntries,
    loading: staffTimesheetsLoading,
    error: staffTimesheetsError,
    refetch: refetchStaffTimesheets,
  } = useStaffTimesheetsToPay({ enabled: activeTab === "staff" });

  // Approved staff timesheets show at the top of "staff to pay", above shift-derived rows.
  const dueEntries = useMemo(
    () => [...staffTimesheetEntries, ...staffToPayEntries],
    [staffTimesheetEntries, staffToPayEntries],
  );



  const {

    invoices: generatedInvoiceList,

    loading: generatedLoading,

    error: generatedError,

    mutating: generatedMutating,

    refetch: refetchGeneratedInvoices,

    markPaid,

    cancelInvoice,

  } = usePayrollInvoices(dateRange, {

    enabled: activeTab === "generated",

  });



  useEffect(() => {

    if (!dashboardError) {

      lastDashboardErrorRef.current = null;

      return;

    }



    if (lastDashboardErrorRef.current === dashboardError) {

      return;

    }



    lastDashboardErrorRef.current = dashboardError;

    toast({

      title: "Couldn't load payroll dashboard",

      description: "Check your connection and try again.",

      variant: "destructive",

    });

  }, [dashboardError, toast]);



  useEffect(() => {

    if (!generatedError) {

      lastGeneratedErrorRef.current = null;

      return;

    }



    if (lastGeneratedErrorRef.current === generatedError) {

      return;

    }



    lastGeneratedErrorRef.current = generatedError;

    toast({

      title: "Couldn't load generated payroll",

      description: getPayrollListErrorMessage(generatedError),

      variant: "destructive",

    });

  }, [generatedError, toast]);



  useEffect(() => {

    if (!staffToPayError) {

      lastStaffToPayErrorRef.current = null;

      return;

    }



    if (lastStaffToPayErrorRef.current === staffToPayError) {

      return;

    }



    lastStaffToPayErrorRef.current = staffToPayError;

    toast({

      title: "Couldn't load staff to pay",

      description: getPayrollListErrorMessage(staffToPayError),

      variant: "destructive",

    });

  }, [staffToPayError, toast]);



  useEffect(() => {
    if (!staffTimesheetsError) {
      lastStaffTimesheetsErrorRef.current = null;
      return;
    }
    if (lastStaffTimesheetsErrorRef.current === staffTimesheetsError) {
      return;
    }
    lastStaffTimesheetsErrorRef.current = staffTimesheetsError;
    toast({
      title: "Couldn't load approved timesheets",
      description: getPayrollListErrorMessage(staffTimesheetsError),
      variant: "destructive",
    });
  }, [staffTimesheetsError, toast]);



  const refreshPayrollWorkspace = useCallback(
    async ({ refreshStaff = false }: { refreshStaff?: boolean } = {}) => {
      const tasks = [refetchDashboard(), refetchGeneratedInvoices({ force: true })];
      if (refreshStaff || activeTab === "staff") {
        tasks.push(refetchStaffToPay({ force: true }));
        tasks.push(refetchStaffTimesheets({ force: true }));
      }
      await Promise.all(tasks);
    },
    [activeTab, refetchDashboard, refetchGeneratedInvoices, refetchStaffToPay, refetchStaffTimesheets],
  );



  const fetchAgencyFallbackIfNeeded = useCallback(

    async (prefill: PayrollInvoiceDetail["invoicePrefill"]) => {

      if (!needsAgencyFallback(prefill)) {

        return undefined;

      }



      return getAgencyById(agencyId).catch(() => undefined);

    },

    [agencyId],

  );



  const openInvoiceDetail = useCallback(

    async (detail: PayrollInvoiceDetail, agencyFallback?: Awaited<ReturnType<typeof getAgencyById>>) => {

      const document = buildPayrollInvoiceDocument(detail, detail.invoicePrefill, agencyFallback);

      if (!document) {

        throw new Error("Invoice details are unavailable.");

      }



      setInvoiceModal({

        staffName: detail.employeeName ?? document.staffMember.name,

        invoice: { ...document, invoiceId: detail.id, status: detail.status },

        invoiceId: detail.id,

      });

    },

    [],

  );



  const handleCreateStaffTimesheetInvoice = useCallback(
    async (entry: DuePayrollEntry) => {
      if (!entry.staffUid || !entry.staffTimesheetIds?.length) return;

      const requestId = openingInvoiceRequestIdRef.current + 1;
      openingInvoiceRequestIdRef.current = requestId;
      const controller = beginOperation();
      setCreatingInvoice(true);
      setOpeningInvoice({ staffName: entry.staffName });

      try {
        const created = await createStaffPayrollInvoice({
          context: { agencyId },
          payload: {
            staffUid: entry.staffUid,
            periodStart: entry.dateRangeStart,
            periodEnd: entry.dateRangeEnd,
            staffTimesheetIds: entry.staffTimesheetIds,
          },
          signal: controller.signal,
        });
        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;

        const detail = await getPayrollInvoiceById({
          context: { agencyId },
          invoiceId: created.id,
          signal: controller.signal,
        });
        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;
        const agency = await fetchAgencyFallbackIfNeeded(detail.invoicePrefill);
        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;
        await openInvoiceDetail(detail, agency);
        setActiveTab("generated");
        await refreshPayrollWorkspace({ refreshStaff: true });
        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;
        toast({
          title: "Payroll invoice created",
          description: `Timesheet payroll for ${entry.staffName} is ready to review.`,
        });
      } catch (error) {
        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;
        toast({
          title: "Couldn't create payroll invoice",
          description: getStaffTimesheetErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        if (!controller.signal.aborted && openingInvoiceRequestIdRef.current === requestId) {
          setCreatingInvoice(false);
          setOpeningInvoice(null);
        }
      }
    },
    [agencyId, beginOperation, fetchAgencyFallbackIfNeeded, openInvoiceDetail, refreshPayrollWorkspace, toast],
  );

  const handleCreateInvoiceClick = useCallback(
    (entry: DuePayrollEntry) => {
      if (entry.source === "staffTimesheet") {
        void handleCreateStaffTimesheetInvoice(entry);
        return;
      }
      setCreateInvoiceEntry(entry);
    },
    [handleCreateStaffTimesheetInvoice],
  );

  const handleConfirmCreateInvoice = useCallback(
    async (preview: PayrollInvoicePreview, selectedIds: Set<string>) => {
      const requestId = openingInvoiceRequestIdRef.current + 1;
      openingInvoiceRequestIdRef.current = requestId;
      const controller = beginOperation();
      setCreatingInvoice(true);
      setOpeningInvoice({ staffName: preview.employeeName });

      try {
        const created = await createPayrollInvoice({
          context: { agencyId },
          payload: buildCreatePayloadFromSelection(preview, selectedIds),
          signal: controller.signal,
        });

        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) {
          return;
        }

        setCreateInvoiceEntry(null);

        const agency = await fetchAgencyFallbackIfNeeded(created.invoicePrefill);
        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;
        await openInvoiceDetail(created, agency);
        setActiveTab("generated");
        await refreshPayrollWorkspace({ refreshStaff: true });
        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;
        toast({
          title: "Payroll invoice created",
          description: `Invoice ${created.invoiceNumber} is ready to review.`,
        });
      } catch (error) {
        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) {
          return;
        }

        const blockedShifts = getPayrollBlockedShifts(error);
        toast({
          title: "Couldn't create payroll invoice",
          description:
            blockedShifts.length > 0
              ? `${getCreatePayrollInvoiceErrorMessage(error)} Blocked: ${blockedShifts
                  .map(
                    (shift) =>
                      `${shift.date ?? "unknown date"} — ${shift.clientName ?? "client"} (${
                        shift.serviceCode ?? "no code"
                      }): ${shift.reason}`,
                  )
                  .join("; ")}`
              : getCreatePayrollInvoiceErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        if (!controller.signal.aborted && openingInvoiceRequestIdRef.current === requestId) {
          setCreatingInvoice(false);
          setOpeningInvoice(null);
        }
      }
    },
    [agencyId, beginOperation, fetchAgencyFallbackIfNeeded, openInvoiceDetail, refreshPayrollWorkspace, toast],
  );



  const handleViewInvoice = useCallback(

    async (invoice: PayrollInvoiceListItem) => {

      const requestId = openingInvoiceRequestIdRef.current + 1;

      openingInvoiceRequestIdRef.current = requestId;
      const controller = beginOperation();

      setOpeningInvoice({ staffName: invoice.employeeName ?? "Staff member" });



      try {

        const detail = await getPayrollInvoiceById({
          context: { agencyId },
          invoiceId: invoice.id,
          signal: controller.signal,
        });



        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) {

          return;

        }



        const agency = await fetchAgencyFallbackIfNeeded(detail.invoicePrefill);

        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;

        await openInvoiceDetail(detail, agency);

      } catch (error) {

        if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;

        toast({

          title: "Couldn't open payroll invoice",

          description: error instanceof Error ? error.message : "Try again.",

          variant: "destructive",

        });

      } finally {

        if (!controller.signal.aborted && openingInvoiceRequestIdRef.current === requestId) {

          setOpeningInvoice(null);

        }

      }

    },

    [agencyId, beginOperation, fetchAgencyFallbackIfNeeded, openInvoiceDetail, toast],

  );



  const handleRequestMarkPaidFromModal = useCallback(() => {
    if (!invoiceModal?.invoiceId) {
      return;
    }

    setMarkPaidConfirmTarget({
      id: invoiceModal.invoiceId,
      invoiceNumber: invoiceModal.invoice.invoiceNumber ?? invoiceModal.invoiceId,
      employeeName: invoiceModal.staffName,
    });
  }, [invoiceModal]);

  const handleRequestMarkPaidFromTable = useCallback((invoice: PayrollInvoiceListItem) => {
    setMarkPaidConfirmTarget({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      employeeName: invoice.employeeName,
    });
  }, []);

  const handleConfirmMarkPaid = useCallback(async () => {
    if (!markPaidConfirmTarget) {
      return;
    }

    const requestId = openingInvoiceRequestIdRef.current + 1;
    openingInvoiceRequestIdRef.current = requestId;
    const controller = beginOperation();
    setMarkingPaid(true);

    try {
      await markPaid(markPaidConfirmTarget.id, controller.signal);
      if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;
      await refreshPayrollWorkspace();
      if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;

      const staffLabel = markPaidConfirmTarget.employeeName ?? "staff";
      setMarkPaidConfirmTarget(null);

      if (invoiceModal?.invoiceId === markPaidConfirmTarget.id) {
        setInvoiceModal(null);
      }

      toast({
        title: "Invoice marked as paid",
        description: `Payroll for ${staffLabel} was marked as paid.`,
      });
    } catch (error) {
      if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;
      toast({
        title: "Couldn't mark invoice as paid",
        description: getPayrollInvoiceMutationErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      if (!controller.signal.aborted && openingInvoiceRequestIdRef.current === requestId) {
        setMarkingPaid(false);
      }
    }
  }, [beginOperation, invoiceModal?.invoiceId, markPaid, markPaidConfirmTarget, refreshPayrollWorkspace, toast]);

  const handleConfirmCancelInvoice = useCallback(async () => {

    if (!cancelModalInvoice) {

      return;

    }



    const requestId = openingInvoiceRequestIdRef.current + 1;
    openingInvoiceRequestIdRef.current = requestId;
    const controller = beginOperation();
    setCancellingInvoice(true);

    try {

      await cancelInvoice(cancelModalInvoice.id, controller.signal);

      if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;

      await refreshPayrollWorkspace({ refreshStaff: true });

      if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;

      setCancelModalInvoice(null);

      toast({

        title: "Payroll invoice cancelled",

        description: "Shifts are available to invoice again.",

      });

    } catch (error) {

      if (controller.signal.aborted || openingInvoiceRequestIdRef.current !== requestId) return;

      toast({

        title: "Couldn't cancel payroll invoice",

        description: getPayrollInvoiceMutationErrorMessage(error),

        variant: "destructive",

      });

    } finally {

      if (!controller.signal.aborted && openingInvoiceRequestIdRef.current === requestId) {
        setCancellingInvoice(false);
      }

    }

  }, [beginOperation, cancelInvoice, cancelModalInvoice, refreshPayrollWorkspace, toast]);



  const invoiceLoadingCopy = openingInvoice

    ? getPayrollInvoiceLoadingCopy(openingInvoice.staffName)

    : null;



  return (

    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">

      <BillingDashboardHeader

        title="Payroll dashboard"

        subtitle="Payroll uses staff rates from client service configuration."

        dateRange={dateRange}

        onDateRangeChange={setDateRange}

        dateRangeModalDescription="Choose a date range to filter your payroll dashboard"

      />



      {dashboardRefetching && (

        <p className="text-[13px] text-[#808081]">Updating payroll dashboard…</p>

      )}



      <PayrollOverviewCards stats={overviewStats} loading={dashboardLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <PayrollSummaryChart chart={statusChart} loading={dashboardLoading} />

        <TopOvertimeAlerts alerts={overtimeAlerts} loading={dashboardLoading} />

      </div>



      <div className="space-y-4">

        <PayrollWorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />



        {activeTab === "staff" ? (

          <DuePayrollTable

            entries={dueEntries}

            dueTotal={staffToPayTotal + staffTimesheetEntries.length}

            loading={staffToPayLoading || staffTimesheetsLoading}

            isRefetching={staffToPayRefetching}

            onCreateInvoiceClick={handleCreateInvoiceClick}

            actionsDisabled={
              openingInvoice !== null || creatingInvoice || generatedMutating || markingPaid
            }

          />

        ) : (

          <SavedPayrollTable

            invoices={generatedInvoiceList}

            loading={generatedLoading}

            onViewInvoice={handleViewInvoice}

            onMarkPaid={handleRequestMarkPaidFromTable}

            onCancel={setCancelModalInvoice}

            actionsDisabled={openingInvoice !== null || generatedMutating || markingPaid}

          />

        )}

      </div>



      {createInvoiceEntry && (
        <Suspense fallback={null}>
          <CreatePayrollInvoiceModal
            open
            entry={createInvoiceEntry}
            saving={creatingInvoice}
            onClose={() => {
              if (!creatingInvoice) {
                setCreateInvoiceEntry(null);
              }
            }}
            onConfirm={(preview, selectedIds) => {
              void handleConfirmCreateInvoice(preview, selectedIds);
            }}
          />
        </Suspense>
      )}

      {invoiceModal && !openingInvoice && (

        <Suspense fallback={null}>

          <PayrollInvoiceModal

            key={invoiceModal.invoiceId ?? invoiceModal.staffName}

            open

            staffName={invoiceModal.staffName}

            invoice={invoiceModal.invoice}

            onClose={() => setInvoiceModal(null)}

            onMarkPaid={
              invoiceModal.invoice.status === "pending" ? handleRequestMarkPaidFromModal : undefined
            }
            markingPaid={markingPaid}

          />

        </Suspense>

      )}



      <MarkPayrollInvoicePaidDialog
        open={Boolean(markPaidConfirmTarget)}
        invoice={markPaidConfirmTarget}
        saving={markingPaid}
        onClose={() => setMarkPaidConfirmTarget(null)}
        onConfirm={handleConfirmMarkPaid}
      />

      <CancelPayrollInvoiceDialog

        open={Boolean(cancelModalInvoice)}

        invoice={cancelModalInvoice}

        saving={cancellingInvoice}

        onClose={() => setCancelModalInvoice(null)}

        onConfirm={handleConfirmCancelInvoice}

      />



      {invoiceLoadingCopy && (

        <PayrollActionLoadingOverlay

          title={invoiceLoadingCopy.title}

          description={invoiceLoadingCopy.description}

        />

      )}

    </div>

  );

}

export default function PayrollDashboardPage() {
  const { agencyId } = useOperationalAgency();
  return <PayrollDashboardContent key={agencyId} />;
}

export function LegacyAgencyPayrollDashboardPage() {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const supportedClientTypes = user?.agency?.supportedClientTypes ?? [];
  const storedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const mode = resolveEffectiveAgencyMode(supportedClientTypes, storedMode);
  const data = useMemo(() => createAgencyOperationalDataAdapter(agencyId), [agencyId]);
  const accessList = user?.profile?.accessList ?? [];
  const isAgencyOwner = user?.userType === UserType.AGENCY;

  if (!agencyId) {
    return <p role="alert" className="px-4 py-8 text-sm text-[#808081]">Sign in again to manage billing.</p>;
  }

  return (
    <OperationalAgencyProvider
      key={agencyId}
      actor="agency"
      agencyId={agencyId}
      agency={{
        id: agencyId,
        name: user?.agency?.name || user?.fullName || "Agency",
        status: "active",
        supportedClientTypes,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }}
      mode={mode}
      capabilities={{
        canManageShifts: true,
        canManageBilling: true,
        shiftMaintenance: true,
        canAccessClientDirectory: isAgencyOwner || accessList.includes("Client Management"),
        canAccessStaffDirectory: isAgencyOwner || accessList.includes("DSP Management"),
      }}
      directoryRoutes={agencyDirectoryRoutes}
      data={data}
    >
      <PayrollDashboardPage />
    </OperationalAgencyProvider>
  );
}
