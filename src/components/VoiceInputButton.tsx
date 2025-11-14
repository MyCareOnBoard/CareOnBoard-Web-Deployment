import React from "react";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";

interface VoiceInputButtonProps {
  onClick?: () => void;
  className?: string;
}

export default function VoiceInputButton({ onClick, className = "" }: VoiceInputButtonProps) {
  return (
    <div className={`fixed bottom-8 right-8 ${className}`}>
      {/* Outer ellipse layer - largest */}
      <div className="absolute left-[-26px] top-[-26px] w-[108px] h-[108px] rounded-full bg-[#00b4b8] opacity-20" />
      
      {/* Middle ellipse layer */}
      <div className="absolute left-[-15.5px] top-[-15.5px] w-[87px] h-[87px] rounded-full bg-[#00b4b8] opacity-30" />
      
      {/* Main button */}
      <button
        onClick={onClick}
        className="relative bg-[#00b4b8] border border-[rgba(0,0,0,0.12)] rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-[#009da1] transition-colors z-50"
        aria-label="Voice input"
        title="Voice input"
      >
        <MicrophoneIcon className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}

