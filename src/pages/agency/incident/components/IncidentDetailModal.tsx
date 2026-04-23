import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import VoiceInputButton from "@/components/VoiceInputButton";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import { 
  IncidentReport, 
  resolveIncident, 
  markIncidentNotResolved,
  IncidentStatus 
} from "@/lib/api/incidents";
import { Client } from "@/lib/api/clients";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";

interface IncidentDetailModalProps {
  incident: IncidentReport;
  onClose: () => void;
  onStatusUpdate: (incidentId: string, status: "resolved" | "not-resolved" | "cancelled") => void;
}

export default function IncidentDetailModal({ incident, onClose, onStatusUpdate }: IncidentDetailModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showNotResolvedForm, setShowNotResolvedForm] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [notResolvedReason, setNotResolvedReason] = useState("");
  const { toast } = useToast();

  const handleResolve = async () => {
    if (!user?.id || !user?.agencyId) {
      toast({
        title: "Error",
        description: "User or Agency not authenticated",
        variant: "destructive",
      });
      return;
    }

    if (!resolveNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide reviewer notes before resolving",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await resolveIncident(incident.id, {
        reviewerId: user.id,
        reviewerNotes: resolveNotes.trim(),
      });
      toast({
        title: "Success",
        description: "Incident has been resolved",
      });
      onStatusUpdate(incident.id, "resolved");
      onClose();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to resolve incident";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotResolved = async () => {
    if (!user?.id || !user?.agencyId) {
      toast({
        title: "Error",
        description: "User or Agency not authenticated",
        variant: "destructive",
      });
      return;
    }

    if (!notResolvedReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for marking as not resolved",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await markIncidentNotResolved(incident.id, {
        reviewerId: user.id,
        reason: notResolvedReason.trim(),
      });
      toast({
        title: "Success",
        description: "Incident has been marked as not resolved",
      });
      onStatusUpdate(incident.id, "not-resolved");
      onClose();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update incident";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowResolveForm(false);
    setShowNotResolvedForm(false);
    setResolveNotes("");
    setNotResolvedReason("");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    if (timeString.includes(':') && !timeString.includes('T')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const isPM = hour >= 12;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
    }
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '??';
    const names = fullName.split(' ');
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getClientInitials = (incident: IncidentReport) => {
    if (incident.client) {
      const first = incident.client.firstName?.[0] || '';
      const last = incident.client.lastName?.[0] || '';
      const initials = (first + last).toUpperCase();
      if (initials) return initials;
    }
    if (incident.clientName) {
      const names = incident.clientName.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '??';
  };

  const getClientName = (incident: IncidentReport) => {
    if (incident.client?.firstName || incident.client?.lastName) {
      return `${incident.client.firstName || ''} ${incident.client.lastName || ''}`.trim();
    }
    if (incident.clientName) {
      return incident.clientName;
    }
    return 'N/A';
  };

  const formatWitness = (witness: any) => {
    if (!witness) return 'N/A';
    if (typeof witness === 'string') {
      return witness || 'N/A';
    }
    if (typeof witness === 'object') {
      const parts = [];
      if (witness.name) {
        parts.push(witness.name);
      }
      if (witness.contactInfo) {
        parts.push(`Contact: ${witness.contactInfo}`);
      }
      if (witness.relationship) {
        parts.push(`Relationship: ${witness.relationship}`);
      }
      return parts.length > 0 ? parts.join(' | ') : 'N/A';
    }
    return 'N/A';
  };

  const canTakeAction = incident.status === IncidentStatus.SUBMITTED || incident.status === IncidentStatus.UNDER_REVIEW;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <VoiceRecordingProvider pageTitle="Incident review">
      <div className="relative z-[51] w-full max-w-[90%] sm:max-w-[600px] lg:max-w-[800px] bg-white rounded-[16px] sm:rounded-[20px] lg:rounded-[24px] shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 pb-20">
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a]">
                Incident Details
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2 sm:gap-4">
                <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                  <span className="font-medium">Date:</span> {formatDate(incident.date || incident.incidentDate)}
                </span>
                <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                  <span className="font-medium">Time:</span> {formatTime(incident.time || incident.incidentDate)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-[#6b7280]" />
            </button>
          </div>

          <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:gap-6 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden bg-gradient-to-br from-[#6366f1] to-[#4f46e5] rounded-full sm:w-12 sm:h-12">
                <span className="text-[14px] sm:text-[16px] font-semibold text-white">
                  {getInitials(incident.employee?.fullName)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] sm:text-[15px] lg:text-[16px] font-semibold text-[#10141a] truncate">
                  {incident.employee?.fullName || incident.employee?.firstName || 'N/A'}
                </div>
                <div className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                  DSP
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden bg-gradient-to-br from-[#00b8d4] to-[#0097b2] rounded-full sm:w-12 sm:h-12">
                <span className="text-[14px] sm:text-[16px] font-semibold text-white">
                  {getClientInitials(incident)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] sm:text-[15px] lg:text-[16px] font-semibold text-[#10141a] truncate">
                  {getClientName(incident)}
                </div>
                <div className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                  Client
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
              What Happened
            </label>
            <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed whitespace-pre-wrap">
              {incident.whatHappened || ''}
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
              What Actions Were Taken
            </label>
            <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed whitespace-pre-wrap">
              {incident.whatActionsTaken || incident.actionsTaken || ''}
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
              What Did the Staff Do
            </label>
            <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed whitespace-pre-wrap">
              {incident.whatDidYouDo || incident.staffAction || ''}
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
              Witness
            </label>
            <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed whitespace-pre-wrap">
              {formatWitness(incident.witness)}
            </div>
          </div>

          {showResolveForm && (
            <div className="mb-4 p-4 bg-[#f0fdf4] border border-[#22c55e] rounded-lg">
              <label className="block text-[14px] font-semibold text-[#10141a] mb-2">
                Reviewer Notes <span className="text-[#ef4444]">*</span>
              </label>
              <VoiceEnabledTextarea
                value={resolveNotes}
                onChange={setResolveNotes}
                placeholder="Enter your notes about the resolution..."
                className="min-h-[100px] text-[13px] sm:text-[14px]"
                fieldName="Reviewer notes"
                pageTitle="Incident review"
              />
            </div>
          )}

          {showNotResolvedForm && (
            <div className="mb-4 p-4 bg-[#fef2f2] border border-[#ef4444] rounded-lg">
              <label className="block text-[14px] font-semibold text-[#10141a] mb-2">
                Reason for Not Resolving <span className="text-[#ef4444]">*</span>
              </label>
              <VoiceEnabledTextarea
                value={notResolvedReason}
                onChange={setNotResolvedReason}
                placeholder="Enter the reason why this incident cannot be resolved..."
                className="min-h-[100px] text-[13px] sm:text-[14px]"
                fieldName="Reason for not resolving"
                pageTitle="Incident review"
              />
            </div>
          )}

          {canTakeAction && <VoiceInputButton className="z-[60]" />}

          {canTakeAction && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 h-10 sm:h-11 bg-[#e5e7eb] hover:bg-[#d1d5db] text-[#6b7280] rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none disabled:opacity-50"
              >
                Cancel
              </Button>
              
              {showResolveForm ? (
                <Button
                  onClick={handleResolve}
                  disabled={loading || !resolveNotes.trim()}
                  className="flex-1 h-10 sm:h-11 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm Resolve"}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setShowResolveForm(true);
                    setShowNotResolvedForm(false);
                  }}
                  disabled={loading}
                  className="flex-1 h-10 sm:h-11 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none disabled:opacity-50"
                >
                  Mark as Resolved
                </Button>
              )}

              {showNotResolvedForm ? (
                <Button
                  onClick={handleNotResolved}
                  disabled={loading || !notResolvedReason.trim()}
                  className="flex-1 h-10 sm:h-11 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm Not Resolved"}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setShowNotResolvedForm(true);
                    setShowResolveForm(false);
                  }}
                  disabled={loading}
                  className="flex-1 h-10 sm:h-11 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none disabled:opacity-50"
                >
                  Mark as Not Resolved
                </Button>
              )}
            </div>
          )}

          {!canTakeAction && (
            <div className="flex justify-end">
              <Button
                onClick={onClose}
                className="px-8 h-10 sm:h-11 bg-[#00b8d4] hover:bg-[#00a5c0] text-white rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
      </VoiceRecordingProvider>
    </div>
  );
}
