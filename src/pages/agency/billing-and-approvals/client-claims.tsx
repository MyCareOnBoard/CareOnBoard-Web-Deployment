import React, {useState, useRef} from "react";
import {useParams, useNavigate} from "react-router";
import {ArrowLeft, Loader2, Download} from "lucide-react";
import {useAuth} from "@/utils/auth";
import {useGetClientClaimsQuery} from "./api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function ClientClaimsPage() {
  const {clientId} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  const {data, isLoading, error} = useGetClientClaimsQuery(
    {
      clientId: clientId || "",
      agencyId: user?.agencyId || "",
      serviceCode: undefined,
    },
    {
      skip: !clientId || !user?.agencyId,
    }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

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
            Failed to load client claims
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

  const {client, serviceLogsGrouped, billingSummary} = data.data;

  const handlePrint = async () => {
    if (!printContentRef.current) return;

    setIsGeneratingPDF(true);
    
    try {
      // Convert HTML to canvas (handles oklch colors natively)
      const canvas = await html2canvas(printContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowHeight: printContentRef.current.scrollHeight,
      });

      // Create PDF from canvas
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
      let position = 0.5; // Top margin

      pdf.addImage(imgData, 'JPEG', 0.5, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 1;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0.5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 1;
      }

      const filename = `Client_Claims_${client.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef4f5] px-8">
      <div className="mx-auto">
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
        </div>

        <div className="rounded-[20px] mb-6">
          <div className="flex items-center justify-between mb-4 no-print">
            <h2 className="text-[18px] font-semibold text-[#10141a]">
              Client Claims
            </h2>
            <button
              onClick={handlePrint}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#00b4b8] text-white rounded-full hover:bg-[#0090a8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[14px]">Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="text-[14px]">Download PDF</span>
                </>
              )}
            </button>
          </div>

          <div ref={printContentRef} className="bg-white p-8 rounded-lg forced-colors:none no-oklch">
            <h2 className="text-[20px] font-semibold text-[#10141a] mb-8 text-center">
              Client Claims
            </h2>

            {/* Client Info Card */}
            <div className="rounded-[12px] p-4 mb-6 flex justify-between items-start">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded border-2 border-gray-300 flex items-center justify-center text-gray-400 text-[32px] font-light flex-shrink-0">
                  {client.fullName.charAt(0)}
                </div>
                <div className="flex flex-col space-y-2">
                  <div>
                    <p className="text-[16px] font-semibold text-[#10141a]">
                      {client.fullName}
                    </p>
                  </div>
                  <div className="flex items-start gap-8">
                    <span className="text-[14px] text-[#808081] min-w-[80px]">DOB</span>
                    <span className="text-[14px] text-[#10141a]">
                      {client.dateOfBirth || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-start gap-8">
                    <span className="text-[14px] text-[#808081] min-w-[80px]">Address</span>
                    <span className="text-[14px] text-[#10141a]">
                      {client.address || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-start gap-8">
                    <span className="text-[14px] text-[#808081] min-w-[80px]">Service Type</span>
                    <span className="text-[14px] text-[#10141a]">
                      {client.service || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[16px] font-semibold text-[#10141a] mb-2">
                  {user?.profile?.name}
                </p>
                <p className="text-[14px] text-[#10141a]">{user?.profile?.address}</p>
                <p className="text-[14px] text-[#10141a]">Provider NPI: 23764234232756</p>
                <p className="text-[14px] text-[#10141a]">Provider Taxonomy: 21/B Baker Street</p>
                <p className="text-[14px] text-[#10141a]">Medicaid Provider Number: 21/B Baker Street</p>
                <p className="text-[14px] text-[#10141a]">Provider Taxonomy: 21/B Baker Street</p>
              </div>
            </div>

            {/* Approved Service Logs */}
            <div className="mb-6">
              <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
                Approved Service Logs
              </h2>

            {serviceLogsGrouped.length > 0 ? (
              <div className="overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-7 gap-4 px-4 py-3">
                  <div className="font-semibold text-[14px] text-[#808081]">DSP</div>
                  <div className="font-semibold text-[14px] text-[#808081]">Service</div>
                  {/*<div className="font-semibold text-[14px] text-[#808081]">Service Code</div>*/}
                  <div className="font-semibold text-[14px] text-[#808081]">Total Hours</div>
                  {/*<div className="font-semibold text-[14px] text-[#808081]">Units</div>*/}
                  <div className="font-semibold text-[14px] text-[#808081]">Rate/Unit</div>
                  <div className="font-semibold text-[14px] text-[#808081]">Total Amount</div>
                </div>

                {/* Table Body */}
                <div>
                  {serviceLogsGrouped.map((group, groupIndex) => (
                    <React.Fragment key={`${group.serviceCode}-${groupIndex}`}>
                      {group.logs.map((log) => {
                        const dailyPayCut = log.billingRate
                          ? Number(String(log.billingRate).replace("$", "").replace("/hour", ""))
                          : 0;
                        const totalAmount = log.hours * dailyPayCut;

                        return (
                          <div
                            key={log.id}
                            className="grid grid-cols-7 gap-4 px-4 py-3 hover:bg-[#f9fafb] transition-colors"
                          >
                            {/* DSP */}
                            <div className="text-[14px] text-[#10141a]">
                              {log.employee?.fullName || "N/A"}
                            </div>

                            {/* Service */}
                            <div className="text-[14px] text-[#10141a]">
                              {log.service || "N/A"}
                            </div>

                            {/* Service Code */}
                            {/*<div className="text-[14px] text-[#10141a]">*/}
                            {/*  {log.serviceCode || "N/A"}*/}
                            {/*</div>*/}

                            {/* Total Hours */}
                            <div className="text-[14px] text-[#10141a]">
                              {log.hours.toFixed(2)}
                            </div>

                            {/* Units */}
                            {/*<div className="text-[14px] text-[#10141a]">*/}
                            {/*  {log.units}*/}
                            {/*</div>*/}

                            {/* Rate per unit */}
                            <div className="text-[14px] text-[#10141a]">
                              {log.billingRate || `${formatCurrency(dailyPayCut)}/hour`}
                            </div>

                            {/* Total Amount */}
                            <div className="text-[14px] text-[#10141a]">
                              {formatCurrency(totalAmount)}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-[#808081]">No service logs available</p>
            )}
            </div>

            {/* Billing Summary */}
            <div className="mb-6">
              <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
                Billing Summary
              </h2>

            <div className={"flex flex-col mb-4"}>
              <div className="space-y-3 w-sm bg-white rounded p-4">
                <div className="flex justify-between items-center py-2">
                  <p className="text-[14px] text-[#808081]">Total hours worked</p>
                  <p className="text-[14px] font-medium text-[#10141a]">
                    {billingSummary.totalHoursWorked}
                  </p>
                </div>
                <div className="flex justify-between items-center py-2">
                  <p className="text-[14px] text-[#808081]">Rate Per Unit</p>
                  <p className="text-[14px] font-medium text-[#10141a]">
                    {formatCurrency(Number(String(billingSummary.ratePerUnit).replace("$", "").replace("/hour", "")))}
                  </p>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-[#e5e5e6] pt-3">
                  <p className="text-[14px] text-[#808081]">Total Amount</p>
                  <p className="text-[14px] text-[#808081]">{formatCurrency(billingSummary.totalAmount)}</p>
                </div>
              </div>
              <div className={"w-full"}>
                <p className="flex justify-between items-center py-2 bg-[#00b4b8] rounded p-2 font-semibold">
                  <span className={"text-white"}>Total Amount</span>
                  <span className="text-white">{formatCurrency(billingSummary.totalAmount)}</span>
                </p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}