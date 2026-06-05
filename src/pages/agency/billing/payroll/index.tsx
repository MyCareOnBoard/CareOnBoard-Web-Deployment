import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/utils/auth";

import { getAgencyById } from "@/lib/api/agencies";

import {

  createPayrollInvoice,

  getPayrollInvoiceById,

  getCreatePayrollInvoiceErrorMessage,

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

import { usePayrollInvoices } from "./hooks/usePayrollInvoices";

import { getCurrentWeekDateRange } from "./utils/payrollDashboardUtils";

import {

  buildCreatePayloadFromSelection,

  buildPayrollInvoiceDocument,

  needsAgencyFallback,

} from "./utils/buildPayrollInvoiceDocument";



const PayrollInvoiceModal = lazy(() => import("./components/PayrollInvoiceModal"));
const CreatePayrollInvoiceModal = lazy(() => import("./components/CreatePayrollInvoiceModal"));



export default function PayrollDashboardPage() {

  const { user } = useAuth();

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

  const lastDashboardErrorRef = useRef<string | null>(null);

  const lastGeneratedErrorRef = useRef<string | null>(null);

  const lastStaffToPayErrorRef = useRef<string | null>(null);



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



  const refreshPayrollWorkspace = useCallback(
    async ({ refreshStaff = false }: { refreshStaff?: boolean } = {}) => {
      const tasks = [refetchDashboard(), refetchGeneratedInvoices({ force: true })];
      if (refreshStaff || activeTab === "staff") {
        tasks.push(refetchStaffToPay({ force: true }));
      }
      await Promise.all(tasks);
    },
    [activeTab, refetchDashboard, refetchGeneratedInvoices, refetchStaffToPay],
  );



  const fetchAgencyFallbackIfNeeded = useCallback(

    async (prefill: PayrollInvoiceDetail["invoicePrefill"]) => {

      if (!needsAgencyFallback(prefill) || !user?.agencyId) {

        return undefined;

      }



      return getAgencyById(user.agencyId).catch(() => undefined);

    },

    [user?.agencyId],

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



  const handleCreateInvoiceClick = useCallback((entry: DuePayrollEntry) => {
    setCreateInvoiceEntry(entry);
  }, []);

  const handleConfirmCreateInvoice = useCallback(
    async (preview: PayrollInvoicePreview, selectedIds: Set<string>) => {
      if (!user?.agencyId) {
        toast({
          title: "Agency not found",
          description: "Sign in again and retry.",
          variant: "destructive",
        });
        return;
      }

      const requestId = openingInvoiceRequestIdRef.current + 1;
      openingInvoiceRequestIdRef.current = requestId;
      setCreatingInvoice(true);
      setOpeningInvoice({ staffName: preview.employeeName });

      try {
        const created = await createPayrollInvoice(
          buildCreatePayloadFromSelection(preview, selectedIds, user.agencyId),
        );

        if (openingInvoiceRequestIdRef.current !== requestId) {
          return;
        }

        setCreateInvoiceEntry(null);

        const agency = await fetchAgencyFallbackIfNeeded(created.invoicePrefill);
        await openInvoiceDetail(created, agency);
        setActiveTab("generated");
        await refreshPayrollWorkspace({ refreshStaff: true });
        toast({
          title: "Payroll invoice created",
          description: `Invoice ${created.invoiceNumber} is ready to review.`,
        });
      } catch (error) {
        if (openingInvoiceRequestIdRef.current !== requestId) {
          return;
        }

        toast({
          title: "Couldn't create payroll invoice",
          description: getCreatePayrollInvoiceErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        if (openingInvoiceRequestIdRef.current === requestId) {
          setCreatingInvoice(false);
          setOpeningInvoice(null);
        }
      }
    },
    [fetchAgencyFallbackIfNeeded, openInvoiceDetail, refreshPayrollWorkspace, toast, user?.agencyId],
  );



  const handleViewInvoice = useCallback(

    async (invoice: PayrollInvoiceListItem) => {

      const requestId = openingInvoiceRequestIdRef.current + 1;

      openingInvoiceRequestIdRef.current = requestId;

      setOpeningInvoice({ staffName: invoice.employeeName ?? "Staff member" });



      try {

        const detail = await getPayrollInvoiceById(invoice.id);



        if (openingInvoiceRequestIdRef.current !== requestId) {

          return;

        }



        const agency = await fetchAgencyFallbackIfNeeded(detail.invoicePrefill);

        await openInvoiceDetail(detail, agency);

      } catch (error) {

        toast({

          title: "Couldn't open payroll invoice",

          description: error instanceof Error ? error.message : "Try again.",

          variant: "destructive",

        });

      } finally {

        if (openingInvoiceRequestIdRef.current === requestId) {

          setOpeningInvoice(null);

        }

      }

    },

    [fetchAgencyFallbackIfNeeded, openInvoiceDetail, toast],

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

    setMarkingPaid(true);

    try {
      await markPaid(markPaidConfirmTarget.id);
      await refreshPayrollWorkspace();

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
      toast({
        title: "Couldn't mark invoice as paid",
        description: getPayrollInvoiceMutationErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setMarkingPaid(false);
    }
  }, [invoiceModal?.invoiceId, markPaid, markPaidConfirmTarget, refreshPayrollWorkspace, toast]);

  const handleConfirmCancelInvoice = useCallback(async () => {

    if (!cancelModalInvoice) {

      return;

    }



    setCancellingInvoice(true);

    try {

      await cancelInvoice(cancelModalInvoice.id);

      await refreshPayrollWorkspace({ refreshStaff: true });

      setCancelModalInvoice(null);

      toast({

        title: "Payroll invoice cancelled",

        description: "Shifts are available to invoice again.",

      });

    } catch (error) {

      toast({

        title: "Couldn't cancel payroll invoice",

        description: getPayrollInvoiceMutationErrorMessage(error),

        variant: "destructive",

      });

    } finally {

      setCancellingInvoice(false);

    }

  }, [cancelInvoice, cancelModalInvoice, refreshPayrollWorkspace, toast]);



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

            entries={staffToPayEntries}

            dueTotal={staffToPayTotal}

            loading={staffToPayLoading}

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


