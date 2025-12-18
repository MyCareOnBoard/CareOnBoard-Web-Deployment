import React, { useState } from "react";
import { CalendarDays, Mail, MapPin, Phone, User, AlertCircle, Loader2, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Client, updateClient, deleteClient } from "@/lib/api/clients";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";

function DetailRow({
  icon,
  label,
  value,
  valueClassName,
  alignTop = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  alignTop?: boolean;
}) {
  return (
    <div className="bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] flex gap-[12px] items-center pl-[8px] pr-[16px] py-[8px] rounded-[20px] w-full">
      <div className="backdrop-blur-sm border border-[#808081] rounded-[200px] p-[10px] shrink-0 flex items-center justify-center">
        <div className="w-[16px] h-[16px] flex items-center justify-center text-[#808081]">
          {icon}
        </div>
      </div>

      <div
        className={[
          "flex flex-1 items-center justify-between min-w-0",
          alignTop ? "items-start" : "items-center",
        ].join(" ")}
      >
        <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
          {label}
        </p>
        <div
          className={[
            "text-[16px] font-semibold leading-[1.6] text-[#10141a] text-right",
            valueClassName ?? "",
          ].join(" ")}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function ProfileTab({
  client,
  formatDate,
  clientId,
  onClientUpdated,
}: {
  client: Client;
  formatDate: (dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date) => string;
  clientId: string;
  onClientUpdated?: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Format gender display
  const formatGender = (gender?: string): string => {
    if (!gender) return "Not specified";
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace(/-/g, " ");
  };

  // Format address
  const formatAddress = (): string => {
    // Try primaryAddress first (new structure)
    if (client.primaryAddress) {
      const parts = [
        client.primaryAddress.address,
        client.primaryAddress.countyState,
        client.primaryAddress.zipCode,
      ].filter(Boolean);
      if (parts.length > 0) {
        const primary = parts.join(", ");
        // If secondary address exists, append it
        if (client.secondaryAddress) {
          const secondaryParts = [
            client.secondaryAddress.address,
            client.secondaryAddress.countyState,
            client.secondaryAddress.zipCode,
          ].filter(Boolean);
          if (secondaryParts.length > 0) {
            return `${primary} (Primary); ${secondaryParts.join(", ")} (Secondary)`;
          }
        }
        return primary;
      }
    }

    // Fallback to legacy flat fields for backward compatibility
    const parts = [
      client.address,
      client.city,
      client.state,
      client.zipCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Address not provided";
  };

  const handleDeactivate = async () => {
    if (!clientId) return;

    try {
      setIsDeactivating(true);
      await updateClient(clientId, { status: "inactive" });
      
      toast({
        title: "Client deactivated",
        description: "The client has been successfully deactivated.",
      });

      setShowConfirmModal(false);
      
      if (onClientUpdated) {
        onClientUpdated();
      }
    } catch (error: any) {
      console.error("Failed to deactivate client:", error);
      toast({
        title: "Failed to deactivate client",
        description: error.message || "An error occurred while deactivating the client.",
        variant: "destructive",
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleActivate = async () => {
    if (!clientId) return;

    try {
      setIsActivating(true);
      await updateClient(clientId, { status: "active" });
      
      toast({
        title: "Client activated",
        description: "The client has been successfully activated.",
      });
      
      if (onClientUpdated) {
        onClientUpdated();
      }
    } catch (error: any) {
      console.error("Failed to activate client:", error);
      toast({
        title: "Failed to activate client",
        description: error.message || "An error occurred while activating the client.",
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleDelete = async () => {
    if (!clientId || !user?.agencyId) return;

    try {
      setIsDeleting(true);
      await deleteClient(clientId, user.agencyId);
      
      toast({
        title: "Client deleted",
        description: "The client has been successfully deleted.",
      });

      setShowDeleteModal(false);
      
      // Navigate to clients list
      navigate(Routes.agency.clients);
    } catch (error: any) {
      console.error("Failed to delete client:", error);
      toast({
        title: "Failed to delete client",
        description: error.message || "An error occurred while deleting the client.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isInactive = client.status === "inactive" || client.status === "archived";

  return (
    <>
      <div className="mt-4 backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-[8px] flex flex-col gap-[12px]">
        <DetailRow
          icon={<User className="w-4 h-4" />}
          label="Gender"
          value={formatGender(client.gender)}
        />
        <DetailRow
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          value={client.email || "Email not provided"}
          valueClassName={!client.email ? "text-[#b2b2b3]" : ""}
        />
        <DetailRow
          icon={<Phone className="w-4 h-4" />}
          label="Phone number"
          value={client.phone || "Phone not provided"}
          valueClassName={!client.phone ? "text-[#b2b2b3]" : ""}
        />
        <DetailRow
          icon={<MapPin className="w-4 h-4" />}
          label="Address"
          value={formatAddress()}
        />
        <DetailRow
          icon={<CalendarDays className="w-4 h-4" />}
          label="Joining Date"
          value={formatDate(client.createdAt)}
        />
        <div className="bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] flex gap-[12px] items-start pl-[8px] pr-[16px] py-[8px] rounded-[20px] w-full">
          <div className="backdrop-blur-sm border border-[#808081] rounded-[200px] p-[10px] shrink-0 flex items-center justify-center">
            <div className="w-[16px] h-[16px] flex items-center justify-center text-[#808081]">
              <User fill="#808081" className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-[8px] min-w-0">
            <div>
              <p className="text-[14px] font-medium leading-[1.6] text-[#808081]">
                Professional Summary
              </p>
              <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
                {' '}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-[8px]">
        {/* Activate button - only show if inactive */}
        {isInactive && (
          <Button
            className="h-[36px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium bg-[#00b4b8] hover:bg-[#00a0a4] text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleActivate}
            disabled={isActivating}
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Activate Client
              </>
            )}
          </Button>
        )}

        {/* Deactivate button - only show if active */}
        {!isInactive && (
          <Button
            variant="destructive"
            className="h-[36px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium bg-[#d53411] hover:bg-[#c02e0f] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowConfirmModal(true)}
            disabled={isDeactivating}
          >
            {isDeactivating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Deactivating...
              </span>
            ) : (
              "Deactivate Client"
            )}
          </Button>
        )}

        {/* Delete button - always visible */}
        <Button
          variant="destructive"
          className="h-[36px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete Client
            </>
          )}
        </Button>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-[20px] bg-white shadow-lg p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-[18px] font-semibold text-[#10141a]">
              Deactivate Client
            </p>
            <p className="text-[14px] text-[#4b4b4c]">
              Are you sure you want to deactivate this client? This action will mark the client as inactive and may affect their access to services.
            </p>
            <div className="mt-2 flex justify-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[60px] px-5 border-[#b2b2b3] text-[#10141a] bg-white hover:bg-gray-50"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeactivating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-[60px] px-5 bg-[#d53411] text-white hover:bg-[#c02e0f] flex items-center gap-2"
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating && <Loader2 className="w-4 h-4 animate-spin" />}
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-[20px] bg-white shadow-lg p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-[18px] font-semibold text-[#10141a]">
              Delete Client
            </p>
            <p className="text-[14px] text-[#4b4b4c]">
              Are you sure you want to delete this client? This action cannot be undone and will permanently remove all client data from the system.
            </p>
            <div className="mt-2 flex justify-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[60px] px-5 border-[#b2b2b3] text-[#10141a] bg-white hover:bg-gray-50"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-[60px] px-5 bg-[#d53411] text-white hover:bg-[#c02e0f] flex items-center gap-2"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


