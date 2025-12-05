import { useState } from "react";
import { DSP, ScheduleForm } from "./types";
import { MOCK_DSPS, MOCK_SHIFTS, MOCK_DOCUMENTS } from "./mockData";
import { DSPList } from "./DSPList";
import { DSPProfile } from "./DSPProfile";
import { ChatModal, MessageSentModal } from "./ChatModal";
import { ScheduleModal, ScheduleSuccessModal } from "./ScheduleModal";

export default function DSPManagementPage() {
  const [selectedDsp, setSelectedDsp] = useState<DSP | null>(null);
  const [dsps] = useState<DSP[]>(MOCK_DSPS);
  const [shifts] = useState(MOCK_SHIFTS);
  const [documents] = useState(MOCK_DOCUMENTS);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showMessageSentModal, setShowMessageSentModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showScheduleSuccessModal, setShowScheduleSuccessModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm | null>(null);

  const handleScheduleSuccess = (form: ScheduleForm) => {
    setScheduleForm(form);
    setShowScheduleModal(false);
    setShowScheduleSuccessModal(true);
    setTimeout(() => {
      setShowScheduleSuccessModal(false);
    }, 3000);
  };

  const handleChatSuccess = () => {
    setShowMessageSentModal(true);
    setTimeout(() => setShowMessageSentModal(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">DSP Management</h1>
          {selectedDsp && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#00B4B8] text-white text-sm font-medium rounded-full hover:bg-[#00A0A4] transition-colors"
            >
              <span className="text-lg">+</span>
              Add new Schedule
            </button>
          )}
        </div>

        {/* DSP List or Profile */}
        {!selectedDsp ? (
          <DSPList dsps={dsps} onSelectDsp={setSelectedDsp} />
        ) : (
          <DSPProfile
            dsp={selectedDsp}
            shifts={shifts}
            documents={documents}
            onBack={() => setSelectedDsp(null)}
            onChatClick={() => setShowChatModal(true)}
          />
        )}
      </div>

      {/* Modals */}
      {selectedDsp && (
        <>
          <ChatModal
            dsp={selectedDsp}
            isOpen={showChatModal}
            onClose={() => setShowChatModal(false)}
            onSuccess={handleChatSuccess}
          />

          <MessageSentModal
            dspName={selectedDsp.fullName}
            isOpen={showMessageSentModal}
            onClose={() => setShowMessageSentModal(false)}
          />

          <ScheduleModal
            dsp={selectedDsp}
            isOpen={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
            onSuccess={handleScheduleSuccess}
          />

          <ScheduleSuccessModal
            clientName={scheduleForm?.client?.name || ""}
            isOpen={showScheduleSuccessModal}
            onClose={() => setShowScheduleSuccessModal(false)}
          />
        </>
      )}
    </div>
  );
}
