import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  startRecording: vi.fn(),
  registerActiveTarget: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({}),
}));

vi.mock("./api", () => ({
  useCreateConversationMutation: () => [vi.fn()],
  useLazyGetConversationQuery: () => [vi.fn()],
  useSendMessageMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useEffectiveAgencyMode", () => ({
  useEffectiveAgencyMode: () => null,
}));

vi.mock("@/contexts/VoiceRecordingContext", () => ({
  VoiceRecordingProvider: ({ children }: { children: React.ReactNode }) => children,
  useVoiceRecording: () => ({
    startRecording: mocks.startRecording,
    isRecording: false,
    registerActiveTarget: mocks.registerActiveTarget,
    committedTranscripts: [],
  }),
  useVoiceSessionActions: () => ({
    acceptSession: vi.fn(),
    cancelSession: vi.fn(),
    recordingUi: {
      isConnecting: false,
      isSpeaking: false,
      isConnected: false,
      error: null,
      isTranslating: false,
    },
  }),
}));

vi.mock("@/components/VoiceInputButton", () => ({ default: () => null }));
vi.mock("./components/AIAutomationHeader", () => ({ default: () => null }));
vi.mock("./components/ConversationsSidebar", () => ({ default: () => null }));
vi.mock("./components/AddAttachmentModal", () => ({ AddAttachmentModal: () => null }));
vi.mock("./components/MessageBubble", () => ({ MessageBubble: () => null }));
vi.mock("./components/EmptyState", () => ({ default: () => null }));

import AIAutomationPage from "./index";

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AI Automation voice acceptance", () => {
  it("does not append a finalized transcript that is already visible in the composer", () => {
    const { container } = render(<AIAutomationPage />);
    const textarea = screen.getByPlaceholderText("Talk to me, how can I help you today?");
    const transcript = "Bonjour, je m'appelle Jean. What is your name?";

    fireEvent.change(textarea, { target: { value: transcript } });

    const microphone = container.querySelector("svg.lucide-mic")?.closest("button");
    expect(microphone).not.toBeNull();
    fireEvent.click(microphone!);

    const onAccept = mocks.startRecording.mock.calls[0]?.[3] as
      | ((text: string) => void)
      | undefined;
    expect(onAccept).toBeTypeOf("function");

    act(() => onAccept?.(transcript));

    expect(textarea).toHaveValue(transcript);
  });
});
