import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Phone, Edit, ArrowLeft } from "lucide-react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityTab } from "@/pages/shared/client-details/tabs/ActivityTab";
import { ProfileTab } from "@/pages/shared/client-details/tabs/ProfileTab";
import { ServicesTab } from "@/pages/super-admin/clients-directory/client-details/tabs/ServicesTab";
import { DocumentsTab } from "@/pages/super-admin/clients-directory/client-details/tabs/DocumentsTab";
import { UploadClientDocumentModal } from "@/pages/super-admin/clients-directory/client-details/components/UploadClientDocumentModal";
import { getClientById, type Client, type ClientDocument } from "@/lib/api/clients";

type ClientDetailsTab = "activity" | "profile" | "services" | "documents";

export default function ClientDetailsPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "activity" as ClientDetailsTab);

  const handleTabChange = (tab: ClientDetailsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<ClientDocument | undefined>(undefined);
  const itemsPerPage = 6;

  // Format client name from firstName, lastName, middleName
  const formatClientName = useMemo(() => {
    if (!client) return "Unnamed Client";
    const parts = [
      client.firstName,
      client.middleName,
      client.lastName,
    ].filter(Boolean);
    return parts.join(" ") || "Unnamed Client";
  }, [client]);

  // Calculate age from dateOfBirth
  const calculateAge = useMemo(() => {
    if (!client?.dateOfBirth) return null;
    
    try {
      let birthDate: Date;
      
      // Handle Firestore Timestamp object
      if (typeof client.dateOfBirth === 'object' && '_seconds' in client.dateOfBirth && client.dateOfBirth._seconds) {
        birthDate = new Date(client.dateOfBirth._seconds * 1000);
      }
      // Handle Date object
      else if (client.dateOfBirth instanceof Date) {
        birthDate = client.dateOfBirth;
      }
      // Handle ISO string
      else if (typeof client.dateOfBirth === 'string') {
        birthDate = new Date(client.dateOfBirth);
      }
      else {
        return null;
      }
      
      if (isNaN(birthDate.getTime())) {
        return null;
      }
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch {
      return null;
    }
  }, [client?.dateOfBirth]);

  // Format date from ISO string or Firestore Timestamp
  const formatDate = useCallback((dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date): string => {
    if (!dateValue) return "N/A";
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp object
      if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      }
      // Handle Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle ISO string
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      else {
        return "N/A";
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "N/A";
      }
      
      return format(date, "MMMM d, yyyy");
    } catch {
      return "N/A";
    }
  }, []);

  // Fetch client data
  const fetchClient = useCallback(async () => {
    if (!clientId) {
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
  }, [clientId]);

  useEffect(() => {
    fetchClient();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [fetchClient]);

  const clientDisplay = useMemo(
    () => ({
      id: clientId ?? "",
      name: formatClientName,
      roleLabel: "Client",
      ageLabel: calculateAge ? `${calculateAge} yrs old` : "Age not available",
      avatarUrl: client?.profileImage,
    }),
    [clientId, formatClientName, calculateAge, client?.profileImage]
  );

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

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(Routes.superAdmin.clientDirectory)}
            className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(255,255,255,0.5)] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.7)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#10141a]" />
          </button>
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Client Management
          </h1>
        </div>
        <Button
          className="h-[44px] w-[180px] rounded-[60px] px-[11px] py-[12px] gap-2 bg-[#00b4b8] hover:bg-[#00a0a4] text-white flex items-center justify-center font-medium transition-colors"
          onClick={() => navigate(Routes.superAdmin.editClient.replace(":clientId", clientId || ""))}
        >
          <Edit className="w-5 h-5 text-white" />
          Edit Client
        </Button>
      </div>

      {/* Header Block */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-6">
          <Avatar className="w-[127px] h-[145px] rounded-[12px]">
            {clientDisplay.avatarUrl && (
              <AvatarImage
                src={clientDisplay.avatarUrl}
                alt={clientDisplay.name}
                className="w-full h-full object-cover aspect-auto rounded-[12px]"
              />
            )}
            <AvatarFallback className="w-full h-full rounded-[12px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-xl font-semibold">
              {clientDisplay.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[24px] font-semibold leading-[normal] text-[#10141a]">
                {clientDisplay.name}
              </p>
              <div className="flex flex-col gap-1 text-[12px] font-medium text-[#808081]">
                <span>Age: <span className="font-normal ps-2">{clientDisplay.ageLabel}</span></span>
                <span>Medical ID: <span className="font-normal ps-2">{client.medicaidId}</span></span>
              </div>
            </div>

            {client.phone && (
              <a
                href={`tel:${client.phone.replace(/\D/g, "")}`}
                className="h-[44px] w-[180px] rounded-[60px] px-[11px] py-[12px] gap-2 bg-[#00b4b8] hover:bg-[#00a0a4] text-white flex items-center justify-center font-medium transition-colors"
              >
                <Phone className="w-5 h-5 text-white" />
                Call
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("activity")}
            className={[
              "h-[36px] w-[80px] rounded-[60px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4] backdrop-blur-[22px] cursor-pointer",
              activeTab === "activity"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#b2b2b3] text-[#b2b2b3]",
            ].join(" ")}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("profile")}
            className={[
              "h-[36px] w-[80px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4] backdrop-blur-[22px] cursor-pointer",
              activeTab === "profile"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#b2b2b3] text-[#b2b2b3]",
            ].join(" ")}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("services")}
            className={[
              "h-[36px] w-[100px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4] backdrop-blur-[22px] cursor-pointer",
              activeTab === "services"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#b2b2b3] text-[#b2b2b3]",
            ].join(" ")}
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("documents")}
            className={[
              "h-[36px] w-[100px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4] backdrop-blur-[22px] cursor-pointer",
              activeTab === "documents"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#b2b2b3] text-[#b2b2b3]",
            ].join(" ")}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "activity" && (
        <ActivityTab
          clientName={clientDisplay.name}
          clientId={clientId || ""}
          agencyId={client?.agencyId || ""}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          shiftDetailsRoute={Routes.agency.shiftDetails}
        />
      )}
      {activeTab === "profile" && (
        <ProfileTab
          client={client}
          formatDate={formatDate}
          clientId={clientId || ""}
          onClientUpdated={fetchClient}
          afterDeleteRoute={Routes.superAdmin.clientDirectory}
        />
      )}
      {activeTab === "services" && (
        <ServicesTab
          client={client}
          clientId={clientId || ""}
          onServicesUpdated={fetchClient}
        />
      )}
      {activeTab === "documents" && (
        <DocumentsTab
          client={client}
          onOpenUploadModal={(document) => {
            setDocumentToEdit(document);
            setIsUploadModalOpen(true);
          }}
        />
      )}

      {/* Upload Document Modal */}
      {clientId && (
        <UploadClientDocumentModal
          isOpen={isUploadModalOpen}
          setIsOpen={(open) => {
            setIsUploadModalOpen(open);
            if (!open) {
              setDocumentToEdit(undefined);
            }
          }}
          clientId={clientId}
          documentToEdit={documentToEdit}
          onComplete={() => {
            setIsUploadModalOpen(false);
            setDocumentToEdit(undefined);
            fetchClient();
          }}
          onError={(error) => {
            console.error("Upload error:", error);
            // You could show a toast notification here
          }}
        />
      )}
    </div>
  );
}


