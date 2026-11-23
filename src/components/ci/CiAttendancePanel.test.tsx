import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CiAttendancePanel } from "./CiAttendancePanel";

const api = vi.hoisted(() => ({
  listSessions: vi.fn(),
  saveAttendance: vi.fn(),
  weeklyStatus: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("@/lib/api/ci-tracker", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api/ci-tracker")>("@/lib/api/ci-tracker")),
  ciApi: api,
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const entry = (clientId: string, clientRef: string) => ({
  clientId, clientRef, shiftId: `s-${clientId}`, attendance: "scheduled", absenceReason: null, signIn: null, signOut: null,
  markedAt: null, noteState: null, goalsApproved: true,
});
const session = {
  id: "o1", program: "ci", date: "2026-11-23", startTime: "10:00", endTime: "13:00", timeZone: "America/New_York", serviceCode: "H2015-CI",
  location: { name: "Central library" }, leadEmployeeId: "e1", employeeIds: ["e1"], status: "scheduled", notes: "", cancelReason: null,
  roster: [entry("c1", "ABC123"), entry("c2", "DEF456")], counts: { total: 2, attended: 0, absent: 0, scheduled: 2 },
};

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.listSessions.mockResolvedValue([session]);
  api.saveAttendance.mockImplementation(async (_id: string, marks: unknown[]) => ({ ...session, marks }));
  api.weeklyStatus.mockResolvedValue({
    weekStart: "2026-11-23", weekEnd: "2026-11-29", dueAt: null,
    rows: [{ id: "w1", clientId: "c1", clientRef: "ABC123", program: "ci", weekStart: "2026-11-23", weekEnd: "2026-11-29", dueAt: null,
      days: { "2026-11-23": "missing" }, state: "due_soon", daysAttended: 1, logsRequired: 1, logsSubmitted: 0, logsApproved: 0,
      missingDates: ["2026-11-23"], incompleteDates: [], flags: [], goalsApproved: true }],
  });
});

describe("CiAttendancePanel", () => {
  it("takes attendance by client reference, with did-not-attend and save", async () => {
    render(<MemoryRouter><CiAttendancePanel program="ci" date="2026-11-23" view="attendance" onClose={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByText("Client ABC123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clock in all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clock out all" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Did not attend" })[1]);
    fireEvent.change(screen.getByLabelText("Why didn't Client DEF456 attend?"), { target: { value: "Sick" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark did not attend" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark all present" }));
    fireEvent.click(screen.getByRole("button", { name: "Save attendance" }));

    await waitFor(() => expect(api.saveAttendance).toHaveBeenCalledTimes(1));
    const marks = api.saveAttendance.mock.calls[0][1] as Array<{ clientId: string; attendance: string; absenceReason: string | null }>;
    expect(marks.find((m) => m.clientId === "c1")?.attendance).toBe("attended");
    expect(marks.find((m) => m.clientId === "c2")).toMatchObject({ attendance: "absent", absenceReason: "Sick" });
  });

  it("opens on this week's logs when asked", async () => {
    render(<MemoryRouter><CiAttendancePanel program="ci" date="2026-11-23" view="week" onClose={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByText("Client ABC123")).toBeInTheDocument();
    expect(screen.getByText("0 of 1 logs submitted")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "This week's logs" })).toHaveAttribute("aria-selected", "true");
    expect(api.weeklyStatus).toHaveBeenCalledWith({ weekStart: "2026-11-23", program: "ci" }, expect.anything());
  });

  it("stays closed without a program", () => {
    render(<MemoryRouter><CiAttendancePanel program={null} date={null} view="attendance" onClose={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText("Community inclusion")).not.toBeInTheDocument();
  });
});
