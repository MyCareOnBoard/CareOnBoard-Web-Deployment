import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useCallback,
  useMemo,
  type RefObject,
} from "react";

export interface VoiceRecordingUiState {
  isConnecting: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  error: string | null;
  isTranslating: boolean;
}

export interface VoiceActiveTarget {
  fieldKey: string;
  ref: RefObject<HTMLTextAreaElement | null>;
  baseline: string;
  setValue: (value: string) => void;
}

interface VoiceRecordingContextType {
  isRecording: boolean;
  activeFieldName: string | null;
  activePageTitle: string | null;
  activeTarget: VoiceActiveTarget | null;
  partialTranscript: string;
  committedTranscripts: string[];
  detectedLanguage: string | null;
  recordingUi: VoiceRecordingUiState;
  startRecording: (
    fieldName?: string,
    pageTitle?: string,
    onTranscript?: (text: string) => void,
    onAccept?: (text: string) => void
  ) => void;
  stopRecording: () => void;
  toggleRecording: () => void;
  setPartialTranscript: (text: string) => void;
  addCommittedTranscript: (text: string) => void;
  setDetectedLanguage: (language: string) => void;
  clearTranscripts: () => void;
  getOnAcceptCallback: () => ((text: string) => void) | null;
  registerActiveTarget: (target: VoiceActiveTarget) => void;
  clearActiveTarget: () => void;
  setRecordingUi: (patch: Partial<VoiceRecordingUiState>) => void;
  resetRecordingUi: () => void;
  registerSessionHandlers: (
    accept: () => void | Promise<void>,
    cancel: () => void
  ) => void;
  clearSessionHandlers: () => void;
  acceptSession: () => void;
  cancelSession: () => void;
  isActiveField: (fieldKey: string | undefined) => boolean;
  lastAppliedCommittedIndexRef: React.MutableRefObject<number>;
}

const defaultRecordingUi: VoiceRecordingUiState = {
  isConnecting: false,
  isSpeaking: false,
  isConnected: false,
  error: null,
  isTranslating: false,
};

const VoiceRecordingContext = createContext<VoiceRecordingContextType | undefined>(
  undefined
);

interface VoiceRecordingProviderProps {
  children: ReactNode;
  pageTitle?: string;
}

export function VoiceRecordingProvider({ children, pageTitle }: VoiceRecordingProviderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [activeFieldName, setActiveFieldName] = useState<string | null>(null);
  const [activePageTitle, setActivePageTitle] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<VoiceActiveTarget | null>(null);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [committedTranscripts, setCommittedTranscripts] = useState<string[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [recordingUi, setRecordingUiState] = useState<VoiceRecordingUiState>(
    defaultRecordingUi
  );

  const onTranscriptCallback = useRef<((text: string) => void) | null>(null);
  const onAcceptCallback = useRef<((text: string) => void) | null>(null);
  const acceptSessionRef = useRef<(() => void | Promise<void>) | null>(null);
  const cancelSessionRef = useRef<(() => void) | null>(null);
  const activeTargetRef = useRef<VoiceActiveTarget | null>(null);
  const lastAppliedCommittedIndexRef = useRef(0);

  const resetRecordingUi = useCallback(() => {
    setRecordingUiState(defaultRecordingUi);
  }, []);

  const setRecordingUi = useCallback((patch: Partial<VoiceRecordingUiState>) => {
    setRecordingUiState((prev) => ({ ...prev, ...patch }));
  }, []);

  const registerActiveTarget = useCallback((target: VoiceActiveTarget) => {
    activeTargetRef.current = target;
    setActiveTarget(target);
  }, []);

  const clearActiveTarget = useCallback(() => {
    activeTargetRef.current = null;
    setActiveTarget(null);
  }, []);

  const registerSessionHandlers = useCallback(
    (accept: () => void | Promise<void>, cancel: () => void) => {
      acceptSessionRef.current = accept;
      cancelSessionRef.current = cancel;
    },
    []
  );

  const clearSessionHandlers = useCallback(() => {
    acceptSessionRef.current = null;
    cancelSessionRef.current = null;
  }, []);

  const acceptSession = useCallback(() => {
    void acceptSessionRef.current?.();
  }, []);

  const cancelSession = useCallback(() => {
    cancelSessionRef.current?.();
  }, []);

  const isActiveField = useCallback(
    (fieldKey: string | undefined) => {
      if (!isRecording || !fieldKey) return false;
      const target = activeTargetRef.current;
      return (
        target?.fieldKey === fieldKey ||
        activeTarget?.fieldKey === fieldKey ||
        activeFieldName === fieldKey
      );
    },
    [isRecording, activeTarget, activeFieldName]
  );

  const startRecording = useCallback(
    (
      fieldName?: string,
      recordingPageTitle?: string,
      onTranscript?: (text: string) => void,
      onAccept?: (text: string) => void
    ) => {
      lastAppliedCommittedIndexRef.current = 0;
      setIsRecording(true);
      setActiveFieldName(fieldName || null);
      setActivePageTitle(recordingPageTitle || pageTitle || null);
      onTranscriptCallback.current = onTranscript || null;
      onAcceptCallback.current = onAccept || null;
      setPartialTranscript("");
      setCommittedTranscripts([]);
      setDetectedLanguage(null);
      resetRecordingUi();
    },
    [pageTitle, resetRecordingUi]
  );

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setActiveFieldName(null);
    setActivePageTitle(null);
    onTranscriptCallback.current = null;
    onAcceptCallback.current = null;
    clearActiveTarget();
    clearSessionHandlers();
    resetRecordingUi();
    lastAppliedCommittedIndexRef.current = 0;
  }, [clearActiveTarget, clearSessionHandlers, resetRecordingUi]);

  const toggleRecording = useCallback(() => setIsRecording((prev) => !prev), []);

  const addCommittedTranscript = useCallback((text: string) => {
    if (!text.trim()) return;
    setCommittedTranscripts((prev) => [...prev, text]);
    setPartialTranscript("");
    if (onTranscriptCallback.current) {
      onTranscriptCallback.current(text);
    }
  }, []);

  const clearTranscripts = useCallback(() => {
    setPartialTranscript("");
    setCommittedTranscripts([]);
    setDetectedLanguage(null);
    lastAppliedCommittedIndexRef.current = 0;
  }, []);

  const getOnAcceptCallback = useCallback(() => onAcceptCallback.current, []);

  const value = useMemo(
    () => ({
      isRecording,
      activeFieldName,
      activePageTitle,
      activeTarget,
      partialTranscript,
      committedTranscripts,
      detectedLanguage,
      recordingUi,
      startRecording,
      stopRecording,
      toggleRecording,
      setPartialTranscript,
      addCommittedTranscript,
      setDetectedLanguage,
      clearTranscripts,
      getOnAcceptCallback,
      registerActiveTarget,
      clearActiveTarget,
      setRecordingUi,
      resetRecordingUi,
      registerSessionHandlers,
      clearSessionHandlers,
      acceptSession,
      cancelSession,
      isActiveField,
      lastAppliedCommittedIndexRef,
    }),
    [
      isRecording,
      activeFieldName,
      activePageTitle,
      activeTarget,
      partialTranscript,
      committedTranscripts,
      detectedLanguage,
      recordingUi,
      startRecording,
      stopRecording,
      toggleRecording,
      addCommittedTranscript,
      clearTranscripts,
      getOnAcceptCallback,
      registerActiveTarget,
      clearActiveTarget,
      setRecordingUi,
      resetRecordingUi,
      registerSessionHandlers,
      clearSessionHandlers,
      acceptSession,
      cancelSession,
      isActiveField,
    ]
  );

  return (
    <VoiceRecordingContext.Provider value={value}>
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

/** Accept / cancel actions wired by VoiceInputButton for inline pill controls. */
export function useVoiceSessionActions() {
  const { acceptSession, cancelSession, recordingUi, isRecording } = useVoiceRecording();
  return {
    acceptSession,
    cancelSession,
    recordingUi,
    isRecording,
  };
}
