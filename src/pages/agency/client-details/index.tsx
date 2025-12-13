import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { useParams } from "react-router";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityTab } from "@/pages/agency/client-details/tabs/ActivityTab";
import { ProfileTab } from "@/pages/agency/client-details/tabs/ProfileTab";
import { DocumentsTab } from "@/pages/agency/client-details/tabs/DocumentsTab";
import { useAuth } from "@/utils/auth";
import { getAgencyClientById, type Client } from "@/lib/api/clients";

type ClientDetailsTab = "activity" | "profile" | "documents";

export default function ClientDetailsPage() {
  const { clientId } = useParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ClientDetailsTab>("activity");
  const [currentPage, setCurrentPage] = useState(1);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  useEffect(() => {
    const fetchClient = async () => {
      if (!clientId || !user?.agencyId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const clientData = await getAgencyClientById(clientId);
        setClient(clientData);
      } catch (err: any) {
        console.error("Failed to fetch client:", err);
        setError(err.message || "Failed to load client details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [clientId, user?.agencyId]);

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

  const shifts = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, idx) => ({
        id: `shift-${idx + 1}`,
        dspName: "Nola Hawkins",
        dspRole: "DSP",
        avatarUrl: "https://i.pravatar.cc/120?img=47",
        dateLabel: "12 January",
        location: "221/B Baker Street",
        clockedIn: "2.30 PM",
        clockedOut: "4.30 PM",
        durationLabel: "2 hour session",
      })),
    []
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
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Client Management
        </h1>
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
              <div className="flex items-center gap-2 text-[12px] font-medium leading-[1.6] text-[#808081]">
                <span>{clientDisplay.roleLabel}</span>
                <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#808081]" />
                <span>{clientDisplay.ageLabel}</span>
              </div>
            </div>

            {client.phone && (
              <Button className="h-[44px] w-[180px] rounded-[60px] px-[11px] py-[12px] gap-2">
                <Phone className="w-5 h-5 text-white" />
                Call
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
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
            onClick={() => setActiveTab("profile")}
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
            onClick={() => setActiveTab("documents")}
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
          shifts={shifts}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
        />
      )}
      {activeTab === "profile" && <ProfileTab client={client} formatDate={formatDate} />}
      {activeTab === "documents" && <DocumentsTab client={client} />}
    </div>
  );
}


