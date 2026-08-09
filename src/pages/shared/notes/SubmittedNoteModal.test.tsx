import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubmittedNoteModal from "./SubmittedNoteModal";

const { detailsHook, templateLoads } = vi.hoisted(() => ({
  detailsHook: vi.fn(),
  templateLoads: {
    activities: vi.fn(),
    community: vi.fn(),
    hhaService: vi.fn(),
    personalCare: vi.fn(),
    respite: vi.fn(),
    supportedEmployment: vi.fn(),
  },
}));

vi.mock("@/pages/agency/notes/api", () => ({
  useGetSubmittedNoteDetailsQuery: (...args: unknown[]) => detailsHook(...args),
}));

vi.mock("@/pages/agency/notes/components/activitiesLogTemplate", () => {
  templateLoads.activities();
  return { default: () => <div>Activities template</div> };
});

vi.mock("@/pages/agency/notes/components/commnityBased", () => {
  templateLoads.community();
  return new Promise(() => undefined);
});

vi.mock("@/pages/agency/notes/components/hhaServiceActivityLog", () => {
  templateLoads.hhaService();
  return { default: () => <div>HHA service template</div> };
});

vi.mock("@/pages/agency/notes/components/personalCareNote", () => {
  templateLoads.personalCare();
  return { default: () => <div>Personal care template</div> };
});

vi.mock("@/pages/agency/notes/components/respiteLog", () => {
  templateLoads.respite();
  return { default: ({ readOnly }: { readOnly?: boolean }) => <div>Respite template: {readOnly ? "read only" : "editable"}</div> };
});

vi.mock("@/pages/agency/notes/components/supportedEmploymentIntervention", () => {
  templateLoads.supportedEmployment();
  return { default: () => <div>Supported employment template</div> };
});

const submittedNote = {
  id: "submission-1",
  activityType: "respite-log",
  description: "Respite",
  metadata: {},
  notes: [],
  status: "submitted",
  submissionId: "submission-1",
  submittedAt: "2026-08-08T12:00:00.000Z",
  submittedBy: "employee-1",
  employee: { id: "employee-1", fullName: "Taylor Jordan" },
} as const;

describe("SubmittedNoteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detailsHook.mockReturnValue({ data: submittedNote, isLoading: false });
  });

  it("loads and renders only the selected note template", async () => {
    render(<SubmittedNoteModal isOpen submissionId="submission-1" readOnly onClose={vi.fn()} />);

    expect(await screen.findByText("Respite template: read only")).toBeInTheDocument();
    expect(templateLoads.respite).toHaveBeenCalledOnce();
    expect(templateLoads.activities).not.toHaveBeenCalled();
    expect(templateLoads.community).not.toHaveBeenCalled();
    expect(templateLoads.hhaService).not.toHaveBeenCalled();
    expect(templateLoads.personalCare).not.toHaveBeenCalled();
    expect(templateLoads.supportedEmployment).not.toHaveBeenCalled();
  });

  it("shows the modal Suspense fallback while the selected template is pending", () => {
    detailsHook.mockReturnValue({
      data: { ...submittedNote, activityType: "community-based" },
      isLoading: false,
    });

    render(<SubmittedNoteModal isOpen submissionId="submission-1" readOnly onClose={vi.fn()} />);

    expect(screen.getByLabelText("Loading note template")).toBeInTheDocument();
    expect(screen.queryByText("Respite template: read only")).not.toBeInTheDocument();
  });
});
