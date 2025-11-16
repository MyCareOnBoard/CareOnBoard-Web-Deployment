import React from "react";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";
import { useVoiceRecording } from "@/contexts/VoiceRecordingContext";

interface VoiceInputButtonProps {
  onClick?: () => void;
  className?: string;
}

// Waveform animation component
function WaveformIcon() {
  return (
    <>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 8px; }
          50% { height: 32px; }
        }
        .animate-wave {
          animation: wave 1.2s ease-in-out infinite;
        }
      `}</style>
      <div className="flex items-center gap-[3px] h-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-[#00b4b8] rounded-full animate-wave"
            style={{
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

export default function VoiceInputButton({ onClick, className = "" }: VoiceInputButtonProps) {
  const { isRecording, activeFieldName, activePageTitle, toggleRecording, stopRecording } = useVoiceRecording();

  const handleClick = () => {
    toggleRecording();
    onClick?.();
  };

  const handleStop = () => {
    stopRecording();
  };

  // Don't render anything if not recording
  if (!isRecording) {
    return null;
  }

  const displayTitle = activePageTitle && activeFieldName 
    ? `${activePageTitle} - ${activeFieldName}`
    : activeFieldName || activePageTitle || "Care AI is hearing you";

  return (
    <div className={`fixed bottom-8 right-8 ${className}`}>
      {/* Recording status card */}
      <div className="bg-white rounded-[10px] shadow-lg px-6 py-4 flex items-center gap-4 animate-fade-in max-w-[600px]">
        {/* Waveform */}
        <WaveformIcon />
        
        {/* Text content */}
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="text-[16px] font-semibold leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif] truncate">
            {displayTitle}
          </h3>
          <p className="text-[12px] font-normal leading-[1.4] text-[#808081] font-['Urbanist',sans-serif]">
            Please wait while AI transforms your text into life like speech
          </p>
        </div>
        
        {/* Refresh/Stop button */}
        <button
          onClick={handleStop}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Stop recording"
          title="Stop recording"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15.5 4.5L4.5 15.5M4.5 4.5L15.5 15.5"
              stroke="#10141a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Microphone button */}
        <div className="relative ml-2">
          {/* Outer ellipse layer - largest */}
          <div className="absolute left-[-26px] top-[-26px] w-[108px] h-[108px] rounded-full bg-[#00b4b8] opacity-20 animate-pulse" />
          
          {/* Middle ellipse layer */}
          <div className="absolute left-[-15.5px] top-[-15.5px] w-[87px] h-[87px] rounded-full bg-[#00b4b8] opacity-30 animate-pulse" />
          
          {/* Main button */}
          <button
            onClick={handleClick}
            className="relative bg-[#00b4b8] border border-[rgba(0,0,0,0.12)] rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-[#009da1] transition-colors z-50 animate-pulse"
            aria-label="Stop voice input"
            title="Stop voice input"
          >
            <MicrophoneIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

