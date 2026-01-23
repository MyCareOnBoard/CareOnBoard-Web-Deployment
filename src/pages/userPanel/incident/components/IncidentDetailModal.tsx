import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncidentReport, IncidentStatus } from "@/lib/api/incidents";
import { Client } from "@/lib/api/clients";

interface IncidentDetailModalProps {
  incident: IncidentReport;
  onClose: () => void;
  onStatusUpdate: (incidentId: string, status: "cancelled") => void;
}

export default function IncidentDetailModal({ incident, onClose, onStatusUpdate }: IncidentDetailModalProps) {
  const handleCancel = () => {
    onStatusUpdate(incident._id, "cancelled");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true 
    });
  };

  const getInitials = (fullName?: string) => {
    if (!fullName) return "??";
    const names = fullName.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getClientInitials = (clientId: any) => {
    if (!clientId || typeof clientId === 'string') return "??";
    const client = clientId as Client;
    const firstInitial = client.firstName?.[0] || "?";
    const lastInitial = client.lastName?.[0] || "?";
    return (firstInitial + lastInitial).toUpperCase();
  };

  const getClientName = (clientId: any) => {
    if (!clientId || typeof clientId === 'string') return "Unknown Client";
    const client = clientId as Client;
    return `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unknown Client";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-[90%] sm:max-w-[600px] lg:max-w-[800px] w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between">
          <h2 className="text-[16px] sm:text-[18px] lg:text-[20px] font-semibold text-[#1a1a1a]">
            Incident Report Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Status & Dates */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div>
                <p className="text-[11px] sm:text-[12px] text-gray-600 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-medium ${
                  incident.status === IncidentStatus.SUBMITTED
                    ? "bg-blue-100 text-blue-700"
                    : incident.status === IncidentStatus.UNDER_REVIEW
                    ? "bg-yellow-100 text-yellow-700"
                    : incident.status === IncidentStatus.RESOLVED
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {incident.status.replace("_", " ")}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[11px] sm:text-[12px] text-gray-600 mb-1">Reported</p>
                <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-gray-900">
                  {formatDate(incident.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Incident Date */}
          <div>
            <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-2">
              Incident Date & Time
            </p>
            <p className="text-[13px] sm:text-[14px] lg:text-[15px] text-gray-900">
              {formatDate(incident.incidentDate)}
            </p>
          </div>

          {/* Client Information */}
          <div>
            <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-3">Client</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-[16px] font-semibold flex-shrink-0">
                {getClientInitials(incident.clientId)}
              </div>
              <div>
                <p className="text-[14px] sm:text-[15px] font-medium text-[#1a1a1a]">
                  {getClientName(incident.clientId)}
                </p>
                <p className="text-[12px] sm:text-[13px] text-gray-500">Client</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#d1fae5] rounded-lg p-3 sm:p-4">
            <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-2">
              What happened?
            </p>
            <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-gray-900 whitespace-pre-wrap">
              {incident.whatHappened || "No description provided"}
            </p>
          </div>

          {/* Action Taken */}
          {incident.actionsTaken && (
            <div className="bg-[#d1fae5] rounded-lg p-3 sm:p-4">
              <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-2">
                Actions Taken
              </p>
              <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-gray-900 whitespace-pre-wrap">
                {incident.actionsTaken}
              </p>
            </div>
          )}

          {/* Staff Action */}
          {incident.staffAction && (
            <div className="bg-[#d1fae5] rounded-lg p-3 sm:p-4">
              <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-2">
                Staff Action
              </p>
              <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-gray-900 whitespace-pre-wrap">
                {incident.staffAction}
              </p>
            </div>
          )}

          {/* Witness */}
          {incident.witness && (
            <div className="bg-[#d1fae5] rounded-lg p-3 sm:p-4">
              <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-2">
                Witness
              </p>
              <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-gray-900 whitespace-pre-wrap">
                {incident.witness}
              </p>
            </div>
          )}

          {/* Review Information (if reviewed) */}
          {(incident.status === IncidentStatus.RESOLVED || incident.status === IncidentStatus.NOT_RESOLVED) && (
            <>
              {incident.reviewerNotes && (
                <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 border border-yellow-200">
                  <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-2">
                    Reviewer Notes
                  </p>
                  <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-gray-900 whitespace-pre-wrap">
                    {incident.reviewerNotes}
                  </p>
                </div>
              )}

              {incident.reason && incident.status === IncidentStatus.NOT_RESOLVED && (
                <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
                  <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-2">
                    Not Resolved Reason
                  </p>
                  <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-gray-900 whitespace-pre-wrap">
                    {incident.reason}
                  </p>
                </div>
              )}

              {incident.reviewedAt && (
                <div className="text-[12px] sm:text-[13px] text-gray-500">
                  Reviewed on {formatDate(incident.reviewedAt)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex justify-end">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="px-4 sm:px-6 py-2 text-[13px] sm:text-[14px]"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
