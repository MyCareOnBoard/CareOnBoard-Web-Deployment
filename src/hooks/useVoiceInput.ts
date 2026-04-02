/**
 * Hook to simplify voice input integration with form fields
 * 
 * Usage example:
 * 
 * const { startVoiceInput, isRecording } = useVoiceInput({
 *   fieldName: "Description",
 *   onTranscript: (text) => {
 *     setValue('description', text); // For react-hook-form
 *     // or setDescription(text); // For useState
 *   }
 * });
 * 
 * return (
 *   <div>
 *     <textarea value={description} onChange={...} />
 *     <button onClick={startVoiceInput}>
 *       <MicrophoneIcon />
 *     </button>
 *   </div>
 * );
 */

import { useCallback } from 'react';
import { useVoiceRecording } from '@/contexts/VoiceRecordingContext';

interface UseVoiceInputOptions {
  fieldName?: string;
  pageTitle?: string;
  onTranscript?: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
}

export function useVoiceInput({
  fieldName,
  pageTitle,
  onTranscript,
  onStart,
  onStop,
}: UseVoiceInputOptions = {}) {
  const { isRecording, startRecording, stopRecording, committedTranscripts } = useVoiceRecording();

  const startVoiceInput = useCallback(() => {
    startRecording(fieldName, pageTitle, onTranscript);
    onStart?.();
  }, [fieldName, pageTitle, onTranscript, onStart, startRecording]);

  const stopVoiceInput = useCallback(() => {
    stopRecording();
    onStop?.();
  }, [onStop, stopRecording]);

  const toggleVoiceInput = useCallback(() => {
    if (isRecording) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }, [isRecording, startVoiceInput, stopVoiceInput]);

  return {
    isRecording,
    startVoiceInput,
    stopVoiceInput,
    toggleVoiceInput,
    committedTranscripts,
  };
}

