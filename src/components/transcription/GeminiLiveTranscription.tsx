import { useEffect, useRef } from "react";

import { getGeminiLiveTranscriptionToken } from "@/lib/api/gemini";

interface GeminiLiveTranscriptionProps {
  isRecording: boolean;
  onPartialTranscript: (text: string) => void;
  onCommittedTranscript: (text: string) => void;
  onLanguageDetected: (languageCode: string) => void;
  onStopRecording: () => void;
  onError: (message: string) => void;
  onSpeechDetected: (isSpeaking: boolean) => void;
  onConnectionChange: (connected: boolean) => void;
  onConnecting: (connecting: boolean) => void;
}

type GeminiLiveSession = {
  close: () => void;
  sendRealtimeInput: (input: {
    audio: { data: string; mimeType: string };
  }) => void;
};

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window.btoa(binary);
};

export default function GeminiLiveTranscription({
  isRecording,
  onPartialTranscript,
  onCommittedTranscript,
  onStopRecording,
  onError,
  onSpeechDetected,
  onConnectionChange,
  onConnecting,
}: GeminiLiveTranscriptionProps) {
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generationRef = useRef(0);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      generationRef.current += 1;

      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }

      processorRef.current?.disconnect();
      processorRef.current = null;
      sourceRef.current?.disconnect();
      sourceRef.current = null;

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }

      sessionRef.current?.close();
      sessionRef.current = null;
      onConnectionChange(false);
    };

    if (!isRecording) {
      cleanup();
      return cleanup;
    }

    const start = async () => {
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      onError("");
      onConnecting(true);

      const bumpSpeechActivity = () => {
        onSpeechDetected(true);
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        speechTimeoutRef.current = setTimeout(() => onSpeechDetected(false), 500);
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (cancelled || generation !== generationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const connection = await getGeminiLiveTranscriptionToken();

        if (cancelled || generation !== generationRef.current) {
          cleanup();
          return;
        }

        const { GoogleGenAI, Modality } = await import("@google/genai");
        const client = new GoogleGenAI({ apiKey: connection.token });
        const session = (await client.live.connect({
          model: connection.model,
          config: {
            ...connection.config,
            responseModalities: [Modality.TEXT],
          },
          callbacks: {
            onopen: () => {
              if (!cancelled && generation === generationRef.current) {
                onConnecting(false);
                onConnectionChange(true);
              }
            },
            onmessage: (message) => {
              if (cancelled || generation !== generationRef.current) {
                return;
              }

              const content = message.serverContent;
              const interim = content?.interimInputTranscription?.text?.trim();
              if (interim) {
                onPartialTranscript(interim);
                bumpSpeechActivity();
              }

              const finalized = content?.inputTranscription?.text?.trim();
              if (finalized) {
                onPartialTranscript("");
                onCommittedTranscript(finalized);
                bumpSpeechActivity();
              }
            },
            onerror: () => {
              if (cancelled || generation !== generationRef.current) {
                return;
              }

              onError("Live transcription connection error");
              cleanup();
              onStopRecording();
            },
            onclose: () => {
              if (!cancelled && generation === generationRef.current) {
                onConnectionChange(false);
              }
            },
          },
        })) as GeminiLiveSession;

        if (cancelled || generation !== generationRef.current) {
          session.close();
          cleanup();
          return;
        }

        sessionRef.current = session;

        const audioContextConstructor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: AudioContextConstructor })
            .webkitAudioContext;

        if (!audioContextConstructor) {
          throw new Error("AudioContext is not supported in this browser");
        }

        const audioContext = new audioContextConstructor({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const sendAudio = (audio: ArrayBuffer) => {
          if (!cancelled && generation === generationRef.current && sessionRef.current) {
            sessionRef.current.sendRealtimeInput({
              audio: {
                data: arrayBufferToBase64(audio),
                mimeType: "audio/pcm;rate=16000",
              },
            });
          }
        };

        const startScriptProcessor = () => {
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(input.length);

            for (let index = 0; index < input.length; index += 1) {
              pcm[index] = Math.max(-1, Math.min(1, input[index])) * 0x7fff;
            }

            sendAudio(pcm.buffer);
          };
          processorRef.current = processor;
          source.connect(processor);
          processor.connect(audioContext.destination);
        };

        if (audioContext.audioWorklet) {
          try {
            await audioContext.audioWorklet.addModule("/audio-processor.js");

            if (cancelled || generation !== generationRef.current) {
              cleanup();
              return;
            }

            const processor = new AudioWorkletNode(audioContext, "audio-processor");
            processor.port.onmessage = (event: MessageEvent<{ audio_data: ArrayBuffer }>) => {
              sendAudio(event.data.audio_data);
            };
            processorRef.current = processor;
            source.connect(processor);
            processor.connect(audioContext.destination);
          } catch {
            if (cancelled || generation !== generationRef.current) {
              cleanup();
              return;
            }
            startScriptProcessor();
          }
        } else {
          startScriptProcessor();
        }
      } catch (error) {
        if (cancelled || generation !== generationRef.current) {
          return;
        }

        cleanup();
        onError(
          error instanceof Error
            ? error.message
            : "Unable to start live transcription",
        );
        onStopRecording();
      }
    };

    void start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [
    isRecording,
    onCommittedTranscript,
    onConnectionChange,
    onConnecting,
    onError,
    onPartialTranscript,
    onSpeechDetected,
    onStopRecording,
  ]);

  return null;
}
