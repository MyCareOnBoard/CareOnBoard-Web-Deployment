import React, { useState, useRef, useEffect } from "react";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";
import { useVoiceRecording } from "@/contexts/VoiceRecordingContext";

interface ContentEditableCellProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  fieldName?: string;
  pageTitle?: string;
}

const ContentEditableCell: React.FC<ContentEditableCellProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "",
  fieldName,
  pageTitle,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { startRecording } = useVoiceRecording();
  const contentRef = useRef<HTMLDivElement>(null);

  // Only update the DOM when value changes externally (not from user typing)
  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== value) {
      contentRef.current.textContent = value;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.textContent || "");
  };

  const handleMicrophoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startRecording(
      fieldName, 
      pageTitle,
      undefined, // onTranscript - not needed during recording
      (transcript) => {
        // onAccept - only called when Accept button is clicked
        // Update the cell value with the transcribed text
        onChange(transcript);
        
        // Also update the DOM directly to ensure it displays
        if (contentRef.current) {
          contentRef.current.textContent = transcript;
        }
      }
    );
  };

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className={`w-full min-h-[71px] border-0 bg-transparent text-center focus:outline-none text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif] py-6 ${className}`}
        data-placeholder={placeholder}
      />
      {isHovered && (
        <button
          className="absolute bottom-2 right-2 bg-[#00b4b8] border border-[rgba(0,0,0,0.12)] rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-[#009da1] transition-colors z-10 cursor-pointer"
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

export default ContentEditableCell;

