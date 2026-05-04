/**
 * ElevenLabs Scribe v2 realtime transcription via WebSocket (v1/speech-to-text/realtime).
 * Uses direct WebSocket so query params like include_language_detection are supported.
 */

import { useEffect, useRef } from "react";
import { getScribeToken } from "@/lib/api/elevenlabs";

/** Regional host only (no path). Example: `wss://api.us.elevenlabs.io` */
const DEFAULT_ELEVENLABS_WS_ORIGIN = "wss://api.elevenlabs.io";

function elevenLabsRealtimeWsUrl(): string {
  const raw = import.meta.env.VITE_ELEVENLABS_WS_ORIGIN;
  const base = (raw?.trim() || DEFAULT_ELEVENLABS_WS_ORIGIN).replace(/\/$/, "");
  return `${base}/v1/speech-to-text/realtime`;
}

/** When true, only `committed_transcript_with_timestamps` is handled for finals — API often sends both and would duplicate segments. */
const INCLUDE_TIMESTAMPS = true;

/** PCM s16le ArrayBuffer → base64 without blowing the stack on large buffers */
function pcmArrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    const chunk = bytes.subarray(i, end);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

function buildRealtimeUrl(token: string): string {
  const params = new URLSearchParams({
    model_id: "scribe_v2_realtime",
    token,
    audio_format: "pcm_16000",
    commit_strategy: "vad",
    vad_threshold: "0.5",
    vad_silence_threshold_secs: "1.0",
    include_language_detection: "true",
    include_timestamps: INCLUDE_TIMESTAMPS ? "true" : "false",
  });
  return `${elevenLabsRealtimeWsUrl()}?${params.toString()}`;
}

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

type IncomingMessage = {
  message_type?: string;
  text?: string;
  language_code?: string | null;
  error?: string;
};

function isErrorMessageType(t: string): boolean {
  return (
    t === "error" ||
    t === "auth_error" ||
    t === "quota_exceeded" ||
    t === "commit_throttled" ||
    t === "unaccepted_terms" ||
    t === "rate_limited" ||
    t === "queue_overflow" ||
    t === "resource_exhausted" ||
    t === "session_time_limit_exceeded" ||
    t === "input_error" ||
    t === "chunk_size_exceeded" ||
    t === "insufficient_audio_activity" ||
    t === "transcriber_error"
  );
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
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioNode | null>(null);
  const hasConnected = useRef(false);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionReadyRef = useRef(false);
  const pendingAudioRef = useRef<ArrayBuffer[]>([]);
  const pendingAudioDropWarnedRef = useRef(false);
  const maxPendingChunks = 200;

  const flushPendingAudio = (socket: WebSocket) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    for (const buf of pendingAudioRef.current) {
      const payload = JSON.stringify({
        message_type: "input_audio_chunk",
        audio_base_64: pcmArrayBufferToBase64(buf),
        commit: false,
        sample_rate: 16000,
      });
      socket.send(payload);
    }
    pendingAudioRef.current = [];
  };

  const sendPcmChunk = (socket: WebSocket, audioBuffer: ArrayBuffer) => {
    if (socket.readyState !== WebSocket.OPEN) return;

    if (!sessionReadyRef.current) {
      if (pendingAudioRef.current.length >= maxPendingChunks) {
        if (!pendingAudioDropWarnedRef.current) {
          pendingAudioDropWarnedRef.current = true;
          console.warn(
            "[ElevenLabs STT] Pre-session audio buffer full; oldest chunks dropped until session_started."
          );
        }
        pendingAudioRef.current.shift();
      }
      pendingAudioRef.current.push(audioBuffer.slice(0));
      return;
    }

    const payload = JSON.stringify({
      message_type: "input_audio_chunk",
      audio_base_64: pcmArrayBufferToBase64(audioBuffer),
      commit: false,
      sample_rate: 16000,
    });
    socket.send(payload);
  };

  useEffect(() => {
    const startTranscription = async () => {
      if (isRecording && !hasConnected.current) {
        try {
          hasConnected.current = true;
          sessionReadyRef.current = false;
          pendingAudioRef.current = [];
          pendingAudioDropWarnedRef.current = false;
          onError("");
          onConnecting(true);

          const token = await getScribeToken();
          const url = buildRealtimeUrl(token);
          const socket = new WebSocket(url);
          socketRef.current = socket;

          socket.onopen = async () => {
            try {
              onConnecting(false);
              onConnectionChange(true);

              const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  channelCount: 1,
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              });

              mediaStreamRef.current = stream;

              const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
                sampleRate: 16000,
              });
              audioContextRef.current = audioContext;

              const source = audioContext.createMediaStreamSource(stream);

              const attachSend = (audioBuffer: ArrayBuffer) => {
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                  sendPcmChunk(socketRef.current, audioBuffer);
                }
              };

              try {
                await audioContext.audioWorklet.addModule("/audio-processor.js");
                const workletNode = new AudioWorkletNode(audioContext, "audio-processor");

                workletNode.port.onmessage = (event: MessageEvent<{ audio_data: ArrayBuffer }>) => {
                  attachSend(event.data.audio_data);
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
                  if (socketRef.current?.readyState !== WebSocket.OPEN) return;
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
                    const bufferToSend = audioBufferQueue.buffer.slice(
                      audioBufferQueue.byteOffset,
                      audioBufferQueue.byteOffset + audioBufferQueue.byteLength
                    );
                    attachSend(bufferToSend);
                    audioBufferQueue = new Int16Array(0);
                  }
                };

                source.connect(processor);
                processor.connect(audioContext.destination);
              }
            } catch (err) {
              console.error("Failed to set up ElevenLabs audio:", err);
              onError(err instanceof Error ? err.message : "Failed to access microphone");
              onConnecting(false);
              hasConnected.current = false;
              socket.close();
            }
          };

          socket.onmessage = (event) => {
            let data: IncomingMessage;
            try {
              data = JSON.parse(event.data as string) as IncomingMessage;
            } catch {
              return;
            }

            const mt = data.message_type;
            if (!mt) return;

            if (mt === "session_started") {
              sessionReadyRef.current = true;
              flushPendingAudio(socket);
              return;
            }

            if (mt === "partial_transcript" && typeof data.text === "string") {
              onPartialTranscript(data.text);
              if (data.text.trim().length > 0) {
                onSpeechDetected(true);
                if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
                speechTimeoutRef.current = setTimeout(() => onSpeechDetected(false), 500);
              }
              return;
            }

            if (mt === "committed_transcript" && typeof data.text === "string") {
              if (INCLUDE_TIMESTAMPS) {
                // With timestamps on, server may emit this and `committed_transcript_with_timestamps` for the same utterance.
                return;
              }
              onCommittedTranscript(data.text);
              const lang = data.language_code;
              if (typeof lang === "string" && lang.length > 0) {
                onLanguageDetected(lang);
              }
              return;
            }

            if (mt === "committed_transcript_with_timestamps" && typeof data.text === "string") {
              if (!INCLUDE_TIMESTAMPS) {
                return;
              }
              onCommittedTranscript(data.text);
              const lang = data.language_code;
              if (typeof lang === "string" && lang.length > 0) {
                onLanguageDetected(lang);
              }
              return;
            }

            if (isErrorMessageType(mt)) {
              const msg = typeof data.error === "string" ? data.error : "Transcription error";
              console.error("ElevenLabs Scribe error:", mt, msg);
              onError(msg);
              onConnectionChange(false);
              hasConnected.current = false;
              onStopRecording();
            }
          };

          socket.onerror = () => {
            console.error("ElevenLabs WebSocket error");
            onError("WebSocket connection error");
            onConnectionChange(false);
            hasConnected.current = false;
            onStopRecording();
          };

          socket.onclose = () => {
            onConnectionChange(false);
          };
        } catch (err) {
          console.error("Failed to start ElevenLabs transcription:", err);
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
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    sessionReadyRef.current = false;
    pendingAudioRef.current = [];
    hasConnected.current = false;
    onConnectionChange(false);
  };

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
