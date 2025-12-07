import React, {useState} from "react";
import {useParams, useNavigate} from "react-router";
import {ArrowLeft, ExternalLink, Loader2} from "lucide-react";
import {useAuth} from "@/utils/auth";
import {useGetClientClaimsQuery} from "./api";
import AgencyEditNote from "@/pages/agency/notes/editNote";

export default function ClientClaimsPage() {
  const {clientId} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const {data, isLoading, error} = useGetClientClaimsQuery(
    {
      clientId: clientId || "",
      agencyId: user?.profile?.id || "",
    },
    {
      skip: !clientId || !user?.profile?.id,
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

  const {client, serviceLogs, billingSummary, dspNotes} = data.data;

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

        {/* Client Claims Section */}
        <div className="rounded-[20px] mb-6">
          <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
            Client Claims
          </h2>

          {/* Client Info Card */}
          <div className="rounded-[12px] p-4 flex items-start gap-4 mb-6">
            <div
              className="w-28 h-28 rounded bg-gradient-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-[24px] font-bold flex-shrink-0">
              {client.fullName.charAt(0)}
            </div>
            <div className={"flex flex-col max-w-lg w-full"}>
              <p className="text-lg font-semibold text-[#10141a] mb-1">
                {client.fullName}
              </p>
              <p className="flex justify-between items-center">
                <span className="text-[14px] text-[#808081] mb-1">DOB</span>
                <span className="text-[14px] font-medium text-[#808081]">
                  {client.dateOfBirth || "N/A"}
                </span>
              </p>
              <p className="flex justify-between items-center">
                <span className="text-[14px] text-[#808081] mb-1">Address</span>
                <span className="text-[14px] font-medium text-[#808081]">
                  {client.address || "N/A"}
                </span>
              </p>
              <p className="flex justify-between items-center">
                <span className="text-[14px] text-[#808081] mb-1">Service Type</span>
                <span className="text-[14px] font-medium text-[#808081]">
                  {client.service || "N/A"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approved Service Logs */}
      <div className="rounded-[20px] px-6 mb-6">
        <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
          Approved Service Logs
        </h2>

        {serviceLogs.length > 0 ? (
          <div className="space-y-3">
            {serviceLogs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-7 gap-4 items-center py-3 border-b border-[#e5e5e6] last:border-b-0"
            >
              {/* DSP Info */}
              <div className="col-span-1 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded bg-gradient-to-br from-[#808081] to-[#6a6a6b] flex items-center justify-center text-white text-[14px] font-bold">
                  {log.employee?.fullName?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#10141a]">
                    {log.employee?.fullName || "Unknown DSP"}
                  </p>
                  <p className="text-[12px] text-[#808081]">DSP</p>
                </div>
              </div>

              {/* Date */}
              <div className="col-span-1">
                <p className="text-[12px] text-[#808081] mb-1">Date</p>
                <p className="text-[14px] font-medium text-[#10141a]">
                  {log.date}
                </p>
              </div>

              {/* Clocked In */}
              <div className="col-span-1">
                <p className="text-[12px] text-[#808081] mb-1">Clocked In</p>
                <p className="text-[14px] font-medium text-[#10141a]">
                  {log.clockedIn}
                </p>
              </div>

              {/* Clocked Out */}
              <div className="col-span-1">
                <p className="text-[12px] text-[#808081] mb-1">Clocked Out</p>
                <p className="text-[14px] font-medium text-[#10141a]">
                  {log.clockedOut}
                </p>
              </div>

              {/* Hours */}
              <div className="col-span-1">
                <p className="text-[12px] text-[#808081] mb-1">Hours</p>
                <p className="text-[14px] font-medium text-[#10141a]">
                  {log.hours}
                </p>
              </div>

              {/* Units */}
              <div className="col-span-1">
                <p className="text-[12px] text-[#808081] mb-1">Units</p>
                <p className="text-[14px] font-medium text-[#10141a]">
                  {log.units}
                </p>
              </div>

              {/* Notes */}
              <div className="col-span-1">
                <p className="text-[12px] text-[#808081] mb-1">Notes</p>
                <p className="text-[14px] font-medium text-[#10141a]">
                  {log.notes}
                </p>
              </div>
            </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-[#808081]">No service logs available</p>
        )}
      </div>

      {/* Billing Summary */}
      <div className="rounded-[20px] p-6 mb-6">
        <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
          Billing Summary
        </h2>

        <div className={"flex justify-between items-end mb-4"}>
          <div className="space-y-3 w-sm bg-white rounded p-4">
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
                {formatCurrency(Number(String(billingSummary.ratePerUnit).replace("$", "").replace("/hour", "")))}
              </p>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[#e5e5e6] pt-3">
              <p className="text-[14px] text-[#808081]">Total Amount</p>
              <p className="text-[14px] text-[#808081]">{formatCurrency(billingSummary.totalAmount)}</p>
            </div>
          </div>
          <div className={"w-xs"}>
            <p className="flex justify-between items-center py-2 bg-[#00b4b8] rounded p-2">
              <span className={"text-white"}>Total Amount</span>
              <span className="text-white">{formatCurrency(billingSummary.totalAmount)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* DSP Notes Attached */}
      <div className="bg-white rounded-[20px] p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[18px] font-semibold text-[#10141a]">
            DSP Notes Attached
          </h2>
          {dspNotes.length > 0 && (
            <span className="text-[12px] text-[#0EAF52] bg-[#0EAF521A] px-3 py-1 rounded-full font-medium">
              {dspNotes.length} Approved {dspNotes.length === 1 ? 'Submission' : 'Submissions'}
            </span>
          )}
        </div>
        
        {dspNotes.length > 0 && (
          <p className="text-[12px] text-[#808081] mb-4">
            These are approved employee activity log submissions associated with this client's service shifts
          </p>
        )}

        {dspNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dspNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  setSelectedSubmissionId(note.id);
                  setIsViewMode(true);
                }}
                className="bg-[#0EAF521A] rounded-[12px] p-4 hover:bg-[#0EAF522A] transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-2">
                  <ExternalLink className="w-5 h-5 text-[#0EAF52] flex-shrink-0 mt-0.5"/>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[#10141a]">{note.employeeName}</p>
                    <p className="text-[12px] text-[#808081] capitalize">
                      {note.activityType.replace(/-/g, ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#0EAF5233]">
                  <span className="text-[11px] text-[#808081]">
                    {note.noteCount} {note.noteCount === 1 ? 'note' : 'notes'}
                  </span>
                  {note.approvedAt && (
                    <span className="text-[11px] text-[#0EAF52]">
                      Approved {new Date(note.approvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[14px] text-[#808081]">No approved DSP activity notes available for this client</p>
            <p className="text-[12px] text-[#b0b0b1] mt-2">Activity notes will appear here once they are approved by the agency</p>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div className="rounded-[20px] p-6">
        <h2 className="text-[18px] font-semibold text-[#10141a] mb-4">
          Signatures
        </h2>

        <div className="space-y-4">
          {/* DSP Signature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-[#808081] mb-2 block">
                DSP Signature
              </label>
              <div className="bg-[#f9fafb] border border-[#e5e5e6] rounded-[12px] h-[40px]"></div>
            </div>
            <div>
              <label className="text-[12px] text-[#808081] mb-2 block">
                Date
              </label>
              <div className="bg-[#f9fafb] border border-[#e5e5e6] rounded-[12px] h-[40px]"></div>
            </div>
          </div>

          {/* Client Signature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-[#808081] mb-2 block">
                Client Signature
              </label>
              <div className="bg-[#f9fafb] border border-[#e5e5e6] rounded-[12px] h-[40px]"></div>
            </div>
            <div>
              <label className="text-[12px] text-[#808081] mb-2 block">
                Date
              </label>
              <div className="bg-[#f9fafb] border border-[#e5e5e6] rounded-[12px] h-[40px]"></div>
            </div>
          </div>

          {/* Admin Approval */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-[#808081] mb-2 block">
                Admin Approval
              </label>
              <div className="bg-[#f9fafb] border border-[#e5e5e6] rounded-[12px] h-[40px]"></div>
            </div>
            <div>
              <label className="text-[12px] text-[#808081] mb-2 block">
                Date
              </label>
              <div className="bg-[#f9fafb] border border-[#e5e5e6] rounded-[12px] h-[40px]"></div>
            </div>
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
