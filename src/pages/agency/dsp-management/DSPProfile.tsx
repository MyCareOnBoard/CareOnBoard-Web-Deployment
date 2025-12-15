import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { DSP } from "./types";
import { useDSPDetails, useDSPTrainings, useUpdateDSPStatus } from "./useDSPManagement";
import { listEmployeeDocuments, EmployeeDocument, requestEmployeeDocument } from "@/lib/api/employee-documents";
import { useToast } from "@/hooks/use-toast";
import { ActivityTab } from "./components/ActivityTab";
import { ShiftsTab } from "./components/ShiftsTab";
import { ProfileTab } from "./components/ProfileTab";

interface DSPProfileProps {
  dsp: DSP;
  onBack: () => void;
  onChatClick: () => void;
}

export function DSPProfile({ dsp, onBack, onChatClick }: DSPProfileProps) {
  const [activeTab, setActiveTab] = useState<"Activity" | "Shifts" | "Profile">("Activity");
  const { toast } = useToast();

  const { shifts, isLoading: detailsLoading } = useDSPDetails(dsp.id);
  const { completedCount, totalCount, isLoading: trainingsLoading } = useDSPTrainings(dsp.id);
  const { updateStatus } = useUpdateDSPStatus();
  
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useEffect(() => {
    if (dsp.id) {
      fetchDocuments();
    }
  }, [dsp.id]);

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const docs = await listEmployeeDocuments(dsp.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleRequestDocument = async () => {
    try {
      await requestEmployeeDocument(dsp.id, 'general', 'Please upload required documents');
      toast({
        title: "Document Request Sent",
        description: `A document request has been sent to ${dsp.fullName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send document request",
        variant: "destructive",
      });
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'expiring-soon':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDocumentActionButton = (status: string) => {
    if (status === 'expired' || status === 'expiring-soon') {
      return (
        <button className="px-4 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors cursor-pointer">
          Send Alert
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
    try {
      await updateStatus(dsp.id, "inactive");
    } catch (error) {
      console.error("Failed to deactivate user:", error);
    }
  };

  const handleActivateUser = async () => {
    try {
      await updateStatus(dsp.id, "active");
    } catch (error) {
      console.error("Failed to activate user:", error);
    }
  };

  return (
    <div className="  p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Directory</span>
      </button>

      {/* Profile Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-24 w-24 border-2 border-gray-200">
            <AvatarImage src={dsp.profilePicture} alt={dsp.fullName} />
            <AvatarFallback className="bg-gray-200 text-gray-700 text-lg font-medium">
              {getInitials(dsp.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{dsp.fullName}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                dsp.status === "active" 
                  ? "bg-green-100 text-green-700" 
                  : "bg-gray-200 text-gray-700"
              }`}>
                {dsp.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{dsp.role} · {dsp.age} yrs old</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={onChatClick}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-full hover:bg-gray-800 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-full hover:bg-gray-50 transition-colors"
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
            className={`px-6 py-2 rounded-full text-sm font-medium border transition-colors ${
              activeTab === "Activity"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab("Shifts")}
            className={`px-6 py-2 rounded-full border text-sm font-medium transition-colors ${
              activeTab === "Shifts"
                ? "bg-gray-900 text-white"
                : " text-gray-600 hover:bg-gray-100"
            }`}
          >
            Shifts
          </button>
          <button
            onClick={() => setActiveTab("Profile")}
            className={`px-6 py-2 rounded-full text-sm border font-medium transition-colors ${
              activeTab === "Profile"
                ? "bg-gray-900 text-white"
                : " text-gray-600 hover:bg-gray-100"
            }`}
          >
            Profile
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "Activity" && (
        <ActivityTab
          dspId={dsp.id}
          dspName={dsp.fullName}
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
          shifts={shifts.map(shift => ({
            id: shift.id,
            employeeId: shift.employee?.id || '',
            clientId: shift.client?.id || '',
            clientName: shift.client ? `${shift.client.firstName || ''} ${shift.client.lastName || ''}`.trim() || 'Unknown Client' : 'Unknown Client',
            clientImage: shift.client?.profileImage,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime || '',
            location: shift.location,
            duration: shift.sessionDuration || '',
            status: shift.status,
            clockedInAt: shift.clockedInAt,
            clockedOutAt: shift.clockedOutAt,
          }))}
          isLoading={detailsLoading}
          getInitials={getInitials}
        />
      )}

      {activeTab === "Profile" && (
        <ProfileTab
          dsp={dsp}
          onDeactivate={handleDeactivateUser}
          onActivate={handleActivateUser}
        />
      )}
    </div>
  );
}
