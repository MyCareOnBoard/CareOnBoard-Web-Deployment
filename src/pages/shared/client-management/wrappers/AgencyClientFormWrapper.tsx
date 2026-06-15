import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Routes } from "@/routes/constants";
import { getAgencyClientById, type Client } from "@/lib/api/clients";
import { getAgencyById } from "@/lib/api/agencies";
import { useAuth } from "@/utils/auth";
import { ClientFormWizard } from "../ClientFormWizard";
import { clientToFormData } from "../utils/clientToFormData";
import { createInitialAddClientFormData, type ClientType } from "../types/formData";
import { ClientFormConfig } from "../types/config";

type AgencyClientFormWrapperProps = {
  isEditMode?: boolean;
};

export function AgencyClientFormWrapper({ isEditMode = false }: AgencyClientFormWrapperProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const agencyId = user?.agencyId;
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Agency-supported client types. On error/missing we leave this undefined so
  // the wizard falls back to offering both DDD and HHA.
  const [supportedClientTypes, setSupportedClientTypes] = useState<ClientType[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      const tasks: Promise<unknown>[] = [];

      // Fetch the agency to read its supported client types. On error/missing we
      // leave supportedClientTypes undefined (wizard treats that as both).
      if (agencyId) {
        tasks.push(
          getAgencyById(agencyId)
            .then((agency) => {
              if (cancelled) return;
              const types = agency?.supportedClientTypes;
              if (Array.isArray(types) && types.length) {
                setSupportedClientTypes(types as ClientType[]);
              } else {
                setSupportedClientTypes(undefined);
              }
            })
            .catch((err: any) => {
              console.error("Failed to fetch agency supported client types:", err);
              if (!cancelled) setSupportedClientTypes(undefined);
            }),
        );
      }

      // Only the edit flow needs to preload the existing client.
      if (isEditMode) {
        if (!clientId) {
          if (!cancelled) {
            setError("Client ID is required");
            setIsLoading(false);
          }
          return;
        }

        tasks.push(
          getAgencyClientById(clientId)
            .then((clientData) => {
              if (!cancelled) setClient(clientData);
            })
            .catch((err: any) => {
              console.error("Failed to fetch client:", err);
              if (!cancelled) setError(err.message || "Failed to load client details");
            }),
        );
      }

      await Promise.all(tasks);
      if (!cancelled) setIsLoading(false);
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [clientId, isEditMode, agencyId]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#00b4b8]" />
          <p className="text-[14px] font-medium text-[#808081]">
            Loading client details...
          </p>
        </div>
      </div>
    );
  }

  if (error || (isEditMode && !client)) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[16px] font-medium text-red-600 mb-2">
            {error || "Client not found"}
          </p>
          <p className="text-[14px] font-medium text-[#808081]">
            Please check the client ID and try again.
          </p>
        </div>
      </div>
    );
  }

  const initialFormData = isEditMode && client
    ? clientToFormData(client, false)
    : createInitialAddClientFormData();

  const config: ClientFormConfig = {
    showAgencySelection: false,
    userAgencyId: user?.agencyId || user?.uid,
    onSuccessNavigate: (id) => (id ? Routes.agency.clientDetails.replace(":clientId", id) : Routes.agency.clients),
    successMessage: isEditMode ? "Update Client" : "Save Progress",
    pageTitle: isEditMode ? "Edit client" : "Add client",
    backNavigate: isEditMode && clientId ? Routes.agency.clientDetails.replace(":clientId", clientId) : Routes.agency.clients,
    clientId,
    isEditMode,
    supportedClientTypes,
  };

  const handleSuccess = (id?: string, isProgressive?: boolean) => {
    if (id && isProgressive) {
      navigate(Routes.agency.editClient.replace(":clientId", id), { replace: true });
    } else if (id) {
      navigate(Routes.agency.clientDetails.replace(":clientId", id));
    } else {
      navigate(Routes.agency.clients);
    }
  };

  return (
    <ClientFormWizard
      initialFormData={initialFormData}
      clientId={clientId}
      isEditMode={isEditMode}
      config={config}
      onSuccess={handleSuccess}
    />
  );
}
