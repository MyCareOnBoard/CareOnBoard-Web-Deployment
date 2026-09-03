import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  connect: vi.fn(),
  callbacks: null as null | Record<string, (event?: unknown) => void>,
  sendRealtimeInput: vi.fn(),
  closeSession: vi.fn(),
  stopTrack: vi.fn(),
  closeAudioContext: vi.fn(),
  addWorkletModule: vi.fn(),
  worklet: null as null | { port: { onmessage: ((event: { data: { audio_data: ArrayBuffer } }) => void) | null } },
  scriptProcessor: null as null | {
    onaudioprocess: ((event: { inputBuffer: { getChannelData: (channel: number) => Float32Array } }) => void) | null;
  },
}));

vi.mock("@/lib/api/gemini", () => ({
  getGeminiLiveTranscriptionToken: mocks.getToken,
}));

vi.mock("@google/genai", () => ({
  AudioTranscriptionConfigMode: { SMART: "SMART" },
  Modality: { TEXT: "TEXT" },
  GoogleGenAI: class {
    live = {
      connect: mocks.connect,
    };
  },
}));

import GeminiLiveTranscription from "./GeminiLiveTranscription";

class FakeAudioContext {
  destination = {};
  audioWorklet = { addModule: mocks.addWorkletModule };
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
  createScriptProcessor = vi.fn(() => {
    const processor = { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null };
    mocks.scriptProcessor = processor;
    return processor;
  });
  close = mocks.closeAudioContext;
}

class FakeAudioWorkletNode {
  port = { onmessage: null as ((event: { data: { audio_data: ArrayBuffer } }) => void) | null };
  connect = vi.fn();
  disconnect = vi.fn();

  constructor() {
    mocks.worklet = this;
  }
}

const connection = {
  token: "ephemeral-token",
  model: "gemini-3.5-transcribe-live" as const,
  config: {
    responseModalities: ["TEXT"] as ["TEXT"],
    inputAudioTranscription: { languageCodes: [], mode: "SMART" as const },
  },
  expiresAt: "2026-09-03T00:11:00.000Z",
  newSessionExpiresAt: "2026-09-03T00:01:00.000Z",
};

function props() {
  return {
    isRecording: true,
    onPartialTranscript: vi.fn(),
    onCommittedTranscript: vi.fn(),
    onLanguageDetected: vi.fn(),
    onError: vi.fn(),
    onConnecting: vi.fn(),
    onSpeechDetected: vi.fn(),
    onConnectionChange: vi.fn(),
    onStopRecording: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.callbacks = null;
  mocks.worklet = null;
  mocks.scriptProcessor = null;
  mocks.addWorkletModule.mockResolvedValue(undefined);
  mocks.getToken.mockResolvedValue(connection);
  mocks.connect.mockImplementation(async ({ callbacks }) => {
    mocks.callbacks = callbacks;
    return {
      sendRealtimeInput: mocks.sendRealtimeInput,
      close: mocks.closeSession,
    };
  });

  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("AudioWorkletNode", FakeAudioWorkletNode);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: mocks.stopTrack }],
      }),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GeminiLiveTranscription", () => {
  it("streams PCM and maps interim and finalized transcription events", async () => {
    const callbacks = props();
    render(<GeminiLiveTranscription {...callbacks} />);

    await waitFor(() => expect(mocks.connect).toHaveBeenCalledWith(expect.objectContaining({
      model: connection.model,
      config: connection.config,
    })));
    await waitFor(() => expect(mocks.worklet?.port.onmessage).toBeTypeOf("function"));

    mocks.worklet?.port.onmessage?.({
      data: { audio_data: new Uint8Array([1, 2]).buffer },
    });
    expect(mocks.sendRealtimeInput).toHaveBeenCalledWith({
      audio: { data: "AQI=", mimeType: "audio/pcm;rate=16000" },
    });

    mocks.callbacks?.onmessage({
      serverContent: { interimInputTranscription: { text: "partial" } },
    });
    expect(callbacks.onPartialTranscript).toHaveBeenCalledWith("partial");
    expect(callbacks.onSpeechDetected).toHaveBeenCalledWith(true);

    mocks.callbacks?.onmessage({
      serverContent: { inputTranscription: { text: "final transcript" } },
    });
    expect(callbacks.onPartialTranscript).toHaveBeenLastCalledWith("");
    expect(callbacks.onCommittedTranscript).toHaveBeenCalledWith("final transcript");
    expect(callbacks.onLanguageDetected).not.toHaveBeenCalled();
  });

  it("stops local resources and the session after a provider error", async () => {
    const callbacks = props();
    render(<GeminiLiveTranscription {...callbacks} />);

    await waitFor(() => expect(mocks.callbacks).not.toBeNull());
    mocks.callbacks?.onerror(new Error("upstream details"));

    expect(callbacks.onError).toHaveBeenCalledWith("Live transcription connection error");
    expect(callbacks.onStopRecording).toHaveBeenCalledTimes(1);
    expect(mocks.stopTrack).toHaveBeenCalledTimes(1);
    expect(mocks.closeAudioContext).toHaveBeenCalledTimes(1);
    expect(mocks.closeSession).toHaveBeenCalledTimes(1);
  });

  it("falls back to ScriptProcessor when the AudioWorklet cannot load", async () => {
    mocks.addWorkletModule.mockRejectedValue(new Error("worklet unavailable"));
    const callbacks = props();
    render(<GeminiLiveTranscription {...callbacks} />);

    await waitFor(() => expect(mocks.scriptProcessor).not.toBeNull());
    expect(callbacks.onError).toHaveBeenCalledWith("");
    expect(callbacks.onError).not.toHaveBeenCalledWith("worklet unavailable");
    expect(callbacks.onStopRecording).not.toHaveBeenCalled();
  });
});
