import React, { useEffect, useRef, useState, useCallback } from "react";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";
import { useVoiceRecording } from "@/contexts/VoiceRecordingContext";
import AssemblyAITranscription from "@/components/transcription/AssemblyAITranscription";
import {
  shouldTranslateToEnglish,
  translateToEnglish,
} from "@/lib/translation";
import { useToast } from "@/hooks/use-toast";
import {
  buildTranscriptFromBaseline,
  joinCommittedSegments,
} from "@/lib/voiceTranscriptText";

interface VoiceInputButtonProps {
  minimal?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onClick?: () => void;
  onAccept?: (transcript: string, languageCode: string | null) => void;
  className?: string;
}

function WaveformIcon({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex h-8 items-center gap-[3px]">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-300 ${
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

export default function VoiceInputButton({
  minimal = true,
  textareaRef,
  onClick,
  onAccept,
  className = "",
}: VoiceInputButtonProps) {
  const { toast } = useToast();
  const {
    isRecording,
    partialTranscript,
    committedTranscripts,
    detectedLanguage,
    activeTarget,
    setPartialTranscript,
    addCommittedTranscript,
    setDetectedLanguage,
    stopRecording,
    getOnAcceptCallback,
    setRecordingUi,
    registerSessionHandlers,
    clearSessionHandlers,
    lastAppliedCommittedIndexRef,
  } = useVoiceRecording();

  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [draftTranscript, setDraftTranscript] = useState("");
  const partialStorageRef = useRef("");

  const resolveTextarea = useCallback((): HTMLTextAreaElement | null => {
    if (textareaRef?.current) return textareaRef.current;
    if (activeTarget?.ref.current) return activeTarget.ref.current;
    return null;
  }, [textareaRef, activeTarget]);

  const getTranscriptValue = useCallback((): string => {
    if (minimal) {
      const el = resolveTextarea();
      if (el) return el.value.trim();
      if (activeTarget) {
        return buildTranscriptFromBaseline(
          activeTarget.baseline,
          committedTranscripts
        ).trim();
      }
      return joinCommittedSegments(committedTranscripts);
    }
    return draftTranscript.trim();
  }, [
    minimal,
    resolveTextarea,
    activeTarget,
    committedTranscripts,
    draftTranscript,
  ]);

  const restoreBaseline = useCallback(() => {
    const baseline = activeTarget?.baseline ?? "";
    if (activeTarget) {
      activeTarget.setValue(baseline);
    }
    const el = resolveTextarea();
    if (el) {
      el.value = baseline;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [activeTarget, resolveTextarea]);

  const handleStop = useCallback(() => {
    if (minimal) {
      restoreBaseline();
    }
    setError(null);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsConnected(false);
    setRecordingUi({
      isConnecting: false,
      isSpeaking: false,
      isConnected: false,
      error: null,
      isTranslating: false,
    });
    stopRecording();
  }, [minimal, restoreBaseline, setRecordingUi, stopRecording]);

  const handleAccept = useCallback(async () => {
    if (isTranslating) return;
    const fullTranscript = getTranscriptValue();
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
      setRecordingUi({
        isConnecting: false,
        isSpeaking: false,
        isConnected: false,
        isTranslating: true,
        error: null,
      });
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
          description:
            err instanceof Error ? err.message : "Using original transcript.",
        });
      } finally {
        setIsTranslating(false);
        setRecordingUi({ isTranslating: false });
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
      setRecordingUi({
        isConnecting: false,
        isSpeaking: false,
        isConnected: false,
        isTranslating: false,
        error: null,
      });
      stopRecording();
    }

    onClick?.();
  }, [
    isTranslating,
    getTranscriptValue,
    getOnAcceptCallback,
    detectedLanguage,
    setPartialTranscript,
    setRecordingUi,
    stopRecording,
    onAccept,
    onClick,
    toast,
  ]);

  useEffect(() => {
    registerSessionHandlers(handleAccept, handleStop);
    return () => clearSessionHandlers();
  }, [registerSessionHandlers, clearSessionHandlers, handleAccept, handleStop]);

  useEffect(() => {
    setRecordingUi({
      isConnecting,
      isSpeaking,
      isConnected,
      error,
      isTranslating,
    });
  }, [
    isConnecting,
    isSpeaking,
    isConnected,
    error,
    isTranslating,
    setRecordingUi,
  ]);

  useEffect(() => {
    if (!isRecording) return;
    lastAppliedCommittedIndexRef.current = 0;
    setDraftTranscript("");
    partialStorageRef.current = "";
  }, [isRecording, lastAppliedCommittedIndexRef]);

  useEffect(() => {
    if (!isRecording || !minimal) return;

    const len = committedTranscripts.length;
    const start = lastAppliedCommittedIndexRef.current;
    if (len <= start) return;
    lastAppliedCommittedIndexRef.current = len;

    const baseline = activeTarget?.baseline ?? "";
    const next = buildTranscriptFromBaseline(baseline, committedTranscripts);

    if (activeTarget) {
      activeTarget.setValue(next);
    }
    const el = resolveTextarea();
    if (el && el.value !== next) {
      el.value = next;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [
    isRecording,
    minimal,
    committedTranscripts,
    activeTarget,
    resolveTextarea,
    lastAppliedCommittedIndexRef,
  ]);

  useEffect(() => {
    if (!isRecording || minimal) return;
    const len = committedTranscripts.length;
    const start = lastAppliedCommittedIndexRef.current;
    if (len <= start) return;
    const newSegments = committedTranscripts.slice(start).join(" ").trim();
    lastAppliedCommittedIndexRef.current = len;
    if (!newSegments) return;
    setDraftTranscript((prev) => (prev ? `${prev} ${newSegments}` : newSegments));
  }, [isRecording, minimal, committedTranscripts, lastAppliedCommittedIndexRef]);

  const handlePartialTranscript = useCallback(
    (text: string) => {
      if (minimal) {
        partialStorageRef.current = text;
        return;
      }
      setPartialTranscript(text);
    },
    [minimal, setPartialTranscript]
  );

  if (!isRecording && !isTranslating) {
    return null;
  }

  const fullTranscript = getTranscriptValue();

  const getLanguageName = (code: string): string => {
    const languageMap: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      pl: "Polish",
      tr: "Turkish",
      ru: "Russian",
      nl: "Dutch",
      cs: "Czech",
      ar: "Arabic",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      hi: "Hindi",
    };
    return languageMap[code] || code.toUpperCase();
  };

  const languageDisplay = detectedLanguage ? getLanguageName(detectedLanguage) : null;
  const partialPreview = minimal ? "" : partialTranscript.trim();
  /** Floating editor only when legacy mode and no inline textarea target is active. */
  const showFloatingCard =
    !minimal && (isRecording || isTranslating) && !activeTarget && !textareaRef;

  return (
    <>
      <AssemblyAITranscription
        isRecording={isRecording}
        onPartialTranscript={handlePartialTranscript}
        onCommittedTranscript={addCommittedTranscript}
        onLanguageDetected={setDetectedLanguage}
        onError={setError}
        onConnecting={setIsConnecting}
        onSpeechDetected={setIsSpeaking}
        onConnectionChange={setIsConnected}
        onStopRecording={stopRecording}
      />

      {showFloatingCard && (
        <div className={`fixed bottom-8 right-8 ${className}`}>
          <div className="bg-white rounded-[10px] shadow-lg p-4 flex flex-col gap-3 animate-fade-in w-[500px]">
            <div className="flex items-center gap-3">
              <WaveformIcon isActive={isSpeaking} />

              <div className="flex-1 min-w-0">
                {isTranslating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#00b4b8] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[13px] font-medium text-[#00b4b8] font-['Urbanist',sans-serif]">
                      Translating…
                    </p>
                  </div>
                ) : isConnecting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#00b4b8] border-t-transparent rounded-full animate-spin" />
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

              {fullTranscript && !error && !isConnecting && (
                <button
                  type="button"
                  onClick={() => void handleAccept()}
                  disabled={isTranslating}
                  className="px-3 py-1.5 bg-[#00b4b8] hover:bg-[#009da1] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                  aria-label={
                    isTranslating ? "Translating transcript" : "Accept transcript"
                  }
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

              <div className="relative shrink-0">
                <div
                  className={`relative bg-[#00b4b8] border border-[rgba(0,0,0,0.12)] rounded-full w-[30px] h-[30px] flex items-center justify-center shadow-lg transition-transform duration-300 ${
                    isSpeaking ? "scale-110" : "scale-100"
                  }`}
                >
                  <MicrophoneIcon className="w-4 h-4 text-white" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleStop}
                disabled={isTranslating}
                className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors shrink-0 cursor-pointer"
                aria-label="Cancel recording"
                title={
                  isTranslating ? "Wait for translation to finish" : "Cancel recording"
                }
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
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
                        placeholder={
                          partialPreview ? "" : "Your transcription will appear here..."
                        }
                        className="absolute inset-0 w-full text-[13px] font-normal leading-[1.6] font-['Urbanist',sans-serif] bg-gray-50 border border-gray-200 rounded-md px-3 py-2 resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-[#00b4b8]/30 focus:border-[#00b4b8] disabled:opacity-70 disabled:cursor-wait"
                        style={{ color: "#10141a" }}
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
      )}
    </>
  );
}
