import {NotificationContext} from '@/components/compliance/NotificationContext';
import { useEffectiveAgencyMode } from '@/hooks/useEffectiveAgencyMode';
import { useClientDocumentRefresh } from '@/pages/shared/client-details/hooks/useClientDocumentRefresh';
import { showClientChecklist } from '@/pages/shared/client-details/components/ClientDocumentChecklist';
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Phone, Edit, ArrowLeft } from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
import { ActivityTab } from "@/pages/shared/client-details/tabs/ActivityTab";
import { ProfileTab } from "@/pages/shared/client-details/tabs/ProfileTab";
import { ServicesTab } from "@/pages/agency/client-details/tabs/ServicesTab";
import { DocumentsTab } from "@/pages/agency/client-details/tabs/DocumentsTab";
import { FamilyPortalTab } from "@/pages/agency/client-details/tabs/FamilyPortalTab";
import { UploadClientDocumentModal } from "@/pages/agency/client-details/components/UploadClientDocumentModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/utils/auth";
import { getAgencyClientById, updateClient, type Client, type ClientDocument, type ClientDocumentKey } from "@/lib/api/clients";
import { Routes } from "@/routes/constants";
import SupportCoordinatorClientDetailsPage from "./SupportCoordinatorClientDetailsPage";
import { ClientImportReviewNotice } from "@/pages/shared/client-management/components/ClientImportReview";

const AgencyCareClientEntry = lazy(() => import('@/features/agency-care/AgencyCareHome').then(module => ({ default: module.AgencyCareClientEntry })));
const AgencyCareSourcePublications = lazy(() => import('@/features/agency-care/AgencyCareSourcePublications').then(module => ({ default: module.AgencyCareSourcePublications })));

type ClientDetailsTab = "activity" | "profile" | "services" | "documents" | "family-portal";

const CLIENT_TABS: { value: ClientDetailsTab; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "profile", label: "Profile" },
  { value: "services", label: "Services" },
  { value: "documents", label: "Documents" },
  { value: "family-portal", label: "Family Portal" },
];

export default function ClientDetailsPage() {
  const { clientId } = useParams();
  const effectiveMode = useEffectiveAgencyMode();
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const mode = requestedMode === "ddd" || requestedMode === "hha" ? requestedMode : effectiveMode;
  return mode === "sc" ? <SupportCoordinatorClientDetailsPage key={clientId} /> : <AgencyClientDetailsPage />;
}

function AgencyClientDetailsPage() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: ClientDetailsTab = ["activity", "profile", "services", "documents", "family-portal"].includes(requestedTab || "") ? requestedTab as ClientDetailsTab : "activity";
  const setActiveTab = (tab: ClientDetailsTab) => {const next = new URLSearchParams(searchParams); next.set('tab', tab); setSearchParams(next);};
  const [currentPage, setCurrentPage] = useState(1);
  const effectiveMode = useEffectiveAgencyMode();
  const requestedMode=searchParams.get('mode');
  const mode=requestedMode==='ddd'||requestedMode==='hha'?requestedMode:effectiveMode;
  const environment = import.meta.env.VITE_API_ENVIRONMENT || 'staging';
  const scopeKey = JSON.stringify([user?.profile?.accessList, user?.profile?.agencyModes, user?.profile?.isActive, user?.profile?.agencyScope, user?.profile?.agencyIds, user?.profile?.status, user?.profile?.supportedClientTypes, user?.agency?.supportedClientTypes]);
  const loadClient = useCallback((signal: AbortSignal) => getAgencyClientById(clientId!, { signal, mode }), [clientId, mode]);
  const { client, loading: isLoading, refreshing, error, refresh } = useClientDocumentRefresh({
    requestKey: JSON.stringify([environment, user?.uid, user?.userType, user?.agencyId, scopeKey, clientId, mode]),
    enabled: Boolean(clientId && user?.uid && user?.agencyId), documentsActive: activeTab === 'documents', load: loadClient,
  });
  const fetchClient = useCallback(async () => { await refresh(true); }, [refresh]);
  const [initialDocumentKey, setInitialDocumentKey] = useState<ClientDocumentKey | undefined>();
  const canUpload = user?.userType === "agency";
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<ClientDocument | undefined>(undefined);
  const [activate485Open, setActivate485Open] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    setIsUploadModalOpen(false); setDocumentToEdit(undefined); setInitialDocumentKey(undefined); setActivate485Open(false);
  }, [clientId, mode, user?.uid, environment, scopeKey]);

  // Activate the client after its Form 485 is uploaded (HHA clients are held
  // non-active until then). The backend gate now passes since the 485 exists.
  const handleActivateClient = useCallback(async () => {
    if (!clientId) return;
    try {
      setIsActivating(true);
      await updateClient(clientId, { status: "active" });
      setActivate485Open(false);
      await fetchClient();
    } catch (err) {
      console.error("Failed to activate client:", err);
    } finally {
      setIsActivating(false);
    }
  }, [clientId, fetchClient]);

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
        <div role="status" className="flex flex-col items-center gap-4">
          <Loader2 aria-hidden="true" className="w-8 h-8 animate-spin text-[#007679] dark:text-[#7fd3d3]" />
          <p className="text-[14px] font-medium text-[#4b535b] dark:text-[#9aa4a8]">
            {activeTab === "documents" ? "Loading document checklist…" : "Loading client details..."}
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div role="alert" className="max-w-md rounded-[16px] border border-[#e4e7ea] bg-white px-8 py-10 text-center dark:border-white/10 dark:bg-[#1b232b]">
          <p className="text-[16px] font-medium text-[#b42318] mb-2 dark:text-[#f8a1a1]">
            {error || "Client not found"}
          </p>
          <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
            Please check the client ID and try again.
          </p>
          <Button type="button" variant="outline" className="mt-5" onClick={() => void fetchClient()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] pb-6">
      <div className="border-b border-[#eceef0] pb-6 dark:border-white/10">
        {/* Breadcrumb and page actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-3 text-[14px]">
            <button
              type="button"
              onClick={() => navigate(Routes.agency.clients)}
              aria-label="Back to Client management"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#2a3138] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:text-[#c9d1d4] dark:hover:bg-white/5"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <ol className="flex min-w-0 items-center gap-2">
              <li>
                <button type="button" onClick={() => navigate(Routes.agency.clients)} className="cursor-pointer text-[#4b535b] hover:text-[#10141a] hover:underline dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]">
                  Client management
                </button>
              </li>
              <li aria-hidden="true" className="text-[#9aa1a7]">/</li>
              <li aria-current="page" className="truncate font-medium text-[#10141a] dark:text-[#f4f6f7]">{clientDisplay.name}</li>
            </ol>
          </nav>
          {clientId && (
            <div className="flex flex-wrap items-center gap-2.5">
            {mode && <Suspense fallback={<span role="status" className="text-sm text-[#4b535b]">Loading care connection…</span>}><AgencyCareClientEntry clientId={clientId} program={mode} /></Suspense>}
            <button
              type="button"
              className={agencyPrimaryButton}
              onClick={() => navigate(Routes.agency.editClient.replace(":clientId", clientId))}
            >
              <Edit aria-hidden="true" className="h-4 w-4" />
              Edit Client
            </button>
            </div>
          )}
        </div>

        {/* Client header */}
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              {clientDisplay.avatarUrl && (
                <AvatarImage
                  src={clientDisplay.avatarUrl}
                  alt={clientDisplay.name}
                  className="h-full w-full object-cover"
                />
              )}
              <AvatarFallback className="bg-[#e0f3f3] text-[20px] font-medium text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
                {clientDisplay.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-[28px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
                {clientDisplay.name}
              </h1>
              <p className="mt-1 flex flex-wrap gap-x-2 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
                <span>Age: <span className="text-[#10141a] dark:text-[#f4f6f7]">{clientDisplay.ageLabel}</span></span>
                <span aria-hidden="true">·</span>
                <span>Medical ID: <span className="text-[#10141a] dark:text-[#f4f6f7]">{client.medicaidId}</span></span>
              </p>
            </div>
          </div>

          {client.phone && (
            <a
              href={`tel:${client.phone.replace(/\D/g, "")}`}
              className={agencyOutlineButton}
            >
              <Phone aria-hidden="true" className="h-4 w-4" />
              Call
            </a>
          )}
        </div>
      </div>

      <div className="mt-5 empty:hidden">
        <ClientImportReviewNotice client={client} />
      </div>

      {/* Tabs */}
      <div role="group" aria-label="Client sections" className="mt-5 flex max-w-full gap-0.5 overflow-x-auto rounded-[12px] bg-[#f4f5f6] p-1 sm:inline-flex dark:bg-white/5">
        {CLIENT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[9px] px-4 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
              activeTab === tab.value
                ? "bg-[#003839] font-medium text-white shadow-[0_1px_2px_rgba(16,20,26,0.12)] dark:bg-[#0f7e7d] dark:text-white"
                : "text-[#4b535b] hover:bg-white/70 hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:bg-white/5 dark:hover:text-[#f4f6f7]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "activity" && (
        <ActivityTab
          clientName={clientDisplay.name}
          clientId={clientId || ""}
          agencyId={user?.agencyId || ""}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
        />
      )}
      {activeTab === "profile" && (
        <ProfileTab
          client={client}
          formatDate={formatDate}
          clientId={clientId || ""}
          onClientUpdated={fetchClient}
        />
      )}
      {['services','documents'].includes(activeTab)&&<NotificationContext notificationId={searchParams.get('notificationId')} initialRunId={searchParams.get('initialRunId')} initialItemId={searchParams.get('initialItemId')} expectedClientId={clientId}/>}
      {activeTab === "services" && (
        <ServicesTab
          client={client}
          clientId={clientId || ""}
          onServicesUpdated={fetchClient}
        />
      )}
      {activeTab === "documents" && (
        <>
        <DocumentsTab
          focusDocumentKey={searchParams.get('documentKey')}
          client={client}
          showChecklist={showClientChecklist(client, user?.userType, mode)}
          refreshing={refreshing} refreshError={error} onRefresh={() => void fetchClient()}
          onUploadChecklist={canUpload ? key => { setDocumentToEdit(undefined); setInitialDocumentKey(key); setIsUploadModalOpen(true); } : undefined}
          onOpenUploadModal={canUpload ? (document) => {
            setInitialDocumentKey(undefined); setDocumentToEdit(document); setIsUploadModalOpen(true);
          } : undefined}
          onActivateClient={canUpload ? handleActivateClient : undefined}
        />
        {clientId && mode && (
          <Suspense fallback={(
            <p role="status" className="mt-5 text-sm text-[#647b7e]">Loading published care documents…</p>
          )}>
            <AgencyCareSourcePublications clientId={clientId} program={mode} />
          </Suspense>
        )}
        </>
      )}
      {activeTab === "family-portal" && (
        <FamilyPortalTab
          client={client}
          clientId={clientId || ""}
          onClientUpdated={fetchClient}
        />
      )}

      {/* Upload Document Modal */}
      {clientId && canUpload && (
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
          initialDocumentKey={initialDocumentKey}
          onComplete={(info) => {
            setIsUploadModalOpen(false);
            setDocumentToEdit(undefined);
            // Offer to activate when a Form 485 lands on a non-active HHA client.
            const offerActivate =
              info?.uploadedKey === "form485" &&
              client?.type === "hha" &&
              client?.status !== "active";
            fetchClient();
            if (offerActivate) setActivate485Open(true);
          }}
          onError={(error) => {
            console.error("Upload error:", error);
            // You could show a toast notification here
          }}
        />
      )}

      <AlertDialog open={activate485Open} onOpenChange={setActivate485Open}>
        <AlertDialogContent className="rounded-[20px] border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Activate this client?</AlertDialogTitle>
            <AlertDialogDescription>
              The Form 485 has been uploaded. Activating this client lets you schedule
              shifts, rides, and other services. You can do this later instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivating}>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleActivateClient();
              }}
              disabled={isActivating}
            >
              {isActivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating&hellip;
                </>
              ) : (
                "Activate client"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
