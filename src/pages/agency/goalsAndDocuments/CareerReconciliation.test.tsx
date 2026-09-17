import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, useNavigate } from "react-router";
import type {
  CareerOverviewArgs,
  ReviewOverview,
  ClaimReview,
} from "@/lib/api/career-reconciliation";
vi.unmock("react-router");
const mocks = vi.hoisted(() => ({
  base: vi.fn(),
  client: vi.fn(),
  user: {
    uid: "reviewer",
    userType: "agency_staff",
    agencyId: "a",
    profile: {
      isActive: true,
      agencyModes: ["ddd"],
      accessList: ["Client Management", "Notes", "Scheduling"] as string[],
      agencyScope: "all",
      agencyIds: [] as string[],
    },
  },
  signed: vi.fn(),
}));
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: mocks.base }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useEffectiveAgencyMode", () => ({
  useEffectiveAgencyMode: () => "ddd",
}));
vi.mock("@/lib/api/clients", () => ({
  getAgencyClientById: mocks.client,
  getClientById: mocks.client,
}));
vi.mock("./CareerPlanDate", () => ({
  CareerPlanDate: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  ),
}));
vi.mock("@/pages/shared/notes/SubmittedNoteModal", () => ({
  default: (props: {
    submissionId: string;
    scopeKey: string;
    readOnly: boolean;
  }) => {
    mocks.signed(props);
    return <div role="dialog">Signed evidence {props.submissionId}</div>;
  },
}));
import CareerReconciliation from "./CareerReconciliation";
import { goalsAndDocumentsApi as api } from "./api";
const summary = {
  approved: { value: 4, complete: true },
  submitted: { value: 0, complete: true },
  draft: { value: 0, complete: true },
  approvedRowCount: 1,
  submittedRowCount: 0,
  draftRowCount: 0,
  complete: true,
  findings: [],
};
function overview(clientId = "c", count = 26): ReviewOverview {
  return {
    evaluatedAt: "2026-09-17T12:00:00Z",
    timezone: "America/New_York",
    clientId,
    filters: {
      startDate: "2026-09-01",
      endDate: "2026-09-17",
      authorization: "all",
    },
    authorizationChoices: [{ id: "auth", label: "Exact authorization" }],
    coverage: {
      selection: "shift_start_date",
      undatedExcluded: true,
      orphanClaimsChecked: false,
    },
    totals: summary,
    shifts: Array.from({ length: count }, (_, i) => ({
      shiftId: "shift" + i,
      date: "2026-09-17",
      status: "completed",
      employeeName: clientId + " Employee " + i,
      authorizationId: "auth",
      authorizationLabel: "Career",
      authorizationNeedsReview: false,
      notes: summary,
      attendance: {
        status: "review",
        clockStart: "2026-09-17T09:00:00Z",
        clockEnd: "2026-09-17T10:00:30Z",
        clockSeconds: 3630,
        documentedSeconds: 3600,
        recordedSeconds: 3600,
        intervals: [],
        findings: [{ code: "time_difference" }],
      },
      sources: { submissionIds: ["signed" + i], shiftId: "shift" + i },
      claimId: "claim",
    })),
    billing: {
      access: "allowed",
      claims: [{ id: "claim", claimNumber: "C1", status: "pending" }],
      findings: [],
    },
  };
}
const detail: ClaimReview = {
  evaluatedAt: "2026-09-17T12:01:00Z",
  clientId: "c",
  claim: { id: "claim", claimNumber: "C1", status: "pending" },
  startDate: "2026-09-01",
  endDate: "2026-09-17",
  savedUnits: 7,
  unitBasis: "not_recorded",
  approvedUnits: 4,
  complete: true,
  mixedAuthorizations: true,
  shifts: [],
  findings: [],
};
function Shell() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate("?agencyId=b&clientId=d")}>
        Switch client
      </button>
      <CareerReconciliation />
    </>
  );
}
function mount(search = "?agencyId=a&clientId=c") {
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (g) => g().concat(api.middleware),
  });
  const element = (
    <Provider store={store}>
      <MemoryRouter
        initialEntries={["/agency/career-planning/reconciliation" + search]}
      >
        <Shell />
      </MemoryRouter>
    </Provider>
  );
  return { ...render(element), refresh: () => element };
}
beforeEach(() => {
  mocks.user = {
    uid: "reviewer",
    userType: "agency_staff",
    agencyId: "a",
    profile: {
      isActive: true,
      agencyModes: ["ddd"],
      accessList: ["Client Management", "Notes", "Scheduling"],
      agencyScope: "all",
      agencyIds: [],
    },
  };
  mocks.client
    .mockReset()
    .mockImplementation(async (id: string, agencyId?: string) => ({
      id,
      agencyId: typeof agencyId === "string" ? agencyId : "a",
      type: "ddd",
      firstName: id,
      documentChecklist: { timezone: "America/New_York" },
    }));
  mocks.base
    .mockReset()
    .mockImplementation(
      async (args: { url: string; params: CareerOverviewArgs }) => ({
        data: {
          success: true,
          data: args.url.includes("/claims/")
            ? detail
            : overview(args.params.clientId),
        },
      }),
    );
  mocks.signed.mockReset();
});
afterEach(cleanup);
it("reviewer without Goals loads defaults; draft edits and pagination make no requests; Apply runs once", async () => {
  mount();
  await screen.findByText("c Employee 0");
  expect(mocks.base).toHaveBeenCalledTimes(1);
  const initial = mocks.base.mock.calls[0][0].params;
  expect(initial.authorization).toBe("all");
  expect(
    (Date.parse(initial.endDate) - Date.parse(initial.startDate)) / 86400000,
  ).toBe(29);
  fireEvent.change(screen.getByLabelText("Start date"), {
    target: { value: initial.endDate },
  });
  expect(mocks.base).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("Next"));
  await screen.findByText("c Employee 25");
  expect(mocks.base).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("Apply filters"));
  await waitFor(() => expect(mocks.base).toHaveBeenCalledTimes(2));
  expect(mocks.base.mock.calls[1][0].params.startDate).toBe(initial.endDate);
  await screen.findByText("c Employee 0");
  fireEvent.click(screen.getByText("Apply filters"));
  await waitFor(() => expect(mocks.base).toHaveBeenCalledTimes(3));
});
it("loads one whole claim only on review and refresh closes detail with its timestamp", async () => {
  mount();
  await screen.findByText("c Employee 0");
  expect(mocks.base).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("Review claim"));
  await screen.findByText("Saved claim units: 7");
  expect(
    screen.getByText("Automatic unit comparison is unavailable."),
  ).toBeVisible();
  expect(mocks.base).toHaveBeenCalledTimes(2);
  expect(
    screen.getByText(/Saved claim units have no recorded unit basis/),
  ).toBeVisible();
  fireEvent.click(screen.getByText("Refresh"));
  await waitFor(() => expect(mocks.base).toHaveBeenCalledTimes(3));
  expect(screen.queryByText(/Claim checked at/)).toBeNull();
});
it("opens only the chosen signed evidence and links reports without loading them", async () => {
  mount();
  await screen.findByText("c Employee 0");
  fireEvent.click(screen.getAllByText("View signed note 1")[3]);
  expect(mocks.signed).toHaveBeenLastCalledWith(
    expect.objectContaining({
      submissionId: "signed3",
      readOnly: true,
      scopeKey: expect.any(String),
    }),
  );
  expect(
    screen.getByRole("link", { name: "Open billing report" }),
  ).toHaveAttribute(
    "href",
    "/agency/billing/claims?agencyId=a&clientId=c&claimId=claim",
  );
  expect(mocks.base).toHaveBeenCalledTimes(1);
});
it("denied billing renders no claim actions or requests", async () => {
  mocks.base.mockResolvedValue({
    data: {
      success: true,
      data: { ...overview("c", 1), billing: { access: "denied" } },
    },
  });
  mount();
  await screen.findByText("Claims View access is required to review billing.");
  expect(screen.queryByText("Review claim")).toBeNull();
  expect(mocks.base).toHaveBeenCalledTimes(1);
});
it("claim overflow preserves overview and does not suggest a shorter range for the claim", async () => {
  mocks.base.mockImplementation(async (args: { url: string }) =>
    args.url.includes("/claims/")
      ? { error: { status: 409 } }
      : { data: { success: true, data: overview("c", 1) } },
  );
  mount();
  await screen.findByText("c Employee 0");
  fireEvent.click(screen.getByText("Review claim"));
  await screen.findByText(
    "This claim is too large for this view. Open its billing report.",
  );
  expect(screen.getByText("c Employee 0")).toBeVisible();
});
it("renders sub-minute differences and overlaps as review", async () => {
  const data = overview("c", 1);
  data.shifts[0].attendance.findings.push({ code: "note_overlap" });
  mocks.base.mockResolvedValue({ data: { success: true, data } });
  mount();
  await screen.findByText("Duration difference: less than one minute");
  expect(
    screen.getByText("Approved note intervals overlap. Review these notes."),
  ).toBeVisible();
  expect(screen.queryByText("Attendance matches")).toBeNull();
});
it("retains unchanged-scope refresh failures, but access denial wipes evidence", async () => {
  mocks.base
    .mockResolvedValueOnce({ data: { success: true, data: overview("c", 1) } })
    .mockResolvedValueOnce({ error: { status: 503 } })
    .mockResolvedValueOnce({ error: { status: 404 } });
  mount();
  await screen.findByText("c Employee 0");
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findByText(/Could not refresh. Showing results checked at/);
  expect(screen.getByText("c Employee 0")).toBeVisible();
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findByText(/You do not have access/);
  expect(screen.queryByText("c Employee 0")).toBeNull();
});
it("changing scoped admin agency/client discards old pending results", async () => {
  mocks.user = {
    ...mocks.user,
    userType: "super_admin",
    profile: {
      ...mocks.user.profile,
      accessList: ["Clients Directory", "Notes"],
    },
  };
  let resolve!: (value: unknown) => void;
  mocks.base
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValue({ data: { success: true, data: overview("d", 1) } });
  mount();
  await waitFor(() => expect(mocks.base).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText("Switch client"));
  await screen.findByText("d Employee 0");
  await act(async () =>
    resolve({ data: { success: true, data: overview("c", 1) } }),
  );
  expect(screen.queryByText("c Employee 0")).toBeNull();
  expect(mocks.base.mock.calls[1][0].params.agencyId).toBe("b");
});
it("missing admin agency or timezone never issues review", async () => {
  mocks.user = {
    ...mocks.user,
    userType: "super_admin",
    profile: {
      ...mocks.user.profile,
      accessList: ["Clients Directory", "Notes"],
    },
  };
  mount("?clientId=c");
  expect(screen.getByRole("alert")).toHaveTextContent("Select an agency");
  expect(mocks.base).not.toHaveBeenCalled();
});
it("missing timezone presents recovery rather than browser defaults", async () => {
  mocks.client.mockResolvedValue({ id: "c", agencyId: "a", type: "ddd" });
  mount();
  await screen.findByText(/Agency timezone unavailable/);
  expect(mocks.base).not.toHaveBeenCalled();
});

it("clamps a local page when refreshed rows shrink", async () => {
  mocks.base
    .mockResolvedValueOnce({ data: { success: true, data: overview() } })
    .mockResolvedValue({ data: { success: true, data: overview("c", 1) } });
  mount();
  await screen.findByText("c Employee 0");
  fireEvent.click(screen.getByText("Next"));
  await screen.findByText("c Employee 25");
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findByText("Page 1 of 1");
  expect(screen.getByText("c Employee 0")).toBeVisible();
  expect(screen.getByText("Previous")).toBeDisabled();
});
it("an invalid URL selection recovers to an editable default range", async () => {
  mount("?agencyId=a&clientId=c&startDate=not-a-date");
  await screen.findByText("c Employee 0");
  expect(screen.getByRole("alert")).toHaveTextContent("Invalid review filters");
  expect(screen.getByLabelText("Start date")).toBeVisible();
});

it("labels outside-range claim evidence and opens its selected signed note", async () => {
  const outside = overview("c", 1).shifts[0];
  outside.date = "2026-08-01";
  outside.sources = { submissionIds: ["outside-signed"], shiftId: "outside" };
  mocks.base.mockImplementation(async (args: { url: string }) => ({
    data: {
      success: true,
      data: args.url.includes("/claims/")
        ? { ...detail, startDate: "2026-08-01", shifts: [outside] }
        : overview("c", 1),
    },
  }));
  mount();
  await screen.findByText("c Employee 0");
  fireEvent.click(screen.getByText("Review claim"));
  await screen.findByText("Full claim — includes shifts outside this range.");
  const claim = screen.getByRole("region", { name: "Claim evidence" });
  fireEvent.click(within(claim).getByText("View signed note 1"));
  expect(mocks.signed).toHaveBeenLastCalledWith(
    expect.objectContaining({ submissionId: "outside-signed", readOnly: true }),
  );
});
