import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { DSP } from "./types";
import { useDSPDetails,  useUpdateDSPStatus } from "./useDSPManagement";
import { Routes } from "@/routes/constants";
import { listEmployeeDocuments, EmployeeDocument, sendDocumentAlert } from "@/lib/api/employee-documents";
import { getEmployeeTrainings } from "@/lib/api/employees";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { useMessaging } from "@/contexts/MessagingContext";
import { ActivityTab } from "./components/ActivityTab";
import { ShiftsTab } from "./components/ShiftsTab";
import { ProfileTab } from "./components/ProfileTab";
import { EditProfileModal } from "./components/EditProfileModal";
import { RequestDocumentModal } from "./components/RequestDocumentModal";

interface DSPProfileProps {
  dsp: DSP;
  onBack: () => void;
}

export function DSPProfile({ dsp, onBack }: DSPProfileProps) {
  const [activeTab, setActiveTab] = useState<"Activity" | "Shifts" | "Profile">("Activity");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showRequestDocument, setShowRequestDocument] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [currentDsp, setCurrentDsp] = useState<DSP>(dsp);
  const { toast } = useToast();
  const { user } = useAuth();
  const messaging = useMessaging();

  const navigate = useNavigate();
  const { shifts, isLoading: detailsLoading } = useDSPDetails(dsp.id);
  const { updateStatus } = useUpdateDSPStatus();

  const [totalCount, setTotalCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [trainingsLoading, setTrainingsLoading] = useState(false);
  
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [alertingDocId, setAlertingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (dsp.id) {
      fetchDocuments();
      fetchTrainings();
    }
  }, [dsp.id]);

  const fetchTrainings = async () => {
    try {
      setTrainingsLoading(true);
      const trainings = await getEmployeeTrainings(dsp.id, user?.agencyId);
      setTotalCount(trainings.length);
      setCompletedCount(trainings.filter((t) => t.status === 'completed').length);
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
      setTotalCount(0);
      setCompletedCount(0);
    } finally {
      setTrainingsLoading(false);
    }
  };

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
        return 'bg-green-100 text-green-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'expiring-soon':
        return 'bg-orange-100 text-orange-700';
      case 'unavailable':
        return 'bg-gray-200 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-700';
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

  const getDocumentActionButton = (status: string, doc?: EmployeeDocument) => {
    if ((status === 'expired' || status === 'expiring-soon') && doc) {
      const isLoading = alertingDocId === doc.id;
      return (
        <button
          onClick={() => handleSendDocumentAlert(doc)}
          disabled={isLoading}
          className="px-4 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send Alert'}
        </button>
      );
    }
    return null;
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

  return (
    <div className="  p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-4"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Directory</span>
      </button>

      {/* Profile Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-24 w-24 border-2 border-gray-200">
            <AvatarImage src={currentDsp.profilePicture} alt={currentDsp.fullName} />
            <AvatarFallback className="bg-gray-200 text-gray-700 text-lg font-medium">
              {getInitials(currentDsp.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{currentDsp.fullName}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                currentDsp.status === "active" 
                  ? "bg-green-100 text-green-700" 
                  : "bg-gray-200 text-gray-700"
              }`}>
                {currentDsp.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{currentDsp.role} · {currentDsp.age} yrs old</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleOpenChat}
                disabled={isOpeningChat}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-full hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-4 h-4" />
                {isOpeningChat ? "Opening..." : "Chat"}
              </button>
              <button
                onClick={() => setShowEditProfile(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-full hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("Activity")}
            className={`px-6 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
              activeTab === "Activity"
                ? "bg-teal-500 text-white border-teal-500"
                : "text-gray-600 border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab("Shifts")}
            className={`px-6 py-2 rounded-full border text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "Shifts"
                ? "bg-teal-500 text-white border-teal-500"
                : "text-gray-600 border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
            }`}
          >
            Shifts
          </button>
          <button
            onClick={() => setActiveTab("Profile")}
            className={`px-6 py-2 rounded-full text-sm border font-medium transition-colors cursor-pointer ${
              activeTab === "Profile"
                ? "bg-teal-500 text-white border-teal-500"
                : "text-gray-600 border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
            }`}
          >
            Profile
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "Activity" && (
        <ActivityTab
          dspId={currentDsp.id}
          dspName={currentDsp.fullName}
          shifts={shifts}
          detailsLoading={detailsLoading}
          trainingsLoading={trainingsLoading}
          documentsLoading={documentsLoading}
          totalCount={totalCount}
          completedCount={completedCount}
          documents={documents}
          onRequestDocument={handleRequestDocument}
          getDocumentStatusColor={getDocumentStatusColor}
          getDocumentActionButton={getDocumentActionButton}
        />
      )}

      {activeTab === "Shifts" && (
        <ShiftsTab
          shifts={shifts}
          isLoading={detailsLoading}
          getInitials={getInitials}
          agencyId={user?.agencyId ?? ""}
          dspId={currentDsp.id}
        />
      )}

      {activeTab === "Profile" && (
        <ProfileTab
          dsp={currentDsp}
          onDeactivate={handleDeactivateUser}
          onActivate={handleActivateUser}
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
        onRequested={fetchDocuments}
      />
    </div>
  );
}
