import React, { createContext, useContext, useState, ReactNode, useRef, useCallback } from "react";

interface VoiceRecordingContextType {
  isRecording: boolean;
  activeFieldName: string | null;
  activePageTitle: string | null;
  partialTranscript: string;
  committedTranscripts: string[];
  detectedLanguage: string | null;
  startRecording: (fieldName?: string, pageTitle?: string, onTranscript?: (text: string) => void) => void;
  stopRecording: () => void;
  toggleRecording: () => void;
  setPartialTranscript: (text: string) => void;
  addCommittedTranscript: (text: string) => void;
  setDetectedLanguage: (language: string) => void;
  clearTranscripts: () => void;
}

const VoiceRecordingContext = createContext<VoiceRecordingContextType | undefined>(undefined);

interface VoiceRecordingProviderProps {
  children: ReactNode;
  pageTitle?: string;
}

export function VoiceRecordingProvider({ children, pageTitle }: VoiceRecordingProviderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [activeFieldName, setActiveFieldName] = useState<string | null>(null);
  const [activePageTitle, setActivePageTitle] = useState<string | null>(null);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [committedTranscripts, setCommittedTranscripts] = useState<string[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  
  // Store the callback in a ref so it can be called from the transcription handlers
  const onTranscriptCallback = useRef<((text: string) => void) | null>(null);

  const startRecording = useCallback((fieldName?: string, recordingPageTitle?: string, onTranscript?: (text: string) => void) => {
    setIsRecording(true);
    setActiveFieldName(fieldName || null);
    setActivePageTitle(recordingPageTitle || pageTitle || null);
    onTranscriptCallback.current = onTranscript || null;
    // Clear previous transcripts when starting a new recording
    setPartialTranscript("");
    setCommittedTranscripts([]);
    setDetectedLanguage(null);
  }, [pageTitle]);
  
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setActiveFieldName(null);
    setActivePageTitle(null);
    onTranscriptCallback.current = null;
  }, []);
  
  const toggleRecording = useCallback(() => setIsRecording(prev => !prev), []);

  const addCommittedTranscript = useCallback((text: string) => {
    setCommittedTranscripts(prev => [...prev, text]);
    // Call the callback with the full transcript
    if (onTranscriptCallback.current) {
      onTranscriptCallback.current(text);
    }
  }, []);

  const clearTranscripts = useCallback(() => {
    setPartialTranscript("");
    setCommittedTranscripts([]);
    setDetectedLanguage(null);
  }, []);

  return (
    <VoiceRecordingContext.Provider 
      value={{ 
        isRecording, 
        activeFieldName, 
        activePageTitle, 
        partialTranscript,
        committedTranscripts,
        detectedLanguage,
        startRecording, 
        stopRecording, 
        toggleRecording,
        setPartialTranscript,
        addCommittedTranscript,
        setDetectedLanguage,
        clearTranscripts
      }}
    >
      {children}
    </VoiceRecordingContext.Provider>
  );
}

export function useVoiceRecording() {
  const context = useContext(VoiceRecordingContext);
  if (context === undefined) {
    throw new Error("useVoiceRecording must be used within a VoiceRecordingProvider");
  }
  return context;
}

