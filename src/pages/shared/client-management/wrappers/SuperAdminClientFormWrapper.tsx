import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Routes } from "@/routes/constants";
import { getClientById, type Client, type Agency } from "@/lib/api/clients";
import { useListAllAgenciesQuery } from "@/pages/super-admin/agencies/api";
import { type Agency as FullAgency } from "@/lib/api/agencies";
import { ClientFormWizard } from "../ClientFormWizard";
import { clientToFormData } from "../utils/clientToFormData";
import { createInitialAddClientFormData } from "../types/formData";
import { ClientFormConfig } from "../types/config";

type SuperAdminClientFormWrapperProps = {
  isEditMode?: boolean;
};

export function SuperAdminClientFormWrapper({ isEditMode = false }: SuperAdminClientFormWrapperProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const { data: agenciesData, isLoading: loadingAgencies } = useListAllAgenciesQuery({});

  const agencies: Agency[] = useMemo(() => {
    if (!agenciesData?.agencies) return [];
    return agenciesData.agencies.map((agency: FullAgency) => ({
      id: agency.id,
      name: agency.name,
    }));
  }, [agenciesData]);

  useEffect(() => {
    if (!isEditMode) {
      setIsLoading(false);
      return;
    }

    const fetchClient = async () => {
      if (!clientId) {
        setError("Client ID is required");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const clientData = await getClientById(clientId);
        setClient(clientData);
      } catch (err: any) {
        console.error("Failed to fetch client:", err);
        setError(err.message || "Failed to load client details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [clientId, isEditMode]);

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
    ? clientToFormData(client, true)
    : createInitialAddClientFormData();

  const config: ClientFormConfig = {
    showAgencySelection: true,
    agencies,
    loadingAgencies,
    onSuccessNavigate: (id) => (id ? Routes.superAdmin.clientDetails.replace(":clientId", id) : Routes.superAdmin.clientDirectory),
    successMessage: isEditMode ? "Update Client" : "Save Progress",
    pageTitle: isEditMode ? "Edit client" : "Add client",
    backNavigate: isEditMode && clientId ? Routes.superAdmin.clientDetails.replace(":clientId", clientId) : Routes.superAdmin.clientDirectory,
    clientId,
    isEditMode,
  };

  const handleSuccess = (id?: string, isProgressive?: boolean) => {
    if (id && isProgressive) {
      navigate(Routes.superAdmin.editClient.replace(":clientId", id), { replace: true });
    } else if (id) {
      navigate(Routes.superAdmin.clientDetails.replace(":clientId", id));
    } else {
      navigate(Routes.superAdmin.clientDirectory);
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
