import React, { useEffect, useRef, useState } from "react";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";
import { useVoiceRecording } from "@/contexts/VoiceRecordingContext";
import ElevenLabsTranscription from "@/components/transcription/ElevenLabsTranscription";
import AssemblyAITranscription from "@/components/transcription/AssemblyAITranscription";
import {
  shouldTranslateToEnglish,
  translateToEnglish,
} from "@/lib/translation";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputButtonProps {
  onClick?: () => void;
  onAccept?: (transcript: string, languageCode: string | null) => void;
  className?: string;
}

// Waveform animation component
function WaveformIcon({ isActive }: { isActive: boolean }) {
  return (
    <>
      <style>{`
        @keyframes wave-active {
          0%, 100% { height: 8px; }
          50% { height: 32px; }
        }
        @keyframes wave-idle {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
        .animate-wave-active {
          animation: wave-active 0.6s ease-in-out infinite;
        }
        .animate-wave-idle {
          animation: wave-idle 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className="flex items-center gap-[3px] h-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${
              isActive 
                ? 'bg-[#00b4b8] animate-wave-active' 
                : 'bg-gray-400 animate-wave-idle'
            }`}
            style={{
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

export default function VoiceInputButton({ onClick, onAccept, className = "" }: VoiceInputButtonProps) {
  const { toast } = useToast();
  const { 
    isRecording, 
    partialTranscript,
    committedTranscripts,
    detectedLanguage,
    setPartialTranscript,
    addCommittedTranscript,
    setDetectedLanguage,
    stopRecording,
    getOnAcceptCallback,
  } = useVoiceRecording();

  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [draftTranscript, setDraftTranscript] = useState("");
  const lastAppliedCommittedIndexRef = useRef(0);

  useEffect(() => {
    if (!isRecording) return;
    lastAppliedCommittedIndexRef.current = 0;
    setDraftTranscript("");
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;
    const len = committedTranscripts.length;
    const start = lastAppliedCommittedIndexRef.current;
    if (len <= start) return;
    const newSegments = committedTranscripts.slice(start).join(" ").trim();
    lastAppliedCommittedIndexRef.current = len;
    if (!newSegments) return;
    setDraftTranscript((prev) => (prev ? `${prev} ${newSegments}` : newSegments));
  }, [isRecording, committedTranscripts]);

  const handleStop = () => {
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsConnected(false);
    stopRecording();
  };

  const handleAccept = async () => {
    if (isTranslating) return;
    const fullTranscript = draftTranscript.trim();
    if (!fullTranscript) return;

    const contextOnAccept = getOnAcceptCallback();
    const languageSnapshot = detectedLanguage;
    const needsTranslation = shouldTranslateToEnglish(languageSnapshot);

    if (needsTranslation) {
      setIsTranslating(true);
      setIsConnecting(false);
      setIsSpeaking(false);
      setIsConnected(false);
      setPartialTranscript("");
      stopRecording();
    }

    let finalText = fullTranscript;
    if (needsTranslation) {
      try {
        finalText = await translateToEnglish(fullTranscript, languageSnapshot);
      } catch (err) {
        finalText = fullTranscript;
        toast({
          variant: "destructive",
          title: "Translation failed",
          description: err instanceof Error ? err.message : "Using original transcript.",
        });
      } finally {
        setIsTranslating(false);
      }
    }

    if (contextOnAccept && finalText) {
      contextOnAccept(finalText);
    }

    if (onAccept && finalText) {
      onAccept(finalText, languageSnapshot);
    }

    if (!needsTranslation) {
      setIsConnecting(false);
      setIsSpeaking(false);
      setIsConnected(false);
      stopRecording();
    }

    onClick?.();
  };

  if (!isRecording && !isTranslating) {
    return null;
  }

  const fullTranscript = draftTranscript.trim();

  // Format language code for display (e.g., "en" -> "English")
  const getLanguageName = (code: string): string => {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pl': 'Polish',
      'tr': 'Turkish',
      'ru': 'Russian',
      'nl': 'Dutch',
      'cs': 'Czech',
      'ar': 'Arabic',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'hi': 'Hindi',
    };
    return languageMap[code] || code.toUpperCase();
  };

  const languageDisplay = detectedLanguage ? getLanguageName(detectedLanguage) : null;
  const partialPreview = partialTranscript.trim();

  return (
    <>
      {/* ElevenLabs realtime STT */}
      <AssemblyAITranscription
        isRecording={isRecording}
        onPartialTranscript={setPartialTranscript}
        onCommittedTranscript={addCommittedTranscript}
        onLanguageDetected={setDetectedLanguage}
        onError={setError}
        onConnecting={setIsConnecting}
        onSpeechDetected={setIsSpeaking}
        onConnectionChange={setIsConnected}
        onStopRecording={stopRecording}
      />

      <div className={`fixed bottom-8 right-8 ${className}`}>
        {/* Recording status card */}
        <div className="bg-white rounded-[10px] shadow-lg p-4 flex flex-col gap-3 animate-fade-in w-[500px]">
          {/* Header: Language, Waveform, and Controls */}
          <div className="flex items-center gap-3">
            {/* Waveform */}
            <WaveformIcon isActive={isSpeaking} />
            
            {/* Language or Status */}
            <div className="flex-1 min-w-0">
              {isTranslating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#00b4b8] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[13px] font-medium text-[#00b4b8] font-['Urbanist',sans-serif]">
                    Translating…
                  </p>
                </div>
              ) : isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#00b4b8] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[13px] font-medium text-[#00b4b8] font-['Urbanist',sans-serif]">
                    Getting token and connecting...
                  </p>
                </div>
              ) : languageDisplay ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[#808081] font-['Urbanist',sans-serif] uppercase tracking-wide">
                    Language:
                  </span>
                  <span className="text-[12px] font-semibold text-[#00b4b8] font-['Urbanist',sans-serif]">
                    {languageDisplay}
                  </span>
                </div>
              ) : (
                <p className="text-[12px] text-[#808081] font-['Urbanist',sans-serif]">
                  {isConnected ? "Listening..." : "Connecting..."}
                </p>
              )}
            </div>

            {/* Accept button - show when we have transcript and not connecting */}
            {fullTranscript && !error && !isConnecting && (
              <button
                type="button"
                onClick={() => void handleAccept()}
                disabled={isTranslating}
                className="px-3 py-1.5 bg-[#00b4b8] hover:bg-[#009da1] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                aria-label={isTranslating ? "Translating transcript" : "Accept transcript"}
                title={isTranslating ? "Translating…" : "Accept transcript"}
              >
                {isTranslating ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    Translating…
                  </>
                ) : (
                  "Accept"
                )}
              </button>
            )}

            {/* Microphone indicator */}
            <div className="relative shrink-0">
              <div 
                className={`relative bg-[#00b4b8] border border-[rgba(0,0,0,0.12)] rounded-full w-[30px] h-[30px] flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isSpeaking ? 'scale-110' : 'scale-100'
                }`}
              >
                <MicrophoneIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            
            {/* Stop button */}
            <button
              type="button"
              onClick={handleStop}
              disabled={isTranslating}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors shrink-0 cursor-pointer"
              aria-label="Cancel recording"
              title={isTranslating ? "Wait for translation to finish" : "Cancel recording"}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M15.5 4.5L4.5 15.5M4.5 4.5L15.5 15.5"
                  stroke="#10141a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Transcript Textarea - Full Width */}
          {!isConnecting && (
            <>
              {error ? (
                <p className="text-[12px] font-normal text-red-500 font-['Urbanist',sans-serif] px-1">
                  {error}
                </p>
              ) : draftTranscript || partialPreview ? (
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="relative h-[140px]">
                    <textarea
                      value={draftTranscript}
                      onChange={(e) => setDraftTranscript(e.target.value)}
                      disabled={isTranslating}
                      placeholder={partialPreview ? "" : "Your transcription will appear here..."}
                      className="absolute inset-0 w-full text-[13px] font-normal leading-[1.6] font-['Urbanist',sans-serif] bg-gray-50 border border-gray-200 rounded-md px-3 py-2 resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-[#00b4b8]/30 focus:border-[#00b4b8] disabled:opacity-70 disabled:cursor-wait"
                      style={{
                        color: "#10141a",
                      }}
                      aria-label="Transcript, editable"
                    />
                    {partialPreview ? (
                      <div
                        className="pointer-events-none absolute inset-0 px-3 py-2 text-[13px] font-normal leading-[1.6] font-['Urbanist',sans-serif] whitespace-pre-wrap break-words overflow-hidden"
                        aria-hidden="true"
                      >
                        {draftTranscript ? (
                          <>
                            <span className="invisible">{draftTranscript} </span>
                            <span className="text-[#808081]/60">{partialPreview}</span>
                          </>
                        ) : (
                          <span className="text-[#808081]/60">{partialPreview}</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {partialPreview ? (
                    <p
                      className="text-[11px] font-normal text-[#808081] font-['Urbanist',sans-serif] px-1 overflow-hidden text-ellipsis whitespace-nowrap"
                      title={partialPreview}
                      aria-live="polite"
                    >
                      Listening...
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="w-full h-[140px] bg-gray-50 border border-gray-200 rounded-md px-3 py-2 flex items-center justify-center">
                  <p className="text-[12px] text-[#808081] font-['Urbanist',sans-serif]">
                    Speak now...
                  </p>
                </div>
              )}
            </>
          )}
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
    </>
  );
}
