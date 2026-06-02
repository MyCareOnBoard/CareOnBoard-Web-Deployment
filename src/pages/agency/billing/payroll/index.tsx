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

import PayrollActionLoadingOverlay, {

  getPayrollInvoiceLoadingCopy,

} from "./components/PayrollActionLoadingOverlay";

import type { DuePayrollEntry } from "@/lib/api/payroll";

import type { PayrollInvoiceDocument } from "./types";

import { usePayrollDashboard } from "./hooks/usePayrollDashboard";

import { usePayrollInvoices } from "./hooks/usePayrollInvoices";

import { getCurrentWeekDateRange } from "./utils/payrollDashboardUtils";

import {

  buildPayrollInvoiceDocument,

  dueEntryToCreatePayload,

  needsAgencyFallback,

} from "./utils/buildPayrollInvoiceDocument";



const PayrollInvoiceModal = lazy(() => import("./components/PayrollInvoiceModal"));



export default function PayrollDashboardPage() {

  const { user } = useAuth();

  const { toast } = useToast();

  const [dateRange, setDateRange] = useState(getCurrentWeekDateRange);

  const [activeTab, setActiveTab] = useState<PayrollWorkspaceTab>("staff");

  const [openingInvoice, setOpeningInvoice] = useState<{ staffName: string } | null>(null);

  const [invoiceModal, setInvoiceModal] = useState<{

    staffName: string;

    invoice: PayrollInvoiceDocument;

    invoiceId?: string;

  } | null>(null);

  const [cancelModalInvoice, setCancelModalInvoice] = useState<PayrollInvoiceListItem | null>(null);

  const [cancellingInvoice, setCancellingInvoice] = useState(false);

  const [markingPaid, setMarkingPaid] = useState(false);

  const openingInvoiceRequestIdRef = useRef(0);

  const lastDashboardErrorRef = useRef<string | null>(null);

  const lastGeneratedErrorRef = useRef<string | null>(null);



  const {

    overviewStats,

    statusChart,

    overtimeAlerts,

    dueEntries,

    dueTotal,

    loading: dashboardLoading,

    isRefetching: dashboardRefetching,

    error: dashboardError,

    refetch: refetchDashboard,

  } = usePayrollDashboard(dateRange, { duePage: 1, dueLimit: 100 });



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



  const refreshAfterCreateOrCancel = useCallback(async () => {

    await Promise.all([refetchDashboard(), refetchGeneratedInvoices({ force: true })]);

  }, [refetchDashboard, refetchGeneratedInvoices]);



  const refreshAfterStatusUpdate = useCallback(async () => {

    await Promise.all([refetchDashboard(), refetchGeneratedInvoices({ force: true })]);

  }, [refetchDashboard, refetchGeneratedInvoices]);



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



  const handleGenerateInvoice = useCallback(

    async (entry: DuePayrollEntry) => {

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

      setOpeningInvoice({ staffName: entry.staffName });



      try {

        const created = await createPayrollInvoice(dueEntryToCreatePayload(entry, user.agencyId));



        if (openingInvoiceRequestIdRef.current !== requestId) {

          return;

        }



        const agency = await fetchAgencyFallbackIfNeeded(created.invoicePrefill);

        await openInvoiceDetail(created, agency);

        setActiveTab("generated");

        await refreshAfterCreateOrCancel();

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

          setOpeningInvoice(null);

        }

      }

    },

    [fetchAgencyFallbackIfNeeded, openInvoiceDetail, refreshAfterCreateOrCancel, toast, user?.agencyId],

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



  const handleMarkPaidFromModal = useCallback(async () => {

    if (!invoiceModal?.invoiceId) {

      return;

    }



    setMarkingPaid(true);

    try {

      await markPaid(invoiceModal.invoiceId);

      await refreshAfterStatusUpdate();

      setInvoiceModal(null);

      toast({

        title: "Invoice marked as paid",

        description: "This records that payroll was sent.",

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

  }, [invoiceModal?.invoiceId, markPaid, refreshAfterStatusUpdate, toast]);



  const handleMarkPaidFromTable = useCallback(

    async (invoice: PayrollInvoiceListItem) => {

      try {

        await markPaid(invoice.id);

        await refreshAfterStatusUpdate();

        toast({

          title: "Invoice marked as paid",

          description: `Payroll for ${invoice.employeeName ?? "staff"} was marked as paid.`,

        });

      } catch (error) {

        toast({

          title: "Couldn't mark invoice as paid",

          description: getPayrollInvoiceMutationErrorMessage(error),

          variant: "destructive",

        });

      }

    },

    [markPaid, refreshAfterStatusUpdate, toast],

  );



  const handleConfirmCancelInvoice = useCallback(async () => {

    if (!cancelModalInvoice) {

      return;

    }



    setCancellingInvoice(true);

    try {

      await cancelInvoice(cancelModalInvoice.id);

      await refreshAfterCreateOrCancel();

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

  }, [cancelInvoice, cancelModalInvoice, refreshAfterCreateOrCancel, toast]);



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

            dueTotal={dueTotal}

            loading={dashboardLoading}

            onGenerateInvoice={handleGenerateInvoice}

            actionsDisabled={openingInvoice !== null || generatedMutating}

          />

        ) : (

          <SavedPayrollTable

            invoices={generatedInvoiceList}

            loading={generatedLoading}

            onViewInvoice={handleViewInvoice}

            onMarkPaid={handleMarkPaidFromTable}

            onCancel={setCancelModalInvoice}

            actionsDisabled={openingInvoice !== null || generatedMutating}

          />

        )}

      </div>



      {invoiceModal && !openingInvoice && (

        <Suspense fallback={null}>

          <PayrollInvoiceModal

            key={invoiceModal.invoiceId ?? invoiceModal.staffName}

            open

            staffName={invoiceModal.staffName}

            invoice={invoiceModal.invoice}

            onClose={() => setInvoiceModal(null)}

            onMarkPaid={

              invoiceModal.invoice.status === "pending" ? handleMarkPaidFromModal : undefined

            }

            markingPaid={markingPaid}

          />

        </Suspense>

      )}



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


