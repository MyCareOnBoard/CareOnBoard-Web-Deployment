import React, { memo, useCallback, useMemo, useState } from "react";
import { CheckCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { Client, updateClient, useDeleteClientMutation } from "@/lib/api/clients";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { cn } from "@/lib/utils";
import { ProfileSectionCard } from "@/pages/shared/client-details/components/ProfileSectionCard";
import { buildProfileSections, type ProfileSection } from "./profileTabViewModel";

type PendingConfirmAction = "deactivate" | "delete";

const CLIENT_CONFIRM_CONFIG: Record<
  PendingConfirmAction,
  { title: string; message: string; confirmText: string }
> = {
  deactivate: {
    title: "Deactivate client",
    message:
      "Are you sure you want to deactivate this client? This action will mark the client as inactive and may affect their access to services.",
    confirmText: "Deactivate",
  },
  delete: {
    title: "Delete client",
    message:
      "Are you sure you want to delete this client? This action cannot be undone and will permanently remove all client data from the system.",
    confirmText: "Delete",
  },
};

const profileActionBtn =
  "h-9 min-h-9 rounded-lg px-3.5 text-[13px] font-medium shadow-none transition-colors focus-visible:ring-offset-0";

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
  const [deleteClientMutation] = useDeleteClientMutation();
  const [pendingAction, setPendingAction] = useState<PendingConfirmAction | null>(null);
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

      setPendingAction(null);
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
      // Use the RTK mutation (not the plain api fn) so it invalidates the
      // 'Clients'/'ClientStats' tags and the management list refetches — otherwise
      // the deleted client lingers in the list until a manual refresh.
      await deleteClientMutation({ clientId, agencyId }).unwrap();

      toast({
        title: "Client deleted",
        description: "The client has been successfully deleted.",
      });

      setPendingAction(null);
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
  }, [afterDeleteRoute, client.agencyId, clientId, navigate, toast, deleteClientMutation]);

  const openDeactivateModal = useCallback(() => setPendingAction("deactivate"), []);
  const openDeleteModal = useCallback(() => setPendingAction("delete"), []);
  const closeConfirmModal = useCallback(() => setPendingAction(null), []);

  const handleConfirm = useCallback(() => {
    if (pendingAction === "delete") void handleDelete();
    else if (pendingAction === "deactivate") void handleDeactivate();
  }, [handleDeactivate, handleDelete, pendingAction]);

  const confirmConfig = pendingAction ? CLIENT_CONFIRM_CONFIG[pendingAction] : null;
  const isConfirmBusy =
    pendingAction === "deactivate" ? isDeactivating : pendingAction === "delete" ? isDeleting : false;

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

      <DeleteConfirmationModal
        isOpen={pendingAction !== null}
        onClose={() => {
          if (!isConfirmBusy) closeConfirmModal();
        }}
        onConfirm={handleConfirm}
        isDeleting={isConfirmBusy}
        title={confirmConfig?.title ?? ""}
        message={confirmConfig?.message ?? ""}
        confirmText={confirmConfig?.confirmText ?? "Confirm"}
        cancelText="Cancel"
      />
    </>
  );
}
