import React, { useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { useAuth } from "@/utils/auth";
import { useGetClientClaimsQuery } from "./api";
import {
  formatCurrency,
  getClientRate,
  computeBillingAmount,
  formatRateLabel,
  buildServiceByCodeMap,
} from "./billingUtils";

export default function ClientClaimsPage() {
  const {clientId} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useGetClientClaimsQuery(
    {
      clientId: clientId || "",
      agencyId: user?.agencyId || "",
      serviceCode: undefined,
    },
    {
      skip: !clientId || !user?.agencyId,
    }
  );

  const serviceByCode = useMemo(
    () => buildServiceByCodeMap(data?.data?.client?.services),
    [data?.data?.client?.services]
  );

  const handleGoBack = useCallback(() => navigate(-1), [navigate]);

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
            We couldn't load this client's claims
          </p>
          <p className="text-[14px] text-[#808081] mb-4">
            Please try again later or go back to billing
          </p>
          <button
            onClick={handleGoBack}
            className="text-[#00b4b8] hover:underline"
          >
            Back to billing
          </button>
        </div>
      </div>
    );
  }

  const { client, serviceLogsGrouped, billingSummary } = data.data;

  const handlePrint = useCallback(async () => {
    const el = printContentRef.current;
    if (!el) return;

    setIsGeneratingPDF(true);
    try {
      const [html2canvas, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas.default(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowHeight: el.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "in", format: "letter" });
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 1;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0.5;
      pdf.addImage(imgData, "JPEG", 0.5, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 1;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0.5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 1;
      }

      const filename = `Client_Claims_${client.fullName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [client.fullName]);

  const serviceLogRows = useMemo(() => {
    const rows: { log: (typeof serviceLogsGrouped)[0]["logs"][0]; rateLabel: string; rowAmount: number }[] = [];
    serviceLogsGrouped.forEach((group) => {
      group.logs.forEach((log) => {
        const service = serviceByCode.get(String(log.serviceCode));
        const { rate, payType } = getClientRate(service);
        rows.push({
          log,
          rateLabel: formatRateLabel(rate, payType),
          rowAmount: computeBillingAmount(rate, payType, log.hours, log.units),
        });
      });
    });
    return rows;
  }, [serviceLogsGrouped, serviceByCode]);

  const formattedDob = useMemo(
    () => (client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "—"),
    [client.dateOfBirth]
  );

  const providerAddress = useMemo(() => {
    const addr = user?.profile?.address;
    return typeof addr === "object" ? addr?.address : addr;
  }, [user?.profile?.address]);

  return (
    <div className="min-h-screen bg-[#eef4f5] px-8">
      <div className="mx-auto">
        <div className="flex items-center gap-4 mb-6 no-print">
          <button
            onClick={handleGoBack}
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
                  <span className="text-[14px]">Creating PDF…</span>
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
            <div className="rounded-xl p-4 mb-6 flex justify-between items-start">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded border-2 bg-linear-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-gray-400 text-[32px] font-light shrink-0">
                  {client.fullName.charAt(0)}
                </div>
                <div className="flex flex-col space-y-2">
                  <div>
                    <p className="text-[16px] font-semibold text-[#10141a]">
                      {client.fullName}
                    </p>
                  </div>
                  <div className="flex items-start gap-8">
                    <span className="text-[14px] text-[#808081] min-w-20">Date of birth</span>
                    <span className="text-[14px] text-[#10141a]">{formattedDob}</span>
                  </div>
                  <div className="flex items-start gap-8">
                    <span className="text-[14px] text-[#808081] min-w-20">Address</span>
                    <span className="text-[14px] text-[#10141a]">
                      {client.address || "—"}
                    </span>
                  </div>
                  {/*<div className="flex items-start gap-8">*/}
                  {/*  <span className="text-[14px] text-[#808081] min-w-20">Service Type</span>*/}
                  {/*  <span className="text-[14px] text-[#10141a]">*/}
                  {/*    {client.service || "N/A"}*/}
                  {/*  </span>*/}
                  {/*</div>*/}
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[16px] font-semibold text-[#10141a] mb-2">
                  {user?.profile?.name}
                </p>
                <p className="text-[14px] text-[#10141a]">{providerAddress}</p>
                <p className="text-[14px] text-[#10141a]">NPI: 23764234232756</p>
                <p className="text-[14px] text-[#10141a]">Taxonomy: 21/B Baker Street</p>
                <p className="text-[14px] text-[#10141a]">Medicaid ID: 21/B Baker Street</p>
              </div>
            </div>

            {/* Service Hours */}
            <div className="mb-6">
              <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
                Service hours
              </h2>

            {serviceLogRows.length > 0 ? (
              <div className="overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 px-4 py-3">
                  <div className="font-semibold text-[14px] text-[#808081]">Staff</div>
                  <div className="font-semibold text-[14px] text-[#808081]">Service Code</div>
                  <div className="font-semibold text-[14px] text-[#808081]">Hours</div>
                  <div className="font-semibold text-[14px] text-[#808081]">Rate</div>
                  <div className="font-semibold text-[14px] text-[#808081]">Amount</div>
                </div>

                {/* Table Body */}
                <div>
                  {serviceLogRows.map(({ log, rateLabel, rowAmount }) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-[#f9fafb] transition-colors"
                    >
                      <div className="text-[14px] text-[#10141a]">
                        {log.employee?.fullName || "—"}
                      </div>
                      <div className="text-[14px] text-[#10141a]">
                        {log.serviceCode || "—"}
                      </div>
                      <div className="text-[14px] text-[#10141a]">
                        {log.hours.toFixed(2)}
                      </div>
                      <div className="text-[14px] text-[#10141a]">{rateLabel}</div>
                      <div className="text-[14px] text-[#10141a]">
                        {formatCurrency(rowAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-[#808081]">No service hours recorded for this period</p>
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
                  <p className="text-[14px] text-[#808081]">Hours worked</p>
                  <p className="text-[14px] font-medium text-[#10141a]">
                    {billingSummary.totalHoursWorked}
                  </p>
                </div>
                {billingSummary.ratePerUnit != null && (
                  <div className="flex justify-between items-center py-2">
                    <p className="text-[14px] text-[#808081]">Rate</p>
                    <p className="text-[14px] font-medium text-[#10141a]">
                      {formatRateLabel(
                        billingSummary.ratePerUnit,
                        billingSummary.payType ?? "hourly"
                      )}
                    </p>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-t border-[#e5e5e6] pt-3">
                  <p className="text-[14px] text-[#808081]">Total amount</p>
                  <p className="text-[14px] text-[#808081]">{formatCurrency(billingSummary.totalAmount)}</p>
                </div>
              </div>
              <div className={"w-full"}>
                <p className="flex justify-between items-center py-2 bg-[#00b4b8] rounded p-2 font-semibold">
                  <span className={"text-white"}>Total amount</span>
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