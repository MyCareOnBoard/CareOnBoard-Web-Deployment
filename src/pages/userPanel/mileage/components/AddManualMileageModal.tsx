import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mileageApi } from "@/lib/api/mileage";
import { useToast } from "@/hooks/use-toast";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import VoiceInputButton from "@/components/VoiceInputButton";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import { searchClients, type Client } from "@/lib/api/clients";
import { formatShiftLocation, type ShiftLocation } from "@/lib/api/shifts";
import { useAuth } from "@/utils/auth";
import { programLabel } from "@/lib/roleLabel";

const NOTES_MAX = 1000;

type MileageType = "agency" | "client";

function getClientPrimaryAddress(client: Client): ShiftLocation | null {
  if (client.primaryAddress) {
    return {
      address: client.primaryAddress.address,
      countyState: client.primaryAddress.countyState,
      zipCode: client.primaryAddress.zipCode,
      latlon: client.primaryAddress.location,
    };
  }
  const fallback: ShiftLocation = {
    address: client.address,
    countyState: client.countyState,
    zipCode: client.zipCode,
    latlon: client.location,
  };
  if (fallback.address || fallback.countyState || fallback.zipCode || fallback.latlon) {
    return fallback;
  }
  return null;
}

function getClientDisplayName(client: Client): string {
  return client.firstName && client.lastName
    ? `${client.firstName} ${client.lastName}`
    : client.id;
}

interface AddManualMileageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddManualMileageModal({
  isOpen,
  onClose,
  onCreated,
}: AddManualMileageModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  // Field staff carry one program; scope client search to it (DSP→ddd / Caregiver→hha).
  const clientType = programLabel({ applicantType: user?.applicantType, role: user?.role })
    .toLowerCase() as "ddd" | "hha";

  const [mileageType, setMileageType] = useState<MileageType>("agency");

  // Agency-specific
  const [purpose, setPurpose] = useState("");

  // Client-specific
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);

  // Shared
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (clientSearchTimeoutRef.current) clearTimeout(clientSearchTimeoutRef.current);
    };
  }, []);

  const handleClientSearch = (query: string) => {
    if (clientSearchTimeoutRef.current) clearTimeout(clientSearchTimeoutRef.current);
    setSelectedClientId(null);
    setSelectedClientName(null);
    if (query.trim().length < 2) {
      setClientSearchResults([]);
      setShowClientDropdown(false);
      return;
    }
    clientSearchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingClients(true);
      try {
        const results = await searchClients(query, user?.agencyId, clientType);
        setClientSearchResults(results);
        setShowClientDropdown(results.length > 0);
      } catch {
        setClientSearchResults([]);
        setShowClientDropdown(false);
      } finally {
        setIsSearchingClients(false);
      }
    }, 300);
  };

  const handleClientSelect = (client: Client) => {
    const name = getClientDisplayName(client);
    setClientQuery(name);
    setSelectedClientId(client.id);
    setSelectedClientName(name);
    setShowClientDropdown(false);
    setClientSearchResults([]);
  };

  const handleTypeChange = (type: MileageType) => {
    setMileageType(type);
    setPurpose("");
    setClientQuery("");
    setSelectedClientId(null);
    setSelectedClientName(null);
    setClientSearchResults([]);
    setShowClientDropdown(false);
  };

  const resetForm = () => {
    setMileageType("agency");
    setPurpose("");
    setClientQuery("");
    setSelectedClientId(null);
    setSelectedClientName(null);
    setClientSearchResults([]);
    setShowClientDropdown(false);
    setNotes("");
  };

  const handleSubmit = async () => {
    if (mileageType === "agency" && !purpose.trim()) {
      toast({
        title: "Required",
        description: "Please enter a purpose for this mileage.",
        variant: "destructive",
      });
      return;
    }
    if (mileageType === "client" && !selectedClientId) {
      toast({
        title: "Required",
        description: "Please select a client for this mileage.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload =
        mileageType === "agency"
          ? { purpose: purpose.trim(), notes: notes.trim() || undefined }
          : {
              clientId: selectedClientId!,
              clientName: selectedClientName!,
              notes: notes.trim() || undefined,
            };

      await mileageApi.createManual(payload);
      toast({ title: "Mileage", description: "Manual mileage created — tap Start to begin tracking." });
      resetForm();
      onCreated();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create mileage";
      toast({ title: "Error", variant: "destructive", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isSubmitDisabled =
    isSubmitting ||
    (mileageType === "agency" ? !purpose.trim() : !selectedClientId);

  if (!isOpen) return null;

  return (
    <VoiceRecordingProvider pageTitle="Manual mileage">
      <VoiceInputButton className="z-[60]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-[24px] w-full max-w-[420px] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-4 border-b border-[#f0f0f0]">
            <div>
              <h2 className="text-[18px] font-semibold text-[#10141a]">Track New Mileage</h2>
              <p className="text-[13px] text-[#808081] mt-0.5">Log a trip you need to make</p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="bg-[#eff2f3] rounded-full p-2 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4 text-[#10141a]" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 flex flex-col gap-4">
            {/* Mileage Type toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#10141a]">Mileage Type</label>
              <div className="flex gap-2">
                {(["agency", "client"] as MileageType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`flex-1 h-9 rounded-xl text-[13px] font-medium cursor-pointer transition-colors ${
                      mileageType === type
                        ? "bg-[#00b4b8] text-white"
                        : "border border-[#cccccd] text-[#808081] hover:bg-[#f9fafb]"
                    }`}
                  >
                    {type === "agency" ? "For Agency" : "For Client"}
                  </button>
                ))}
              </div>
            </div>

            {/* Agency — Purpose */}
            {mileageType === "agency" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#10141a]">
                  Purpose <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pick up supplies from store"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 text-[14px] text-[#10141a] placeholder:text-[#b2b2b3] outline-none focus:border-[#00b4b8] transition-colors"
                  autoComplete="off"
                  maxLength={200}
                />
              </div>
            )}

            {/* Client — Searchable dropdown */}
            {mileageType === "client" && (
              <div className="relative flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#10141a]">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center gap-2 focus-within:border-[#00b4b8] transition-colors">
                  <input
                    type="text"
                    placeholder="Search client name..."
                    value={clientQuery}
                    onChange={(e) => {
                      setClientQuery(e.target.value);
                      handleClientSearch(e.target.value);
                    }}
                    onFocus={() => {
                      if (clientSearchResults.length > 0) setShowClientDropdown(true);
                    }}
                    className="flex-1 text-[14px] text-[#10141a] placeholder:text-[#b2b2b3] outline-none bg-transparent"
                    autoComplete="off"
                  />
                  {isSearchingClients && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#808081] shrink-0" />
                  )}
                </div>
                {showClientDropdown && clientSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
                    {clientSearchResults.map((client) => {
                      const addr = formatShiftLocation(getClientPrimaryAddress(client));
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleClientSelect(client)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                        >
                          <p className="text-[14px] font-normal text-[#10141a]">
                            {getClientDisplayName(client)}
                          </p>
                          {addr && (
                            <p className="text-[12px] text-[#808081]">{addr}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notes — shared, optional */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#10141a]">Notes (optional)</label>
              <VoiceEnabledTextarea
                placeholder="Any additional details..."
                value={notes}
                onChange={(v) => setNotes(v.slice(0, NOTES_MAX))}
                onVoiceAccepted={(t) =>
                  setNotes((prev) => {
                    const next = prev.trim() ? `${prev.trim()} ${t.trim()}` : t.trim();
                    return next.slice(0, NOTES_MAX);
                  })
                }
                rows={3}
                fieldName="Manual mileage notes"
                pageTitle="Manual mileage"
                disabled={isSubmitting}
                className="min-h-[5.25rem] resize-none rounded-xl border border-[#cccccd] bg-white px-4 py-3 text-[14px] text-[#10141a] shadow-none placeholder:text-[#b2b2b3] focus-visible:border-[#00b4b8]"
              />
            </div>

            <p className="text-[12px] text-[#808081]">
              GPS tracking starts when you tap <strong>Start</strong> on the created entry.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 pb-5">
            <Button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 h-11 bg-transparent hover:bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb] rounded-xl text-[14px] font-medium shadow-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="flex-1 h-11 bg-[#00b4b8] hover:bg-[#009ba1] text-white rounded-xl text-[14px] font-medium shadow-none disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </VoiceRecordingProvider>
  );
}
