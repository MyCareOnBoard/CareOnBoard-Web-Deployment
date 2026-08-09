import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SubmittedNoteDetails } from "../apiTypes";
import AgencyRespiteLog from "./respiteLog";

vi.mock("@/contexts/VoiceRecordingContext", () => ({
  VoiceRecordingProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/VoiceEnabledTextarea", () => ({
  default: () => null,
}));

vi.mock("@/components/VoiceInputButton", () => ({
  default: () => null,
}));

vi.mock("@/pages/agency/notes/api", () => ({
  useUpdateSubmittedNoteMutation: () => [vi.fn()],
}));

const submittedNote: SubmittedNoteDetails = {
  id: "submission-1",
  activityType: "respite-log",
  description: "Respite",
  metadata: { clientName: "Alex Doe", serviceCode: "T1005" },
  notes: [{
    id: "note-1",
    startDate: "2026-08-08",
    endDate: "2026-08-08",
    metadata: { toileting: "Needs assistance" },
    status: "submitted",
  }],
  status: "submitted",
  submissionId: "submission-1",
  submittedAt: "2026-08-08T12:00:00.000Z",
  submittedBy: "employee-1",
  employee: { id: "employee-1", fullName: "Taylor Jordan" },
};

describe("AgencyRespiteLog", () => {
  it("keeps Toileting disabled and unchanged in read-only mode", async () => {
    render(
      <AgencyRespiteLog
        submissionId="submission-1"
        isLoading={false}
        submittedNote={submittedNote}
        readOnly
      />,
    );

    const toileting = await screen.findByDisplayValue("Needs assistance");
    expect(toileting).toBeDisabled();

    fireEvent.change(toileting, { target: { value: "Changed" } });

    await waitFor(() => expect(toileting).toHaveValue("Needs assistance"));
  });
});
