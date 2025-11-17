import React, { useEffect, useRef, useState } from "react";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";
import { useVoiceRecording } from "@/contexts/VoiceRecordingContext";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { getScribeToken } from "@/lib/api/elevenlabs";

interface VoiceInputButtonProps {
  onClick?: () => void;
  onAccept?: (transcript: string, languageCode: string | null) => void;
  className?: string;
}

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
  const { 
    isRecording, 
    activeFieldName, 
    activePageTitle, 
    partialTranscript,
    committedTranscripts,
    detectedLanguage,
    setPartialTranscript,
    addCommittedTranscript,
    setDetectedLanguage,
    stopRecording,
    getOnAcceptCallback
  } = useVoiceRecording();

  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasConnected = useRef(false);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      setPartialTranscript(data.text);
      
      if (data.text && data.text.trim().length > 0) {
        setIsSpeaking(true);
        
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        speechTimeoutRef.current = setTimeout(() => {
          setIsSpeaking(false);
        }, 500);
      }
    },
    onCommittedTranscript: (data: any) => {

      addCommittedTranscript(data.text);
      if (data.language_code) {
        setDetectedLanguage(data.language_code);
      }
    },
    onError: (error) => {
      console.error("Scribe error:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during transcription";
      setError(errorMessage);
    },
  });

  useEffect(() => {
    const connectToMicrophone = async () => {
      if (isRecording && !scribe.isConnected && !hasConnected.current) {
        try {
          hasConnected.current = true;
          setError(null);
          setIsConnecting(true);
          
          const token = await getScribeToken();
          
          await scribe.connect({
            token,
            microphone: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            vadThreshold: 0.5,
            vadSilenceThresholdSecs: 1.0,
            commitStrategy: CommitStrategy.VAD,
          });

          setIsConnecting(false);
        } catch (err) {
          console.error("Failed to connect to Scribe:", err);
          setError(err instanceof Error ? err.message : "Failed to connect to transcription service");
          setIsConnecting(false);
          hasConnected.current = false;
          stopRecording();
        }
      }
    };

    connectToMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (scribe.isConnected) {
        scribe.disconnect();
        hasConnected.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStop = async () => {
    if (scribe.isConnected) {
      await scribe.disconnect();
      hasConnected.current = false;
    }
    
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    
    setIsConnecting(false);
    setIsSpeaking(false);
    stopRecording();
  };

  const handleAccept = async () => {
    const fullTranscript = committedTranscripts.join(' ').trim();
    
    if (scribe.isConnected) {
      try {
        await scribe.disconnect();
        hasConnected.current = false;
      } catch (error) {
        console.error('Error closing scribe connection:', error);
      }
    }
    
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    
    const contextOnAccept = getOnAcceptCallback();
    if (contextOnAccept && fullTranscript) {
      contextOnAccept(fullTranscript);
    }
    
    if (onAccept && fullTranscript) {
      onAccept(fullTranscript, detectedLanguage);
    }
    
    setIsConnecting(false);
    setIsSpeaking(false);
    stopRecording();
    
    onClick?.();
  };

  if (!isRecording) {
    return null;
  }

  const committedText = committedTranscripts.join(' ').trim();
  
  const fullTranscript = committedText;
  
  const displayTranscript = committedText 
    ? (partialTranscript ? `${committedText} ${partialTranscript}` : committedText)
    : partialTranscript;

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

  return (
    <div className={`fixed bottom-8 right-8 ${className}`}>
      <div className="bg-white rounded-[10px] shadow-lg p-4 flex flex-col gap-3 animate-fade-in w-[500px]">
        <div className="flex items-center gap-3">
          <WaveformIcon isActive={isSpeaking} />
          
          <div className="flex-1 min-w-0">
            {isConnecting ? (
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
                {scribe.isConnected ? "Listening..." : "Connecting..."}
              </p>
            )}
          </div>

          {fullTranscript && !error && !isConnecting && (
            <button
              onClick={handleAccept}
              className="px-3 py-1.5 bg-[#00b4b8] hover:bg-[#009da1] text-white text-[12px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap"
              aria-label="Accept transcript"
              title="Accept transcript"
            >
              Accept
            </button>
          )}

          <div className="relative flex-shrink-0">
            <div 
              className={`relative bg-[#00b4b8] border border-[rgba(0,0,0,0.12)] rounded-full w-[30px] h-[30px] flex items-center justify-center shadow-lg transition-all duration-300 ${
                isSpeaking ? 'scale-110' : 'scale-100'
              }`}
            >
              <MicrophoneIcon className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <button
            onClick={handleStop}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Cancel recording"
            title="Cancel recording"
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

        {!isConnecting && (
          <>
            {error ? (
              <p className="text-[12px] font-normal text-red-500 font-['Urbanist',sans-serif] px-1">
                {error}
              </p>
            ) : (committedText || partialTranscript) ? (
              <textarea
                value={committedText || partialTranscript}
                readOnly
                placeholder="Your transcription will appear here..."
                className="w-full text-[13px] font-normal leading-[1.6] font-['Urbanist',sans-serif] bg-gray-50 border border-gray-200 rounded-md px-3 py-2 resize-none h-[140px] overflow-y-auto focus:outline-none"
                style={{
                  color: '#10141a',
                }}
              />
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
  );
}

