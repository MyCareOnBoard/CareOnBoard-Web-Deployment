/**
 * AssemblyAI Real-time Transcription Component
 *
 * This component handles all AssemblyAI-specific transcription logic using WebSockets.
 * Works in browser environments without Node.js dependencies.
 */

import { useEffect, useRef } from "react";
import { getAssemblyAIToken } from "@/lib/api/assemblyai";

/** Match query param — server emits an unformatted then formatted final per turn; committing both duplicated text in the UI. */
const FORMAT_TURNS = true;

interface AssemblyAITranscriptionProps {
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

export default function AssemblyAITranscription({
  isRecording,
  onPartialTranscript,
  onCommittedTranscript,
  onLanguageDetected,
  onError,
  onConnecting,
  onSpeechDetected,
  onConnectionChange,
  onStopRecording,
}: AssemblyAITranscriptionProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioNode | null>(null);
  const hasConnected = useRef(false);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** One committed segment per server turn — avoids duplicate finals (unformatted + formatted, or retries). */
  const committedTurnOrdersRef = useRef<Set<number>>(new Set());

  const bumpSpeechActivity = () => {
    onSpeechDetected(true);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => onSpeechDetected(false), 500);
  };

  const cleanup = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "Terminate" }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }

    committedTurnOrdersRef.current.clear();
    hasConnected.current = false;
    onConnectionChange(false);
  };

  // Connect to microphone and start transcription
  useEffect(() => {
    const startTranscription = async () => {
      if (isRecording && !hasConnected.current) {
        try {
          hasConnected.current = true;
          committedTurnOrdersRef.current.clear();
          onError("");
          onConnecting(true);

          const token = await getAssemblyAIToken();

          const connectionParams: Record<string, string> = {
            sample_rate: "16000",
            speech_model: "universal-streaming-multilingual",
            language_detection: "true",
            token,
          };
          if (FORMAT_TURNS) {
            connectionParams.format_turns = "true";
          }

          const socket = new WebSocket(
            `wss://streaming.assemblyai.com/v3/ws?${new URLSearchParams(connectionParams)}`
          );

          socketRef.current = socket;

          socket.onopen = async () => {
            onConnecting(false);
            onConnectionChange(true);

            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  channelCount: 1,
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              });

              mediaStreamRef.current = stream;

              const audioContext = new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
                sampleRate: 16000,
              });
              audioContextRef.current = audioContext;

              const source = audioContext.createMediaStreamSource(stream);

              try {
                await audioContext.audioWorklet.addModule("/audio-processor.js");
                const workletNode = new AudioWorkletNode(audioContext, "audio-processor");

                workletNode.port.onmessage = (event: MessageEvent<{ audio_data: ArrayBuffer }>) => {
                  if (socket.readyState === WebSocket.OPEN) {
                    socket.send(event.data.audio_data);
                  }
                };

                source.connect(workletNode);
                workletNode.connect(audioContext.destination);

                processorRef.current = workletNode;
              } catch (workletError) {
                console.warn("AudioWorklet failed, falling back to ScriptProcessor", workletError);
                const processor = audioContext.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                let audioBufferQueue = new Int16Array(0);
                const TARGET_SIZE = 1600;

                processor.onaudioprocess = (e) => {
                  if (socket.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const int16Data = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                      const s = Math.max(-1, Math.min(1, inputData[i]));
                      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                    }

                    const mergedBuffer = new Int16Array(audioBufferQueue.length + int16Data.length);
                    mergedBuffer.set(audioBufferQueue, 0);
                    mergedBuffer.set(int16Data, audioBufferQueue.length);
                    audioBufferQueue = mergedBuffer;

                    if (audioBufferQueue.length >= TARGET_SIZE) {
                      const bufferToSend = new Uint8Array(audioBufferQueue.buffer).slice(0);
                      socket.send(bufferToSend);
                      audioBufferQueue = new Int16Array(0);
                    }
                  }
                };

                source.connect(processor);
                processor.connect(audioContext.destination);
              }
            } catch (err) {
              console.error("Failed to get microphone access:", err);
              onError(err instanceof Error ? err.message : "Failed to access microphone");
              onConnecting(false);
              cleanup();
              onStopRecording();
            }
          };

          socket.onmessage = (event) => {
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(event.data as string) as Record<string, unknown>;
            } catch {
              return;
            }

            if (data.type === "Turn") {
              const transcript = typeof data.transcript === "string" ? data.transcript : "";
              const detectedLanguageCode =
                (typeof data.language_code === "string" ? data.language_code : undefined) ||
                (typeof data.languageCode === "string" ? data.languageCode : undefined);
              if (detectedLanguageCode) {
                onLanguageDetected(detectedLanguageCode);
              }

              const endOfTurn = data.end_of_turn === true;

              if (!endOfTurn) {
                if (transcript.trim()) {
                  onPartialTranscript(transcript);
                  bumpSpeechActivity();
                }
                return;
              }

              const trimmed = transcript.trim();
              if (!trimmed) return;

              if (FORMAT_TURNS && data.turn_is_formatted === false) {
                return;
              }

              const turnOrder = typeof data.turn_order === "number" ? data.turn_order : null;
              if (turnOrder !== null) {
                if (committedTurnOrdersRef.current.has(turnOrder)) {
                  return;
                }
                committedTurnOrdersRef.current.add(turnOrder);
              }

              onPartialTranscript("");
              onCommittedTranscript(trimmed);
              return;
            }

            // Universal Streaming v3 emits transcript updates as `Turn` messages.
            // Mixing in the legacy partial stream can display the same phrase twice.
          };

          socket.onerror = () => {
            console.error("AssemblyAI WebSocket error");
            onError("WebSocket connection error");
            cleanup();
            onStopRecording();
          };

          socket.onclose = () => {
            onConnectionChange(false);
          };
        } catch (err) {
          console.error("Failed to start AssemblyAI transcription:", err);
          onError(err instanceof Error ? err.message : "Failed to connect to transcription service");
          onConnecting(false);
          hasConnected.current = false;
          onStopRecording();
        }
      }
    };

    startTranscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRecording && hasConnected.current) {
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return null;
}
