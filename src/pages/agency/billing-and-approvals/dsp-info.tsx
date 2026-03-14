import React, {useRef, useState} from "react";
import {useParams, useNavigate} from "react-router";
import {ArrowLeft, Banknote, CornerDownLeft, Loader2, Download, Eye} from "lucide-react";
import {useAuth} from "@/utils/auth";
import {useGetDspClaimsQuery, useApproveExpenseMutation, useRejectExpenseMutation, ClientServiceDefinition} from "./api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {useToast} from "@/hooks/use-toast";

export default function DSPClaimsPage() {
  const {dsp} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();
  const {toast} = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  const {data, isLoading, error} = useGetDspClaimsQuery(
    {
      dspId: dsp || "",
      agencyId: user?.agencyId || "",
    },
    {
      skip: !dsp || !user?.agencyId,
    }
  );

  const [approveExpense, {isLoading: isApproving}] = useApproveExpenseMutation();
  const [rejectExpense, {isLoading: isRejecting}] = useRejectExpenseMutation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const {dsp: dspInfo, clientServicesGrouped, billingSummary, pendingExpenses} = data?.data || {};

  const handleApproveExpense = async (expenseId: string) => {
    try {
      await approveExpense({
        expenseId,
        agencyId: user?.agencyId || "",
      }).unwrap();
      
      toast({
        title: "Success",
        description: "Expense approved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.message || "Failed to approve expense",
        variant: "destructive",
      });
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    try {
      await rejectExpense({
        expenseId,
        agencyId: user?.agencyId || "",
      }).unwrap();
      
      toast({
        title: "Success",
        description: "Expense rejected successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.message || "Failed to reject expense",
        variant: "destructive",
      });
    }
  };

  // Aggregate unique clients across all services, using per-service rate and payType
  const uniqueClients = React.useMemo(() => {
    type Agg = {
      client: { id: string; fullName: string; services?: ClientServiceDefinition[] } | null;
      totalHours: number;
      totalUnits: number;
      amount: number;
      serviceCode: string;
      rate: number;
      payType: string;
    };

    const map = new Map<string, Agg>();

    clientServicesGrouped?.forEach((group) => {
      group.services.forEach((svc) => {
        const clientId = svc.client?.id || 'unknown';
        const key = `${clientId}-${svc.serviceCode}`;

        const matchedService = (svc.client?.services || []).find(
          (s: ClientServiceDefinition) => s.code === String(svc.serviceCode)
        );
        const rate = matchedService ? parseFloat(matchedService.rate) || 0 : 0;
        const payType = matchedService?.payType || "hourly";
        const hours = svc.hours || 0;
        const units = svc.units || 0;

        let svcAmount = 0;
        if (payType === "15-min") svcAmount = (hours * 60 / 15) * rate;
        else if (payType === "daily") svcAmount = units * rate;
        else svcAmount = hours * rate;

        const existing = map.get(key);
        if (existing) {
          existing.totalHours += hours;
          existing.totalUnits += units;
          existing.amount += svcAmount;
        } else {
          map.set(key, {
            client: svc.client || null,
            serviceCode: svc.serviceCode || "",
            totalHours: hours,
            totalUnits: units,
            amount: svcAmount,
            rate,
            payType,
          });
        }
      });
    });

    return Array.from(map.values());
  }, [clientServicesGrouped]);

  const handlePrint = async () => {
    if (!printContentRef.current) return;

    setIsGeneratingPDF(true);

    // Keep reference for cleanup
    let offscreen: HTMLDivElement | null = null;
    try {
      // Clone printable content
      const clonedContent = printContentRef.current.cloneNode(true) as HTMLElement;

      // Create offscreen container to resolve computed styles (ensures rgb/rgba colors)
      offscreen = document.createElement('div');
      offscreen.setAttribute('aria-hidden', 'true');
      offscreen.style.position = 'fixed';
      offscreen.style.left = '-10000px';
      offscreen.style.top = '0';
      offscreen.style.width = '1000px';
      offscreen.style.backgroundColor = '#ffffff';
      offscreen.appendChild(clonedContent);
      document.body.appendChild(offscreen);

      // Remove stylesheets inside the clone
      clonedContent.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => n.parentElement?.removeChild(n));

      // Inline computed styles to avoid unsupported color functions (oklch)
      const inlineResolvedColors = (root: HTMLElement) => {
        const nodes: HTMLElement[] = [root, ...Array.from(root.querySelectorAll('*')) as HTMLElement[]];
        nodes.forEach((el) => {
          const cs = window.getComputedStyle(el);
          if (cs.color) el.style.color = cs.color;
          if (cs.backgroundColor) el.style.backgroundColor = cs.backgroundColor;
          if (cs.borderTopColor) el.style.borderTopColor = cs.borderTopColor;
          if (cs.borderRightColor) el.style.borderRightColor = cs.borderRightColor;
          if (cs.borderBottomColor) el.style.borderBottomColor = cs.borderBottomColor;
          if (cs.borderLeftColor) el.style.borderLeftColor = cs.borderLeftColor;
          if (cs.outlineColor) el.style.outlineColor = cs.outlineColor;
          // SVG
          try {
            const fill = cs.getPropertyValue('fill');
            const stroke = cs.getPropertyValue('stroke');
            if (fill) (el as any).style.fill = fill;
            if (stroke) (el as any).style.stroke = stroke;
          } catch {
          }
          const boxShadow = cs.boxShadow;
          if (boxShadow) el.style.boxShadow = boxShadow;
        });
      };

      inlineResolvedColors(clonedContent);

      // Render to canvas
      const canvas = await html2canvas(clonedContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowHeight: clonedContent.scrollHeight,
      });

      // Build PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 1; // 0.5 inch margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0.5; // top margin

      pdf.addImage(imgData, 'JPEG', 0.5, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 1;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0.5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 1;
      }

      const dspName = dspInfo?.fullName?.replace(/\s+/g, '_') || 'DSP';
      const filename = `DSP_Claims_${dspName}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      // Cleanup on success
      if (offscreen && offscreen.parentElement) {
        document.body.removeChild(offscreen);
        offscreen = null;
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      if (offscreen && offscreen.parentElement) {
        document.body.removeChild(offscreen);
        offscreen = null;
      }
      setIsGeneratingPDF(false);
    }
  };

  const totalAmount = (billingSummary?.totalAmount ?? 0)
    + (billingSummary?.totalExpenses ?? 0)
    + ((billingSummary?.mileageRate || 0) * (billingSummary?.totalMileage || 0) || 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#eef4f5] px-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00b4b8]"/>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-screen bg-[#eef4f5] px-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[18px] font-semibold text-[#10141a] mb-2">
            Failed to load DSP claims
          </p>
          <p className="text-[14px] text-[#808081] mb-4">
            Please try again later
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-[#00b4b8] hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#eef4f5] px-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 no-print">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-[#e5e5e6] flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#10141a]"/>
          </button>
          <h1 className="text-[24px] font-semibold text-[#10141a]">
            Billing & Management
          </h1>
          <div className="ml-auto">
            <button
              onClick={handlePrint}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#00b4b8] text-white rounded-full hover:bg-[#0090a8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span className="text-[14px]">Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4"/>
                  <span className="text-[14px]">Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
        {/* Pending Expenses Section */}
        {pendingExpenses && pendingExpenses.length > 0 && (
          <div className="bg-white rounded-[20px] p-6 mb-6 no-print">
            <h2 className="text-[14px] font-semibold text-[#808081] mb-4">
              Pending DSP Expenses ({pendingExpenses.length})
            </h2>
            <div className="space-y-3">
              {pendingExpenses.map((expense) => (
                <div key={expense.id} className="bg-[#0EAF521A] rounded-lg p-4 flex items-center justify-between">
                  <div className={"flex items-center gap-2 flex-1"}>
                    <div className={"bg-[#B2B2B3] rounded-full py-2 px-3 flex items-center justify-center space-x-1"}>
                      <Banknote className="w-6 h-6 text-white shrink-0"/>
                      <span className={"text-white"}>{formatCurrency(expense.amount || 0)}</span>
                    </div>
                    <p className="text-[13px] text-[#808081] flex-1">
                      {expense.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => window.open(expense.receiptUrl, '_blank')}
                      className="cursor-pointer px-4 py-1.5 text-[11px] rounded-full bg-[#B2B2B3] font-semibold text-white hover:bg-[#9a9a9b] transition-colors flex items-center gap-1"
                    >
                      <Eye size={14}/>
                      View
                    </button>
                    <button
                      onClick={() => handleApproveExpense(expense.id)}
                      disabled={isApproving || isRejecting}
                      className={`px-4 py-1.5 text-[11px] rounded-full bg-[#0EAF52] font-semibold text-white hover:bg-[#0c9644] transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectExpense(expense.id)}
                      disabled={isApproving || isRejecting}
                      className={`px-4 py-1.5 text-[11px] rounded-full bg-[#FF6900] font-semibold text-white hover:bg-[#e55f00] transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <CornerDownLeft size={14}/>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div ref={printContentRef} className="bg-white p-8 rounded-lg forced-colors:none no-oklch">
          <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
            DSP Information
          </h2>


          {/* DSP Info Card */}
          <div className="rounded-xl p-4 flex items-start gap-4 mb-6">
            <div
              className="w-24 h-24 rounded border-2 border-gray-300 flex items-center justify-center text-gray-400 text-[32px] font-light flex-shrink-0">
              {dspInfo?.fullName.charAt(0)}
            </div>
            <div className={"flex flex-col max-w-lg w-full"}>
              <p className="text-lg font-semibold text-[#10141a] mb-1">
                {dspInfo?.fullName}
              </p>
              {/*<p className="flex justify-between items-center">*/}
              {/*  <span className="text-[14px] text-[#808081] mb-1">Payrate</span>*/}
              {/*  <span className="text-[14px] font-medium text-[#808081]">*/}
              {/*    {dspInfo?.payrate || "N/A"}*/}
              {/*  </span>*/}
              {/*</p>*/}
              <p className="flex justify-between items-center">
                <span className="text-[14px] text-[#808081] mb-1">Phone No</span>
                <span className="text-[14px] font-medium text-[#808081]">
                  {dspInfo?.phone || "N/A"}
                </span>
              </p>
              <p className="flex justify-between items-center">
                <span className="text-[14px] text-[#808081] mb-1">Staff Category</span>
                <span className="text-[14px] font-medium text-[#808081]">
                  {"Permanent"}
                </span>
              </p>
            </div>
          </div>

          {/* Unique Clients Summary */}
          <div className="rounded-[20px] px-6 mb-6">
            <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
              Client Services
            </h2>
            {uniqueClients.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-4 text-[12px] text-[#808081] px-4">
                  <span>Client</span>
                  <span>Service Offered</span>
                  <span>Total Hours</span>
                  <span>Billing Rate</span>
                  <span>Amount</span>
                </div>
                {uniqueClients.map((uc, idx) => (
                  <div key={`${uc.client?.id || 'unknown'}-${idx}`}
                       className="grid grid-cols-5 gap-4 items-center py-3 border-b border-[#e5e5e6] last:border-b-0 px-4"
                  >
                    <p className="text-[14px] font-medium text-[#10141a]">
                      {uc.client?.fullName || 'Unknown Client'}
                    </p>
                    <p className="text-[12px] text-[#808081]">{uc.serviceCode}</p>
                    <p className="text-[12px] text-[#808081]">{uc.totalHours}</p>
                    <p className="text-[12px] text-[#808081]">
                      {uc.payType === "15-min"
                        ? `${formatCurrency(uc.rate)}/15-min`
                        : uc.payType === "daily"
                        ? `${formatCurrency(uc.rate)}/day`
                        : `${formatCurrency(uc.rate)}/hr`}
                    </p>
                    <p className="text-[12px] text-[#10141a]">{formatCurrency(uc.amount || 0)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-[#808081]">No client summary available</p>
            )}
          </div>

          {/* Billing Summary */}
          <div className="rounded-[20px] p-6 mb-6">
            <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
              Billing Summary
            </h2>

            <div className={"mb-4"}>
              <div className={"mb-6 flex justify-between items-end gap-4"}>
                <div className="space-y-3 bg-white rounded p-4 w-full">
                  <div className="flex justify-between items-center py-2">
                    <p className="text-[14px] text-[#808081]">Total hours worked</p>
                    <p className="text-[14px] font-medium text-[#10141a]">
                      {billingSummary?.totalHoursWorked}
                    </p>
                  </div>
                  {/*<div className="flex justify-between items-center py-2">*/}
                  {/*  <p className="text-[14px] text-[#808081]">Total Units</p>*/}
                  {/*  <p className="text-[14px] font-medium text-[#10141a]">*/}
                  {/*    {billingSummary?.totalUnits}*/}
                  {/*  </p>*/}
                  {/*</div>*/}
                  {/*<div className="flex justify-between items-center py-2">*/}
                  {/*  <p className="text-[14px] text-[#808081]">Rate Per Unit</p>*/}
                  {/*  <p className="text-[14px] font-medium text-[#10141a]">*/}
                  {/*    {formatCurrency(Number(String("$0/hour").replace("$", "").replace("/hour", "")))}*/}
                  {/*  </p>*/}
                  {/*</div>*/}
                  <div className="flex justify-between items-center py-2">
                    <p className="text-[14px] text-[#808081]">Total Pay</p>
                    <p className="text-[14px] font-medium text-[#10141a]">
                      {formatCurrency(billingSummary?.totalPayRate || 0)}
                    </p>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-[#e5e5e6] pt-3">
                    <p className="text-[14px] text-[#808081]">Total Amount</p>
                    <p className="text-[14px] text-[#808081]">{formatCurrency(billingSummary?.totalAmount || 0)}</p>
                  </div>
                </div>
                <div className="space-y-3 bg-white rounded p-4 w-full">
                  <div className="flex justify-between items-center py-2">
                    <p className="text-[14px] text-[#808081]">Total Mileage</p>
                    <p className="text-[14px] font-medium text-[#10141a]">
                      {billingSummary?.totalMileage}
                    </p>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <p className="text-[14px] text-[#808081]">Rate Per KM</p>
                    <p className="text-[14px] font-medium text-[#10141a]">
                        {billingSummary?.mileageRate ? formatCurrency(billingSummary?.mileageRate) : 0}
                    </p>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-[#e5e5e6] pt-3">
                    <p className="text-[14px] text-[#808081]">Total Amount</p>
                    <p className="text-[14px] text-[#808081]">
                        {formatCurrency((billingSummary?.totalMileage || 0) * (billingSummary?.mileageRate || 0) || 0)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3 bg-white rounded p-4 w-full">
                  <div className="flex justify-between items-center py-2 pt-3">
                    <p className="text-[14px] text-[#808081]">Total Expenses</p>
                    <p className="text-[14px] text-[#808081]">{formatCurrency(billingSummary?.totalExpenses || 0)}</p>
                  </div>
                </div>
              </div>
              <div className={"w-full"}>
                <p className="font-semibold flex justify-between items-center py-2 bg-[#00b4b8] rounded p-2">
                  <span className={"text-white"}>Total Amount</span>
                  <span className="text-white">{formatCurrency(totalAmount || 0)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
