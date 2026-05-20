import React, { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";
import {
  useVoiceRecording,
  useVoiceSessionActions,
} from "@/contexts/VoiceRecordingContext";
import VoiceMicControl from "@/components/VoiceMicControl";

interface VoiceEnabledTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  fieldName?: string;
  pageTitle?: string;
  disabled?: boolean;
  /** When set, Accept applies transcribed text via this callback instead of replacing the field with `onChange(transcript)`. */
  onVoiceAccepted?: (transcript: string) => void;
  id?: string;
  rows?: number;
}

const VoiceEnabledTextarea: React.FC<VoiceEnabledTextareaProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "",
  fieldName,
  pageTitle,
  disabled = false,
  onVoiceAccepted,
  id,
  rows,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    startRecording,
    registerActiveTarget,
    isRecording,
    isActiveField,
    committedTranscripts,
  } = useVoiceRecording();
  const { acceptSession, cancelSession, recordingUi } = useVoiceSessionActions();

  const fieldKey = fieldName ?? id ?? "voice-field";
  const isActive = isActiveField(fieldKey);

  const handleMicrophoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRecording && !isActive) return;

    registerActiveTarget({
      fieldKey,
      ref: textareaRef,
      baseline: value,
      setValue: onChange,
    });

    startRecording(
      fieldName,
      pageTitle,
      undefined,
      (transcript) => {
        if (onVoiceAccepted) {
          onVoiceAccepted(transcript);
        } else {
          onChange(transcript);
        }
      }
    );
  };

  const hasCommitted = committedTranscripts.length > 0;
  const canAccept =
    hasCommitted || (isActive && value.trim().length > 0);

  const showMic = (isHovered || isActive) && !disabled && !isActive;
  const showPill = isActive && isRecording;

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
      />
      {showPill && (
        <div className="absolute bottom-4 right-4 z-10">
          <VoiceMicControl
            isConnecting={recordingUi.isConnecting}
            isSpeaking={recordingUi.isSpeaking}
            isTranslating={recordingUi.isTranslating}
            canAccept={canAccept}
            onAccept={acceptSession}
            onCancel={cancelSession}
          />
        </div>
      )}
      {showMic && (
        <button
          type="button"
          className="absolute bottom-4 right-4 bg-[#00b4b8] border border-[rgba(0,0,0,0.12)] rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-[#009da1] transition-colors z-10 cursor-pointer"
          aria-label="Voice input"
          title="Voice input"
          onClick={handleMicrophoneClick}
        >
          <MicrophoneIcon className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  );
};

export default VoiceEnabledTextarea;
