import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  providerProps: [] as unknown[],
  setRecordingUi: vi.fn(),
  registerSessionHandlers: vi.fn(),
  clearSessionHandlers: vi.fn(),
}));

vi.mock("@/components/transcription/GeminiLiveTranscription", () => ({
  default: (props: unknown) => {
    mocks.providerProps.push(props);
    return null;
  },
}));

vi.mock("@/contexts/VoiceRecordingContext", () => ({
  useVoiceRecording: () => ({
    isRecording: true,
    partialTranscript: "",
    committedTranscripts: [],
    detectedLanguage: null,
    activeTarget: null,
    setPartialTranscript: vi.fn(),
    addCommittedTranscript: vi.fn(),
    setDetectedLanguage: vi.fn(),
    stopRecording: vi.fn(),
    getOnAcceptCallback: () => null,
    setRecordingUi: mocks.setRecordingUi,
    registerSessionHandlers: mocks.registerSessionHandlers,
    clearSessionHandlers: mocks.clearSessionHandlers,
    lastAppliedCommittedIndexRef: { current: 0 },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/assets/icons/microphone.svg?react", () => ({
  default: () => null,
}));

import VoiceInputButton from "./VoiceInputButton";

afterEach(() => {
  cleanup();
  mocks.providerProps.length = 0;
});

describe("VoiceInputButton transcription provider", () => {
  it("uses Gemini Live for the active voice recording session", () => {
    render(<VoiceInputButton />);

    expect(mocks.providerProps).toHaveLength(1);
  });
});
