import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";
import { useVoiceRecording } from "@/contexts/VoiceRecordingContext";

interface VoiceEnabledTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  fieldName?: string;
  pageTitle?: string;
  disabled?: boolean;
}

const VoiceEnabledTextarea: React.FC<VoiceEnabledTextareaProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "",
  fieldName,
  pageTitle,
  disabled = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { startRecording } = useVoiceRecording();

  const handleMicrophoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startRecording(
      fieldName, 
      pageTitle,
      undefined, // onTranscript - not needed during recording
      (transcript) => {
        // onAccept - only called when Accept button is clicked
        // Update the textarea value with the transcribed text
        onChange(transcript);
      }
    );
  };

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isHovered && (
        <button
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

