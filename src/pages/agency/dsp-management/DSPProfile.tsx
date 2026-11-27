import { useGetDocumentComplianceQuery, useComplianceDateRefresh } from '@/pages/agency/compliance-alerts/api';
import { useEffectiveAgencyMode } from '@/hooks/useEffectiveAgencyMode';
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MessageSquare, Pencil } from "lucide-react";
import { AgencyPill, agencyOutlineButton, agencyPrimaryButton, type AgencyTone } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
import { DSP } from "./types";
import { useDSPDetails,  useUpdateDSPStatus } from "./useDSPManagement";
import { Routes } from "@/routes/constants";
import { listEmployeeDocuments, EmployeeDocument, sendDocumentAlert, deleteEmployeeDocument } from "@/lib/api/employee-documents";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { documentTypeLabel } from "@/lib/documentTypes";
import { getEmployeeTrainings } from "@/lib/api/employees";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { useMessaging } from "@/contexts/MessagingContext";
import { ActivityTab } from "./components/ActivityTab";
import { ShiftsTab } from "./components/ShiftsTab";
import { ProfileTab } from "./components/ProfileTab";
import { TrainingTab } from "./components/TrainingTab";
import { EditProfileModal } from "./components/EditProfileModal";
import { RequestDocumentModal } from "./components/RequestDocumentModal";
import { withMessagingProvider } from "@/contexts/withMessagingProvider";

interface DSPProfileProps {
  dsp: DSP;
  onBack: () => void;
  /** Breadcrumb label for the directory ("DSP management"). */
  sectionLabel?: string;
}

const PROFILE_TABS = ["Activity", "Shifts", "Profile", "Training"] as const;

const STATUS_TONE: Record<string, AgencyTone> = { active: "green", pending: "amber", suspended: "red", inactive: "grey" };

const smallButton = "inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50";

function DSPProfileContent({ dsp, onBack, sectionLabel = "DSP management" }: DSPProfileProps) {
  // A link may name the tab to open, for example ?tab=Training from a compliance incident.
  const [activeTab, setActiveTab] = useState<"Activity" | "Shifts" | "Profile" | "Training">(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    return PROFILE_TABS.find(tab => tab === requested) ?? "Activity";
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showRequestDocument, setShowRequestDocument] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [currentDsp, setCurrentDsp] = useState<DSP>(dsp);
  const { toast } = useToast();
  const { user } = useAuth();
  const messaging = useMessaging();
  const mode = useEffectiveAgencyMode();
  const [searchParams] = useSearchParams();
  const focusDocumentId = searchParams.get('documentId');
  const focusDocumentKey = searchParams.get('documentKey');
  const documentsOnly = activeTab === 'Activity' && Boolean(focusDocumentId || focusDocumentKey);
  useEffect(() => {if (focusDocumentId || focusDocumentKey) setActiveTab('Activity');}, [focusDocumentId,focusDocumentKey]);
  const {data: compliance, isError: complianceError, refetch: refreshCompliance} = useGetDocumentComplianceQuery(
    {viewerId: user?.uid, agencyId: user?.agencyId, employeeId: dsp.id, mode: mode ?? undefined, condition: 'all', limit: 100},
    {skip: !dsp.id || activeTab !== 'Activity', refetchOnFocus: true, refetchOnMountOrArgChange: true},
  );
  useComplianceDateRefresh(activeTab === 'Activity' ? compliance?.timezone : null, refreshCompliance, compliance?.localDate);

  const navigate = useNavigate();
  const { shifts, isLoading: detailsLoading, refetch: refetchDspDetails } = useDSPDetails(documentsOnly ? null : dsp.id);
  const { updateStatus } = useUpdateDSPStatus();

  const [totalCount, setTotalCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [automaticAccepted, setAutomaticAccepted] = useState(0);
  const [policyAssessmentComplete, setPolicyAssessmentComplete] = useState(false);
  const [trainingsLoading, setTrainingsLoading] = useState(false);
  
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [removingDoc, setRemovingDoc] = useState<EmployeeDocument | null>(null);
  const [isRemovingDoc, setIsRemovingDoc] = useState(false);
  const [alertingDocId, setAlertingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (dsp.id) fetchDocuments();
  }, [dsp.id]);

  useEffect(() => {
    if (!dsp.id || documentsOnly) return;
    let active = true;
    setTrainingsLoading(true);
    getEmployeeTrainings(dsp.id, user?.agencyId, true, mode ?? undefined)
      .then(trainings => {
        if (!active) return;
        setTotalCount(trainings.summary?.assigned ?? 0);
        setCompletedCount(trainings.summary?.manualCompleted ?? 0);
        setAutomaticAccepted(trainings.summary?.policyAccepted ?? 0);
        setPolicyAssessmentComplete(trainings.summary?.policyAssessmentComplete === true);
      })
      .catch(error => {
        if (!active) return;
        console.error('Failed to fetch trainings:', error);
        setTotalCount(0);
        setCompletedCount(0);
        setAutomaticAccepted(0);
        setPolicyAssessmentComplete(false);
      })
      .finally(() => { if (active) setTrainingsLoading(false); });
    return () => { active = false; };
  }, [dsp.id, user?.agencyId, mode, currentDsp.hireDate, currentDsp.role, documentsOnly]);

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const docs = await listEmployeeDocuments(dsp.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleRequestDocument = () => {
    setShowRequestDocument(true);
  };

  const handleProfileUpdated = (updated: Partial<DSP>) => {
    setCurrentDsp((prev) => ({ ...prev, ...updated }));
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-[#e6f6ec] text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]';
      case 'expired':
        return 'bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]';
      case 'expiring-soon':
        return 'bg-[#fcf5dc] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]';
      case 'unavailable':
        return 'bg-[#eef0f2] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]';
      default:
        return 'bg-[#eef0f2] text-[#2a3138] dark:bg-white/10 dark:text-[#c9d1d4]';
    }
  };

  const handleSendDocumentAlert = async (doc: EmployeeDocument) => {
    try {
      setAlertingDocId(doc.id);
      await sendDocumentAlert(currentDsp.id, doc.id);
      toast({
        title: "Alert Sent",
        description: `An alert has been sent to ${currentDsp.fullName} about their ${doc.status} document.`,
      });
    } catch (error) {
      console.error('Failed to send document alert:', error);
      toast({
        title: "Error",
        description: "Failed to send alert. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAlertingDocId(null);
    }
  };

  const handleRemoveDocument = async () => {
    if (!removingDoc) return;
    try {
      setIsRemovingDoc(true);
      await deleteEmployeeDocument(currentDsp.id, removingDoc.id);
      toast({ title: "Document removed", description: `${documentTypeLabel(removingDoc.documentName)} was removed from ${currentDsp.fullName}'s documents.` });
      setRemovingDoc(null);
      void fetchDocuments();
      void refreshCompliance();
    } catch (error) {
      console.error('Failed to remove document:', error);
      toast({ title: "Error", description: "Failed to remove the document. Please try again.", variant: "destructive" });
    } finally {
      setIsRemovingDoc(false);
    }
  };

  const getDocumentActionButton = (status: string, doc?: EmployeeDocument) => {
    if (!doc) return null;
    const removeButton = (
      <button
        type="button"
        onClick={() => setRemovingDoc(doc)}
        aria-label={`Remove ${documentTypeLabel(doc.documentName)}`}
        className={cn(smallButton, "border border-[#f0c8c4] bg-white text-[#b42318] hover:bg-[#fdf2f1] dark:border-[#ff6b5e]/30 dark:bg-transparent dark:text-[#f8a1a1] dark:hover:bg-[#ff6b5e]/10")}
      >
        Remove
      </button>
    );
    if (status === 'expired' || status === 'expiring-soon') {
      const isLoading = alertingDocId === doc.id;
      return (<>
        <button
          onClick={() => handleSendDocumentAlert(doc)}
          disabled={isLoading}
          className={cn(smallButton, "bg-[#b42318] text-white hover:bg-[#9a1d14] dark:bg-[#d93a2f] dark:hover:bg-[#c2322a]")}
        >
          {isLoading ? 'Sending...' : 'Send Alert'}
        </button>
        {removeButton}
      </>);
    }
    return removeButton;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeactivateUser = async () => {
    await updateStatus(dsp.id, "inactive");
  };

  const handleActivateUser = async () => {
    await updateStatus(dsp.id, "active");
  };

  const handleOpenChat = async () => {
    if (isOpeningChat) return;

    const dspParticipantId = currentDsp.uid || currentDsp.userId || currentDsp.id;
    const currentUserId = user?.uid;

    if (!currentUserId || !dspParticipantId) {
      toast({
        title: "Error",
        description: "Unable to open chat right now.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsOpeningChat(true);

      const existingConversation = messaging.conversations.find((conversation) => {
        const participantIds = conversation.participantIds || [];
        const isDirectConversation =
          conversation.type === "direct" || participantIds.length === 2;

        return (
          isDirectConversation &&
          participantIds.includes(currentUserId) &&
          participantIds.includes(dspParticipantId)
        );
      });

      const conversationId =
        existingConversation?.id ??
        (await messaging.createConversation([dspParticipantId]))?.id;

      if (!conversationId) {
        return;
      }

      navigate(
        Routes.agency.supportConversation.replace(":conversationId", conversationId)
      );
    } catch (error) {
      // Error toast is already handled in the messaging context
    } finally {
      setIsOpeningChat(false);
    }
  };

  const metaLine = [
    `${currentDsp.role} · ${currentDsp.age} yrs old`,
    currentDsp.email,
  ].filter(Boolean);

  return (
    <div className="space-y-6 pb-6">
      <div className="border-b border-[#eceef0] pb-6 dark:border-white/10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-3 text-[14px]">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Directory"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#2a3138] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:text-[#c9d1d4] dark:hover:bg-white/5"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <ol className="flex min-w-0 items-center gap-2">
            <li>
              <button type="button" onClick={onBack} className="cursor-pointer text-[#4b535b] hover:text-[#10141a] hover:underline dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]">
                {sectionLabel}
              </button>
            </li>
            <li aria-hidden="true" className="text-[#9aa1a7]">/</li>
            <li aria-current="page" className="truncate font-medium text-[#10141a] dark:text-[#f4f6f7]">{currentDsp.fullName}</li>
          </ol>
        </nav>

        {/* Profile header */}
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage
                src={currentDsp.profilePicture}
                alt={currentDsp.fullName}
                className="h-full w-full object-cover"
              />
              <AvatarFallback className="bg-[#e0f3f3] text-[20px] font-medium text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
                {getInitials(currentDsp.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[28px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">{currentDsp.fullName}</h1>
                <AgencyPill tone={STATUS_TONE[currentDsp.status ?? ""] ?? "grey"} className="capitalize">{currentDsp.status}</AgencyPill>
              </div>
              <p className="mt-1 flex flex-wrap gap-x-2 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
                {metaLine.map((item, index) => (
                  <span key={index}>{index > 0 && <span aria-hidden="true" className="mr-2">·</span>}{item}</span>
                ))}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenChat}
              disabled={isOpeningChat}
              className={agencyOutlineButton}
            >
              <MessageSquare aria-hidden="true" className="h-4 w-4" />
              {isOpeningChat ? "Opening..." : "Chat"}
            </button>
            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className={agencyPrimaryButton}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Profile sections" className="flex max-w-full gap-0.5 overflow-x-auto rounded-[12px] bg-[#f4f5f6] p-1 sm:inline-flex dark:bg-white/5">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-[9px] px-4 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
              activeTab === tab
                ? "bg-[#003839] font-medium text-white shadow-[0_1px_2px_rgba(16,20,26,0.12)] dark:bg-[#0f7e7d] dark:text-white"
                : "text-[#4b535b] hover:bg-white/70 hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:bg-white/5 dark:hover:text-[#f4f6f7]",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Activity" && (
        <ActivityTab
          focusDocumentKey={focusDocumentKey}
          dspId={currentDsp.id}
          dspName={currentDsp.fullName}
          shifts={shifts}
          detailsLoading={detailsLoading}
          trainingsLoading={trainingsLoading}
          documentsLoading={documentsLoading}
          totalCount={totalCount}
          completedCount={completedCount}
          automaticAccepted={automaticAccepted}
          policyAssessmentComplete={policyAssessmentComplete}
          documents={documents}
          compliance={compliance}
          complianceError={complianceError}
          refreshCompliance={refreshCompliance}
          focusDocumentId={focusDocumentId}
          onRequestDocument={handleRequestDocument}
          getDocumentStatusColor={getDocumentStatusColor}
          getDocumentActionButton={getDocumentActionButton}
          onDocumentsChanged={() => { void fetchDocuments(); void refreshCompliance(); }}
        />
      )}

      {activeTab === "Shifts" && (
        <ShiftsTab
          shifts={shifts}
          isLoading={detailsLoading}
          getInitials={getInitials}
          agencyId={user?.agencyId ?? ""}
          dspId={currentDsp.id}
          dspFullName={currentDsp.fullName}
          dspProfilePicture={currentDsp.profilePicture}
          onShiftsUpdated={() => void refetchDspDetails()}
        />
      )}

      {activeTab === "Profile" && (
        <ProfileTab
          dsp={currentDsp}
          onDeactivate={handleDeactivateUser}
          onActivate={handleActivateUser}
        />
      )}

      {activeTab === "Training" && (
        <TrainingTab
          dspId={currentDsp.id}
          agencyId={user?.agencyId}
          mode={mode ?? undefined}
        />
      )}

      {/* Modals */}
      <EditProfileModal
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        dsp={currentDsp}
        onUpdated={handleProfileUpdated}
      />

      <RequestDocumentModal
        open={showRequestDocument}
        onClose={() => setShowRequestDocument(false)}
        employeeId={currentDsp.id}
        employeeName={currentDsp.fullName}
        documents={documents}
        onRequested={() => {void fetchDocuments(); void refreshCompliance();}}
      />

      <ConfirmDialog open={removingDoc !== null} onOpenChange={(open) => { if (!open && !isRemovingDoc) setRemovingDoc(null); }}>
        <ConfirmDialogContent
          title="Remove document"
          description={removingDoc ? `Remove ${documentTypeLabel(removingDoc.documentName)}${removingDoc.uploadedAt ? ` (uploaded ${new Date(removingDoc.uploadedAt).toLocaleDateString()})` : ''} from ${currentDsp.fullName}'s documents? This can't be undone.` : undefined}
          confirmText="Remove"
          cancelText="Cancel"
          onConfirm={handleRemoveDocument}
          onCancel={() => setRemovingDoc(null)}
          isLoading={isRemovingDoc}
          loadingText="Removing..."
        />
      </ConfirmDialog>
    </div>
  );
}

export const DSPProfile = withMessagingProvider(DSPProfileContent);
