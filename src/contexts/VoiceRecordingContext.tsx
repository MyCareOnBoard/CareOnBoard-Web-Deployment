import React, { createContext, useContext, useState, ReactNode } from "react";

interface VoiceRecordingContextType {
  isRecording: boolean;
  activeFieldName: string | null;
  activePageTitle: string | null;
  startRecording: (fieldName?: string, pageTitle?: string) => void;
  stopRecording: () => void;
  toggleRecording: () => void;
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

  const startRecording = (fieldName?: string, recordingPageTitle?: string) => {
    setIsRecording(true);
    setActiveFieldName(fieldName || null);
    setActivePageTitle(recordingPageTitle || pageTitle || null);
  };
  
  const stopRecording = () => {
    setIsRecording(false);
    setActiveFieldName(null);
    setActivePageTitle(null);
  };
  
  const toggleRecording = () => setIsRecording(prev => !prev);

  return (
    <VoiceRecordingContext.Provider 
      value={{ isRecording, activeFieldName, activePageTitle, startRecording, stopRecording, toggleRecording }}
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

