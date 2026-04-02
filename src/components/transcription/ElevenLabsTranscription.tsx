/**
 * ElevenLabs Scribe v2 Transcription Component
 * 
 * This component handles all ElevenLabs-specific transcription logic.
 * Can be easily replaced with other transcription services.
 */

import { useEffect, useRef } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { getScribeToken } from "@/lib/api/elevenlabs";

interface ElevenLabsTranscriptionProps {
  isRecording: boolean;
  onPartialTranscript: (text: string) => void;
  onCommittedTranscript: (text: string) => void;
  onLanguageDetected: (languageCode: string) => void;
  onError: (error: string) => void;
  onConnecting: (isConnecting: boolean) => void;
  onSpeechDetected: (isSpeaking: boolean) => void;
  onConnectionChange: (isConnected: boolean) => void;
  onStopRecording: () => void;
}

export default function ElevenLabsTranscription({
  isRecording,
  onPartialTranscript,
  onCommittedTranscript,
  onLanguageDetected,
  onError,
  onConnecting,
  onSpeechDetected,
  onConnectionChange,
  onStopRecording,
}: ElevenLabsTranscriptionProps) {
  const hasConnected = useRef(false);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize ElevenLabs Scribe with language detection
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      onPartialTranscript(data.text);
      
      // Detect speech activity
      if (data.text && data.text.trim().length > 0) {
        onSpeechDetected(true);
        
        // Clear existing timeout
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        
        // Set speaking to false after 500ms of no updates
        speechTimeoutRef.current = setTimeout(() => {
          onSpeechDetected(false);
        }, 500);
      }
    },
    onCommittedTranscript: (data: any) => {
      console.log("Committed transcript:", data);
      onCommittedTranscript(data.text);
      
      // Set detected language if available
      if (data.language_code) {
        onLanguageDetected(data.language_code);
      }
    },
    onError: (error) => {
      console.error("Scribe error:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during transcription";
      onError(errorMessage);
    },
  });

  // Connect to microphone when recording starts
  useEffect(() => {
    const connectToMicrophone = async () => {
      if (isRecording && !scribe.isConnected && !hasConnected.current) {
        try {
          hasConnected.current = true;
          onError("");
          onConnecting(true);
          
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
            vadThreshold: 0.5,
            vadSilenceThresholdSecs: 1.0,
            commitStrategy: CommitStrategy.VAD,
          });
          
          console.log("Connected to ElevenLabs Scribe");
          onConnecting(false);
          onConnectionChange(true);
        } catch (err) {
          console.error("Failed to connect to Scribe:", err);
          onError(err instanceof Error ? err.message : "Failed to connect to transcription service");
          onConnecting(false);
          hasConnected.current = false;
          onStopRecording();
        }
      }
    };

    connectToMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // Disconnect when component unmounts (safety net)
  useEffect(() => {
    return () => {
      if (scribe.isConnected) {
        scribe.disconnect();
        hasConnected.current = false;
      }
      
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose disconnect method via ref or return
  useEffect(() => {
    const disconnect = async () => {
      if (!isRecording && scribe.isConnected) {
        await scribe.disconnect();
        hasConnected.current = false;
        onConnectionChange(false);
        
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
      }
    };
    
    disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // This component doesn't render anything
  return null;
}

