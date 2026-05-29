import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import BillingDashboardHeader from "../components/BillingDashboardHeader";
import BillingOverviewCards from "../components/BillingOverviewCards";
import DuePayrollTable from "./components/DuePayrollTable";
import PayrollSummaryChart from "./components/PayrollSummaryChart";
import TopOvertimeAlerts from "./components/TopOvertimeAlerts";
import PayrollActionLoadingOverlay, {
  getPayrollInvoiceLoadingCopy,
} from "./components/PayrollActionLoadingOverlay";
import type { DuePayrollEntry } from "./data/mockPayrollDashboardData";
import { DEFAULT_DATE_RANGE, OVERVIEW_STATS } from "./data/mockPayrollDashboardData";

const PayrollInvoiceModal = lazy(() => import("./components/PayrollInvoiceModal"));

const MIN_INVOICE_LOAD_MS = 400;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function PayrollDashboardPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [openingInvoice, setOpeningInvoice] = useState<{ staffName: string } | null>(null);
  const [invoiceEntry, setInvoiceEntry] = useState<DuePayrollEntry | null>(null);
  const openingInvoiceRequestIdRef = useRef(0);

  const handleCloseInvoice = useCallback(() => {
    setInvoiceEntry(null);
  }, []);

  const handleGenerateInvoice = useCallback(
    async (entry: DuePayrollEntry) => {
      const requestId = openingInvoiceRequestIdRef.current + 1;
      openingInvoiceRequestIdRef.current = requestId;
      setOpeningInvoice({ staffName: entry.staffName });

      try {
        await Promise.all([
          import("./components/PayrollInvoiceModal"),
          delay(MIN_INVOICE_LOAD_MS),
        ]);

        if (openingInvoiceRequestIdRef.current !== requestId) {
          return;
        }

        setInvoiceEntry(entry);
      } catch (error) {
        if (openingInvoiceRequestIdRef.current !== requestId) {
          return;
        }

        console.error("Failed to open payroll invoice:", error);
        toast({
          title: "Couldn't open payroll invoice. Try again.",
          variant: "destructive",
        });
      } finally {
        if (openingInvoiceRequestIdRef.current === requestId) {
          setOpeningInvoice(null);
        }
      }
    },
    [toast],
  );

  const invoiceLoadingCopy = openingInvoice
    ? getPayrollInvoiceLoadingCopy(openingInvoice.staffName)
    : null;

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <BillingDashboardHeader
        title="Payroll dashboard"
        subtitle="Authorized rate used for payroll calculations."
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateRangeModalDescription="Choose a date range to filter your payroll dashboard"
      />
      <BillingOverviewCards stats={OVERVIEW_STATS} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PayrollSummaryChart />
        <TopOvertimeAlerts />
      </div>

      <DuePayrollTable
        onGenerateInvoice={handleGenerateInvoice}
        actionsDisabled={openingInvoice !== null}
      />

      {invoiceEntry && !openingInvoice && (
        <Suspense fallback={null}>
          <PayrollInvoiceModal
            key={invoiceEntry.id}
            open
            entry={invoiceEntry}
            onClose={handleCloseInvoice}
          />
        </Suspense>
      )}

      {invoiceLoadingCopy && (
        <PayrollActionLoadingOverlay
          title={invoiceLoadingCopy.title}
          description={invoiceLoadingCopy.description}
        />
      )}
    </div>
  );
}
