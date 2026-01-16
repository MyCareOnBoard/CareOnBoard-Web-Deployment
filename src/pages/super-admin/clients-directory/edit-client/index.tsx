import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Loader2 } from "lucide-react";
import { getClientById, type Client } from "@/lib/api/clients";
import { clientToFormData } from "../add-client/clientToFormData";
import AddClientPage from "../add-client";

export default function EditClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [clientId]);

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

  if (error || !client) {
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

  const initialFormData = clientToFormData(client);

  return <AddClientPage initialFormData={initialFormData} clientId={clientId} isEditMode={true} />;
}
