import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  IncidentReport, 
  resolveIncident, 
  markIncidentNotResolved 
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
  const [resolveNotes, setResolveNotes] = useState("");
  const [notResolvedReason, setNotResolvedReason] = useState("");
  const { toast } = useToast();

  const handleResolve = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
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
      await resolveIncident(incident._id, {
        reviewerId: user.id,
        reviewerNotes: resolveNotes,
      });
      
      toast({
        title: "Success",
        description: "Incident has been resolved",
      });
      
      onStatusUpdate(incident._id, "resolved");
    } catch (error: any) {
      console.error('Error resolving incident:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to resolve incident",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotResolved = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
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
      await markIncidentNotResolved(incident._id, {
        reviewerId: user.id,
        reason: notResolvedReason,
      });
      
      toast({
        title: "Success",
        description: "Incident has been marked as not resolved",
      });
      
      onStatusUpdate(incident._id, "not-resolved");
    } catch (error: any) {
      console.error('Error marking incident as not resolved:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update incident",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '';
    const names = fullName.split(' ');
    return names.map(n => n[0]).join('').toUpperCase();
  };

  const getClientInitials = (client: Client | undefined) => {
    if (!client) return '';
    const first = client.firstName?.[0] || '';
    const last = client.lastName?.[0] || '';
    return (first + last).toUpperCase();
  };

  const getClientName = (client: Client | undefined) => {
    if (!client) return '';
    return `${client.firstName || ''} ${client.lastName || ''}`.trim();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-[90%] sm:max-w-[600px] lg:max-w-[800px] bg-white rounded-[16px] sm:rounded-[20px] lg:rounded-[24px] shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a]">
              Incident
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-[#6b7280]" />
            </button>
          </div>

          {/* Dates - Flex Layout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
            <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Reported {formatDate(incident.createdAt)}</span>
            <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Incident happened {formatDate(incident.incidentDate)}</span>
          </div>

          {/* People Involved */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* DSP */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                <span className="text-[14px] sm:text-[16px] font-semibold text-gray-600">
                  {getInitials(incident.employee?.fullName)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] sm:text-[15px] lg:text-[16px] font-semibold text-[#10141a] truncate">
                  {incident.employee?.fullName}
                </div>
                <div className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                  DSP
                </div>
              </div>
            </div>

            {/* Client */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                <span className="text-[14px] sm:text-[16px] font-semibold text-gray-600">
                  {getClientInitials(incident.client)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] sm:text-[15px] lg:text-[16px] font-semibold text-[#10141a] truncate">
                  {getClientName(incident.client)}
                </div>
                <div className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                  Client
                </div>
              </div>
            </div>
          </div>

          {/* What Happened */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
              What Happened
            </label>
            <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed">
              {incident.whatHappened}
            </div>
          </div>

          {/* What Actions Were Taken */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
              what actions were taken
            </label>
            <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed">
              {incident.actionsTaken}
            </div>
          </div>

          {/* What Action the Staff Do */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
              What action the staff do
            </label>
            <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed">
              {incident.staffAction}
            </div>
          </div>

          {/* Witness */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
              Witness
            </label>
            <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed">
              {incident.witness}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 h-10 sm:h-11 bg-[#e5e7eb] hover:bg-[#d1d5db] text-[#6b7280] rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={loading}
              className="flex-1 h-10 sm:h-11 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none disabled:opacity-50"
            >
              {loading ? "Processing..." : "Resolved"}
            </Button>
            <Button
              onClick={handleNotResolved}
              disabled={loading}
              className="flex-1 h-10 sm:h-11 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none disabled:opacity-50"
            >
              {loading ? "Processing..." : "Not Resolved"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
