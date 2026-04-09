/**
 * AssemblyAI Real-time Transcription Component
 * 
 * This component handles all AssemblyAI-specific transcription logic using WebSockets.
 * Works in browser environments without Node.js dependencies.
 */

import { useEffect, useRef } from "react";
import { getAssemblyAIToken } from "@/lib/api/assemblyai";

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
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const hasConnected = useRef(false);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to microphone and start transcription
  useEffect(() => {
    const startTranscription = async () => {
      if (isRecording && !hasConnected.current) {
        try {
          hasConnected.current = true;
          onError("");
          onConnecting(true);

          console.log("Getting AssemblyAI token...");
          // Get token from server
          const token = await getAssemblyAIToken();

          console.log("Connecting to AssemblyAI WebSocket...");
          // Connect to AssemblyAI WebSocket v3 with parameters
          const connectionParams = {
            sample_rate: "16000",
            formatted_finals: "true",
            speech_model: "universal-streaming-multilingual",
            token,
          };
          
          const socket = new WebSocket(
            `wss://streaming.assemblyai.com/v3/ws?${new URLSearchParams(connectionParams)}`
          );
          
          socketRef.current = socket;

          // Handle WebSocket open
          socket.onopen = async () => {
            console.log("AssemblyAI WebSocket connected");
            
            onConnecting(false);
            onConnectionChange(true);

            try {
              console.log("Getting microphone access...");
              // Get microphone access
              const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  channelCount: 1,
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              });

              mediaStreamRef.current = stream;

              // Create audio context for processing
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
              });
              audioContextRef.current = audioContext;

              const source = audioContext.createMediaStreamSource(stream);
              
              // Use AudioWorklet instead of ScriptProcessor
              try {
                await audioContext.audioWorklet.addModule('/audio-processor.js');
                const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
                
                workletNode.port.onmessage = (event) => {
                  if (socket.readyState === WebSocket.OPEN) {
                    socket.send(event.data.audio_data);
                  }
                };

                source.connect(workletNode);
                workletNode.connect(audioContext.destination);
                
                (processorRef.current as any) = workletNode;
              } catch (workletError) {
                console.warn("AudioWorklet failed, falling back to ScriptProcessor", workletError);
                const processor = audioContext.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;
                
                let audioBufferQueue = new Int16Array(0);
                const TARGET_SIZE = 1600; // ~100ms at 16000Hz

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

              console.log("AssemblyAI transcription started");
            } catch (err) {
              console.error("Failed to get microphone access:", err);
              onError(err instanceof Error ? err.message : "Failed to access microphone");
              onConnecting(false);
              socket.close();
            }
          };

          // Handle WebSocket messages
          socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            // Handle different message types
            if (data.type === "Turn" && data.transcript && data.turn_is_formatted && data.end_of_turn) {
              onCommittedTranscript(data.transcript);
            } else if (data.message_type === "PartialTranscript" && data.text) {
              onPartialTranscript(data.text);

              // Detect speech activity
              onSpeechDetected(true);
              if (speechTimeoutRef.current) {
                clearTimeout(speechTimeoutRef.current);
              }
              speechTimeoutRef.current = setTimeout(() => {
                onSpeechDetected(false);
              }, 500);
            } else if (data.message_type === "SessionBegins") {
              console.log("AssemblyAI session started:", data.session_id);
            } else if (data.message_type === "SessionTerminated") {
              console.log("AssemblyAI session terminated");
            }
          };

          // Handle WebSocket errors
          socket.onerror = (error) => {
            console.error("AssemblyAI WebSocket error:", error);
            onError("WebSocket connection error");
            onConnectionChange(false);
          };

          // Handle WebSocket close
          socket.onclose = (event) => {
            console.log("AssemblyAI WebSocket closed:", event.code, event.reason);
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

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      console.log("Cleaning up AssemblyAI transcription...");

      // Clear speech timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      // Disconnect processor
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      // Close WebSocket
      if (socketRef.current) {
        // Send terminate message
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "Terminate" }));
        }
        socketRef.current.close();
        socketRef.current = null;
      }

      hasConnected.current = false;
      onConnectionChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle stop recording
  useEffect(() => {
    if (!isRecording && hasConnected.current) {
      console.log("Stopping AssemblyAI transcription...");

      // Clear speech timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      // Disconnect processor
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      // Close WebSocket
      if (socketRef.current) {
        // Send terminate message
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "Terminate" }));
        }
        socketRef.current.close();
        socketRef.current = null;
      }

      hasConnected.current = false;
      onConnectionChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // This component doesn't render anything
  return null;
}
