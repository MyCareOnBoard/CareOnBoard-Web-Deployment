import React, { memo, useCallback, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Client, updateClient, deleteClient } from "@/lib/api/clients";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { cn } from "@/lib/utils";
import { ProfileSectionCard } from "@/pages/shared/client-details/components/ProfileSectionCard";
import { buildProfileSections, type ProfileSection } from "./profileTabViewModel";

const profileActionBtn =
  "h-9 min-h-9 rounded-lg px-3.5 text-[13px] font-medium shadow-none transition-colors focus-visible:ring-offset-0";

const profileModalBtn =
  "h-9 min-h-9 rounded-lg px-4 text-[13px] font-medium shadow-none focus-visible:ring-offset-0";

const ProfileTabSections = memo(function ProfileTabSections({
  sections,
}: {
  sections: ProfileSection[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      {sections.map((section) => (
        <ProfileSectionCard key={section.id} section={section} />
      ))}
    </div>
  );
});

type ProfileTabToolbarProps = {
  isInactive: boolean;
  isActivating: boolean;
  isDeactivating: boolean;
  isDeleting: boolean;
  onActivate: () => void;
  onOpenDeactivate: () => void;
  onOpenDelete: () => void;
};

const ProfileTabToolbar = memo(function ProfileTabToolbar({
  isInactive,
  isActivating,
  isDeactivating,
  isDeleting,
  onActivate,
  onOpenDeactivate,
  onOpenDelete,
}: ProfileTabToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isInactive ? (
        <Button
          type="button"
          variant="ghost"
          className={cn(
            profileActionBtn,
            "gap-1.5 border border-[#00b4b8]/35 bg-[#00b4b8]/8 text-[#008f92] hover:bg-[#00b4b8]/14 hover:text-[#007a7d]",
          )}
          onClick={onActivate}
          disabled={isActivating}
        >
          {isActivating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Activating…
            </>
          ) : (
            <>
              <CheckCircle className="h-3.5 w-3.5" />
              Activate
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className={cn(
            profileActionBtn,
            "border border-[#e8eaed] bg-white/90 text-[#525253] hover:border-[#d8dadd] hover:bg-white hover:text-[#10141a]",
          )}
          onClick={onOpenDeactivate}
          disabled={isDeactivating}
        >
          {isDeactivating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Deactivating…
            </>
          ) : (
            "Deactivate"
          )}
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        className={cn(
          profileActionBtn,
          "gap-1.5 border border-red-200/90 bg-white/90 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700",
        )}
        onClick={onOpenDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Deleting…
          </>
        ) : (
          <>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </>
        )}
      </Button>
    </div>
  );
});

export type ProfileTabProps = {
  client: Client;
  formatDate: (dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date) => string;
  clientId: string;
  onClientUpdated?: () => void;
  /** Where to navigate after successful delete. Defaults to agency clients list. */
  afterDeleteRoute?: string;
};

export function ProfileTab({
  client,
  formatDate,
  clientId,
  onClientUpdated,
  afterDeleteRoute = Routes.agency.clients,
}: ProfileTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sections = useMemo(
    () => buildProfileSections(client, formatDate),
    [client, formatDate],
  );

  const handleDeactivate = useCallback(async () => {
    if (!clientId) return;

    try {
      setIsDeactivating(true);
      await updateClient(clientId, { status: "inactive" });

      toast({
        title: "Client deactivated",
        description: "The client has been successfully deactivated.",
      });

      setShowConfirmModal(false);
      onClientUpdated?.();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred while deactivating the client.";
      console.error("Failed to deactivate client:", error);
      toast({
        title: "Failed to deactivate client",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeactivating(false);
    }
  }, [clientId, onClientUpdated, toast]);

  const handleActivate = useCallback(async () => {
    if (!clientId) return;

    try {
      setIsActivating(true);
      await updateClient(clientId, { status: "active" });

      toast({
        title: "Client activated",
        description: "The client has been successfully activated.",
      });

      onClientUpdated?.();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred while activating the client.";
      console.error("Failed to activate client:", error);
      toast({
        title: "Failed to activate client",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  }, [clientId, onClientUpdated, toast]);

  const handleDelete = useCallback(async () => {
    const agencyId = client.agencyId;
    if (!clientId || !agencyId) {
      toast({
        title: "Cannot delete client",
        description: "Agency information is missing for this client.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);
      await deleteClient(clientId, agencyId);

      toast({
        title: "Client deleted",
        description: "The client has been successfully deleted.",
      });

      setShowDeleteModal(false);
      navigate(afterDeleteRoute);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred while deleting the client.";
      console.error("Failed to delete client:", error);
      toast({
        title: "Failed to delete client",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [afterDeleteRoute, client.agencyId, clientId, navigate, toast]);

  const openDeactivateModal = useCallback(() => setShowConfirmModal(true), []);
  const closeDeactivateModal = useCallback(() => setShowConfirmModal(false), []);
  const openDeleteModal = useCallback(() => setShowDeleteModal(true), []);
  const closeDeleteModal = useCallback(() => setShowDeleteModal(false), []);

  const isInactive = client.status === "inactive" || client.status === "archived";

  return (
    <>
      <div className="flex flex-col gap-4">
        <ProfileTabToolbar
          isInactive={isInactive}
          isActivating={isActivating}
          isDeactivating={isDeactivating}
          isDeleting={isDeleting}
          onActivate={handleActivate}
          onOpenDeactivate={openDeactivateModal}
          onOpenDelete={openDeleteModal}
        />

        <ProfileTabSections sections={sections} />
      </div>

      {showConfirmModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-[calc(100vw-2rem)] flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-lg sm:max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <p className="text-[18px] font-semibold text-[#10141a]">Deactivate client</p>
            <p className="text-[14px] text-[#4b4b4c]">
              Are you sure you want to deactivate this client? This action will mark the client as
              inactive and may affect their access to services.
            </p>
            <div className="mt-2 flex w-full flex-col justify-center gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  profileModalBtn,
                  "border border-[#e8eaed] bg-white text-[#525253] hover:bg-[#f5f6f7]",
                )}
                onClick={closeDeactivateModal}
                disabled={isDeactivating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  profileModalBtn,
                  "gap-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
                )}
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-[calc(100vw-2rem)] flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-lg sm:max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <p className="text-[18px] font-semibold text-[#10141a]">Delete client</p>
            <p className="text-[14px] text-[#4b4b4c]">
              Are you sure you want to delete this client? This action cannot be undone and will
              permanently remove all client data from the system.
            </p>
            <div className="mt-2 flex w-full flex-col justify-center gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  profileModalBtn,
                  "border border-[#e8eaed] bg-white text-[#525253] hover:bg-[#f5f6f7]",
                )}
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  profileModalBtn,
                  "gap-1.5 border border-red-200 bg-red-600 text-white hover:bg-red-700 hover:text-white",
                )}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
