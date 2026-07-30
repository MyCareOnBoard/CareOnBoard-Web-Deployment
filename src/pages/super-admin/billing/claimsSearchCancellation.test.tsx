import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import type {
  OperationalAgencyDataAdapter,
  OperationalOptionPage,
  OperationalClientOption,
} from "@/lib/operational-agency/types";
import ClaimsClientSearch from "@/pages/agency/billing/claims/components/ClaimsClientSearch";
import GenerateClaimModal from "@/pages/agency/billing/claims/components/GenerateClaimModal";

vi.mock("react-loader-spinner", () => ({ Oval: () => <span>Loading</span> }));
vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { uid: "super-1", profile: { accessList: ["Billing Management"] } } }),
}));
vi.mock("react-redux", () => ({ useSelector: () => "ddd" }));
vi.mock("@/lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const agency = {
  id: "atlas",
  name: "Atlas Care",
  status: "active",
  supportedClientTypes: ["ddd"] as const,
  timezone: "America/New_York",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function createAdapter(searchClients: OperationalAgencyDataAdapter["searchClients"]): OperationalAgencyDataAdapter {
  return {
    searchClients,
    searchStaff: vi.fn(),
    listServices: vi.fn(),
    getClientSchedulingContext: vi.fn(),
    getStaffSchedulingContext: vi.fn(),
    createStaffActivity: vi.fn(),
    createGoalDocument: vi.fn(),
  } as OperationalAgencyDataAdapter;
}

function Scope({ data, children }: { data: OperationalAgencyDataAdapter; children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <OperationalAgencyProvider
        actor="super_admin"
        agencyId="atlas"
        agency={agency}
        mode="ddd"
        capabilities={{ canManageShifts: false, canManageBilling: true, shiftMaintenance: false }}
        data={data}
      >
        {children}
      </OperationalAgencyProvider>
    </MemoryRouter>
  );
}

type SearchPage = OperationalOptionPage<OperationalClientOption>;
const emptySearchPage: SearchPage = { items: [], truncated: false, scanLimit: null };
const noReadyRows: [] = [];

async function exerciseClearAndReplace(
  searchClients: ReturnType<typeof vi.fn>,
  container: HTMLElement,
) {
  const first = deferred<SearchPage>();
  const second = deferred<SearchPage>();
  searchClients.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const input = screen.getByPlaceholderText("Search client name...");

  fireEvent.change(input, { target: { value: "Ali" } });
  await waitFor(() => expect(searchClients).toHaveBeenCalledTimes(1));
  expect(container.querySelector(".animate-spin")).not.toBeNull();

  fireEvent.change(input, { target: { value: "" } });
  expect(searchClients.mock.calls[0][0].signal.aborted).toBe(true);
  expect(container.querySelector(".animate-spin")).toBeNull();

  fireEvent.change(input, { target: { value: "Bob" } });
  await waitFor(() => expect(searchClients).toHaveBeenCalledTimes(2));
  expect(container.querySelector(".animate-spin")).not.toBeNull();

  await act(async () => first.resolve(emptySearchPage));
  expect(container.querySelector(".animate-spin")).not.toBeNull();

  await act(async () => second.resolve(emptySearchPage));
  await waitFor(() => expect(container.querySelector(".animate-spin")).toBeNull());
}

describe("claims client search cancellation", () => {
  it("clears and preserves loading ownership in the saved-claims search", async () => {
    const searchClients = vi.fn();
    const view = render(
      <Scope data={createAdapter(searchClients)}>
        <ClaimsClientSearch onFilterChange={vi.fn()} />
      </Scope>,
    );

    await exerciseClearAndReplace(searchClients, view.baseElement);
  });

  it("clears and preserves loading ownership in the generation modal search", async () => {
    const searchClients = vi.fn();
    const view = render(
      <Scope data={createAdapter(searchClients)}>
        <GenerateClaimModal
          open
          initialClientGroup={null}
          readyToClaimRows={noReadyRows}
          onClose={vi.fn()}
          onGenerate={vi.fn()}
        />
      </Scope>,
    );

    await exerciseClearAndReplace(searchClients, view.baseElement);
  });
});
