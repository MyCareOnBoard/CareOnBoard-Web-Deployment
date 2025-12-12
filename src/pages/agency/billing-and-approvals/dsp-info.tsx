import React, {useState} from "react";
import {useParams, useNavigate} from "react-router";
import {ArrowLeft, Banknote, CornerDownLeft, Loader2} from "lucide-react";
import {useAuth} from "@/utils/auth";
import {useGetDspClaimsQuery} from "./api";
import AgencyEditNote from "@/pages/agency/notes/editNote";

export default function DSPClaimsPage() {
  const {dsp} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const {data, isLoading, error} = useGetDspClaimsQuery(
    {
      dspId: dsp || "",
      agencyId: user?.agencyId || "",
    },
    {
      skip: !dsp || !user?.agencyId,
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

  const {dsp: dspInfo, clientServicesGrouped, billingSummary} = data.data;

  return (
    <div className="min-h-screen bg-[#eef4f5] px-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
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

        <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
          DSP Information
        </h2>


        {/* DSP Info Card */}
        <div className="rounded-xl p-4 flex items-start gap-4 mb-6">
          <div
            className="w-28 h-28 rounded bg-gradient-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-[24px] font-bold shrink-0">
            {dspInfo.fullName.charAt(0)}
          </div>
          <div className={"flex flex-col max-w-lg w-full"}>
            <p className="text-lg font-semibold text-[#10141a] mb-1">
              {dspInfo.fullName}
            </p>
            <p className="flex justify-between items-center">
              <span className="text-[14px] text-[#808081] mb-1">Payrate</span>
              <span className="text-[14px] font-medium text-[#808081]">
                  {dspInfo?.payrate || "N/A"}
                </span>
            </p>
            <p className="flex justify-between items-center">
              <span className="text-[14px] text-[#808081] mb-1">Phone No</span>
              <span className="text-[14px] font-medium text-[#808081]">
                  {dspInfo.phone || "N/A"}
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
      </div>

      {/* Client Services */}
      <div className="rounded-[20px] px-6 mb-6">
        <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
          Client Services
        </h2>

        {clientServicesGrouped.length > 0 ? (
          <div className="space-y-6">
            {clientServicesGrouped.map((group, groupIndex) => (
              <div key={`${group.client?.id}-${group.serviceCode}-${groupIndex}`} className="space-y-3">
                <div className="bg-[#f9fafb] px-4 py-2 rounded-lg">
                  <p className="text-[14px] font-semibold text-[#10141a]">
                    {group.client?.fullName || "Unknown Client"} | Service: {group.service} ({group.serviceCode})
                  </p>
                </div>
                
                {group.services.map((service) => (
                  <div
                    key={service.id}
                    className="grid grid-cols-7 gap-4 items-center py-3 border-b border-[#e5e5e6] last:border-b-0 ml-4"
                  >
                    {/* Date */}
                    <div className="col-span-1">
                      <p className="text-[12px] text-[#808081] mb-1">Date</p>
                      <p className="text-[14px] font-medium text-[#10141a]">
                        {service.date}
                      </p>
                    </div>

                    {/* Clocked In */}
                    <div className="col-span-1">
                      <p className="text-[12px] text-[#808081] mb-1">Clocked In</p>
                      <p className="text-[14px] font-medium text-[#10141a]">
                        {service.clockedIn}
                      </p>
                    </div>

                    {/* Clocked Out */}
                    <div className="col-span-1">
                      <p className="text-[12px] text-[#808081] mb-1">Clocked Out</p>
                      <p className="text-[14px] font-medium text-[#10141a]">
                        {service.clockedOut}
                      </p>
                    </div>

                    {/* Hours */}
                    <div className="col-span-1">
                      <p className="text-[12px] text-[#808081] mb-1">Hours</p>
                      <p className="text-[14px] font-medium text-[#10141a]">
                        {service.hours}
                      </p>
                    </div>

                    {/* Units */}
                    <div className="col-span-1">
                      <p className="text-[12px] text-[#808081] mb-1">Units</p>
                      <p className="text-[14px] font-medium text-[#10141a]">
                        {service.units}
                      </p>
                    </div>

                    {/* Pay Period */}
                    <div className="col-span-1">
                      <p className="text-[12px] text-[#808081] mb-1">Pay Period</p>
                      <p className="text-[14px] font-medium text-[#10141a]">
                        {service.shiftPeriod || "N/A"}
                      </p>
                    </div>

                    {/* Notes */}
                    <div className="col-span-1">
                      <p className="text-[12px] text-[#808081] mb-1">Notes</p>
                      <p className="text-[14px] font-medium text-[#10141a]">
                        {service.notes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-[#808081]">No client services available</p>
        )}
      </div>

      {/* Billing Summary */}
      <div className="rounded-[20px] p-6 mb-6">
        <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
          Billing Summary
        </h2>

        <div className={"flex justify-between items-end mb-4 gap-4"}>
          <div className="space-y-3 bg-white rounded p-4 w-full">
            <div className="flex justify-between items-center py-2">
              <p className="text-[14px] text-[#808081]">Total hours worked</p>
              <p className="text-[14px] font-medium text-[#10141a]">
                {billingSummary.totalHoursWorked}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-[14px] text-[#808081]">Total Units</p>
              <p className="text-[14px] font-medium text-[#10141a]">
                {billingSummary.totalUnits}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-[14px] text-[#808081]">Rate Per Unit</p>
              <p className="text-[14px] font-medium text-[#10141a]">
                {formatCurrency(Number(String("$0/hour").replace("$", "").replace("/hour", "")))}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-[14px] text-[#808081]">Pay Rate</p>
              <p className="text-[14px] font-medium text-[#10141a]">
                {formatCurrency(Number(String("$0/hour").replace("$", "").replace("/hour", "")))}
              </p>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[#e5e5e6] pt-3">
              <p className="text-[14px] text-[#808081]">Total Amount</p>
              <p className="text-[14px] text-[#808081]">{formatCurrency(billingSummary.totalAmount)}</p>
            </div>
          </div>
          <div className="space-y-3 bg-white rounded p-4 w-full">
            <div className="flex justify-between items-center py-2">
              <p className="text-[14px] text-[#808081]">Total Mileage</p>
              <p className="text-[14px] font-medium text-[#10141a]">
                {billingSummary.totalHoursWorked}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-[14px] text-[#808081]">Rate Per KM</p>
              <p className="text-[14px] font-medium text-[#10141a]">
                {billingSummary.totalUnits}
              </p>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[#e5e5e6] pt-3">
              <p className="text-[14px] text-[#808081]">Total Amount</p>
              <p className="text-[14px] text-[#808081]">{formatCurrency(billingSummary.totalAmount)}</p>
            </div>
          </div>
          <div className="space-y-3 bg-white rounded p-4 w-full">
            <div className="flex justify-between items-center py-2 pt-3">
              <p className="text-[14px] text-[#808081]">Total Expenses</p>
              <p className="text-[14px] text-[#808081]">{formatCurrency(billingSummary.totalAmount)}</p>
            </div>
          </div>
          <div className={"w-full"}>
            <p className="flex justify-between items-center py-2 bg-[#00b4b8] rounded p-2">
              <span className={"text-white"}>Total Amount</span>
              <span className="text-white">{formatCurrency(billingSummary.totalAmount)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* DSP Expenses */}
      <div className="bg-white rounded-[20px] p-6 mb-6">
        <h2 className="text-[14px] font-semibold text-[#808081] mb-4">
          DSP Expenses
        </h2>
        <div className="bg-[#0EAF521A] rounded-lg p-4 flex items-center justify-between">
          <div className={"flex items-center gap-2"}>
            <div className={"bg-[#B2B2B3] rounded-full py-2 px-3 flex items-center justify-center space-x-1"}>
              <Banknote className="w-6 h-6 text-white shrink-0"/>
              <span className={"text-white"}>$35</span>
            </div>
            <p className="text-[13px] text-[#808081]">
              Client practice daily living skills including cooking and cleaning
            </p>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              className="cursor-pointer px-4 py-1.5 text-[11px] rounded-full bg-[#B2B2B3] font-semibold text-white hover:bg-[#9a9a9b] transition-colors flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              View
            </button>
            <button
              className={`px-4 py-1.5 text-[11px] rounded-full bg-[#0EAF52] font-semibold text-white hover:bg-[#0c9644] transition-colors flex items-center gap-1`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Approve
            </button>
            <button
              className={`px-4 py-1.5 text-[11px] rounded-full bg-[#FF6900] font-semibold text-white hover:bg-[#e55f00] transition-colors flex items-center gap-1`}>
              <CornerDownLeft size={14}/>
              Return
            </button>
          </div>
        </div>
      </div>
      {/* Modal for viewing DSP notes */}
      <AgencyEditNote
        isOpen={isViewMode}
        setIsOpen={setIsViewMode}
        submissionId={selectedSubmissionId}
        reRoute={false}
      />
    </div>
  );
}
