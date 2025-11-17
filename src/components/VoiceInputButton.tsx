import React, { useEffect, useRef, useState } from "react";
import MicrophoneIcon from "@/assets/icons/microphone.svg?react";
import { useVoiceRecording } from "@/contexts/VoiceRecordingContext";
import { useScribe } from "@elevenlabs/react";
import { getScribeToken } from "@/lib/api/elevenlabs";

interface VoiceInputButtonProps {
  onClick?: () => void;
  onAccept?: (transcript: string, languageCode: string | null) => void;
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
    stopRecording 
  } = useVoiceRecording();

  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const hasConnected = useRef(false);

  // Initialize ElevenLabs Scribe with language detection
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      console.log("Partial transcript:", data.text);
      setPartialTranscript(data.text);
    },
    onCommittedTranscript: (data: any) => {
      console.log("Committed transcript:", data);
      console.log("Committed transcript:", data.text, "Language:", data.language_code);
      addCommittedTranscript(data.text);
      // Set detected language if available
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

  // Connect to microphone when recording starts
  useEffect(() => {
    const connectToMicrophone = async () => {
      if (isRecording && !scribe.isConnected && !hasConnected.current) {
        try {
          hasConnected.current = true;
          setError(null);
          setIsConnecting(true);
          
          // Fetch single-use token from server
          const token = await getScribeToken();
          
          // Connect to ElevenLabs with microphone
          await scribe.connect({
            token,
            microphone: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          
          console.log("Connected to ElevenLabs Scribe");
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
  }, [isRecording, scribe, stopRecording]);

  // Disconnect when recording stops
  useEffect(() => {
    return () => {
      if (scribe.isConnected) {
        scribe.disconnect();
        hasConnected.current = false;
      }
    };
  }, [scribe]);

  const handleStop = async () => {
    if (scribe.isConnected) {
      await scribe.disconnect();
      hasConnected.current = false;
    }
    setIsConnecting(false);
    stopRecording();
  };

  const handleAccept = async () => {
    // Get the full transcript (combine committed transcripts)
    const fullTranscript = committedTranscripts.join(' ').trim();
    
    // Close the scribe connection immediately
    if (scribe.isConnected) {
      try {
        await scribe.disconnect();
        hasConnected.current = false;
        console.log('Scribe connection closed');
      } catch (error) {
        console.error('Error closing scribe connection:', error);
      }
    }
    
    // Call the onAccept callback with the transcript and language code
    if (onAccept && fullTranscript) {
      onAccept(fullTranscript, detectedLanguage);
    }
    
    // Stop recording
    setIsConnecting(false);
    stopRecording();
    
    // Trigger the onClick callback if provided
    onClick?.();
  };

  // Don't render anything if not recording
  if (!isRecording) {
    return null;
  }

  // Get the full transcript (combine committed + partial)
  const fullTranscript = committedTranscripts.length > 0 
    ? committedTranscripts.join(' ') + (partialTranscript ? ` ${partialTranscript}` : '')
    : partialTranscript;

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

  return (
    <div className={`fixed bottom-8 right-8 ${className}`}>
      {/* Recording status card */}
      <div className="bg-white rounded-[10px] shadow-lg px-6 py-4 flex items-center gap-4 animate-fade-in max-w-[700px]">
        {/* Waveform */}
        <WaveformIcon />
        
        {/* Text content */}
        <div className="flex flex-col flex-1 min-w-0 gap-1">
          {/* Loading State */}
          {isConnecting ? (
            <div className="flex items-center gap-2">
              {/* Loading spinner */}
              <div className="w-4 h-4 border-2 border-[#00b4b8] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[13px] font-medium leading-[1.4] text-[#00b4b8] font-['Urbanist',sans-serif]">
                Getting token and connecting...
              </p>
            </div>
          ) : (
            <>
              {/* Detected Language */}
              {languageDisplay && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium leading-[1.4] text-[#808081] font-['Urbanist',sans-serif] uppercase tracking-wide">
                    Detected Language:
                  </span>
                  <span className="text-[12px] font-semibold leading-[1.4] text-[#00b4b8] font-['Urbanist',sans-serif]">
                    {languageDisplay}
                  </span>
                </div>
              )}
              
              {/* Transcript or Status */}
              {error ? (
                <p className="text-[12px] font-normal leading-[1.4] text-red-500 font-['Urbanist',sans-serif]">
                  {error}
                </p>
              ) : fullTranscript ? (
                <p className="text-[13px] font-normal leading-[1.5] text-[#10141a] font-['Urbanist',sans-serif] line-clamp-2">
                  {fullTranscript}
                </p>
              ) : (
                <p className="text-[12px] font-normal leading-[1.4] text-[#808081] font-['Urbanist',sans-serif]">
                  {scribe.isConnected ? "Listening... Speak now" : "Connecting to transcription service..."}
                </p>
              )}
            </>
          )}
        </div>

        {/* Accept button - only show when we have transcript and not connecting */}
        {fullTranscript && !error && !isConnecting && (
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-[#00b4b8] hover:bg-[#009da1] text-white text-[13px] font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            aria-label="Accept transcript"
            title="Accept transcript"
          >
            Accept
          </button>
        )}
        
        {/* Stop button */}
        <button
          onClick={handleStop}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Cancel recording"
          title="Cancel recording"
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

        {/* Microphone indicator */}
        <div className="relative ml-2 flex-shrink-0">
          {/* Outer ellipse layer - largest */}
          <div className="absolute left-[-26px] top-[-26px] w-[108px] h-[108px] rounded-full bg-[#00b4b8] opacity-20 animate-pulse" />
          
          {/* Middle ellipse layer */}
          <div className="absolute left-[-15.5px] top-[-15.5px] w-[87px] h-[87px] rounded-full bg-[#00b4b8] opacity-30 animate-pulse" />
          
          {/* Main button */}
          <div
            className="relative bg-[#00b4b8] border border-[rgba(0,0,0,0.12)] rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-50 animate-pulse"
            aria-label="Recording in progress"
            title="Recording in progress"
          >
            <MicrophoneIcon className="w-6 h-6 text-white" />
          </div>
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

