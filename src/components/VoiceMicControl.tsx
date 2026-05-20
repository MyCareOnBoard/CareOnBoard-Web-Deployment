import React, { memo } from "react";
import { Check, X } from "lucide-react";

interface WaveformIconProps {
  isActive: boolean;
  compact?: boolean;
}

function WaveformIcon({ isActive, compact = true }: WaveformIconProps) {
  const barClass = compact ? "w-[3px]" : "w-1";
  const heightClass = compact ? "h-5" : "h-8";

  return (
    <div className={`flex items-center gap-[2px] ${heightClass}`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`${barClass} rounded-full transition-colors duration-300 ${
            isActive
              ? "bg-[#00b4b8] animate-voice-wave-active"
              : "bg-gray-400 animate-voice-wave-idle"
          }`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export interface VoiceMicControlProps {
  isConnecting: boolean;
  isSpeaking: boolean;
  isTranslating: boolean;
  canAccept: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

function VoiceMicControl({
  isConnecting,
  isSpeaking,
  isTranslating,
  canAccept,
  onAccept,
  onCancel,
}: VoiceMicControlProps) {
  const showWaveform = !isConnecting && !isTranslating;

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-1.5 py-1 shadow-md animate-voice-pill-in motion-reduce:animate-none"
      role="group"
      aria-label="Voice recording controls"
    >
      {isConnecting || isTranslating ? (
        <div className="flex h-8 w-10 items-center justify-center">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-[#00b4b8] border-t-transparent motion-reduce:animate-none"
            aria-hidden
          />
        </div>
      ) : (
        <div className="flex h-8 w-10 items-center justify-center px-0.5">
          <WaveformIcon isActive={isSpeaking} />
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        disabled={isTranslating}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#10141a] transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        aria-label={isTranslating ? "Wait for translation" : "Cancel recording"}
        title={isTranslating ? "Wait for translation" : "Cancel recording"}
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={onAccept}
        disabled={!canAccept || isTranslating || isConnecting}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00b4b8] text-white transition-colors hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        aria-label={isTranslating ? "Translating" : "Accept transcript"}
        title={isTranslating ? "Translating…" : "Accept transcript"}
      >
        {isTranslating ? (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
}

export default memo(VoiceMicControl);
