import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.hoisted(() => vi.fn());
const useListClientsQuery = vi.hoisted(() => vi.fn());
const useGetClientStatsQuery = vi.hoisted(() => vi.fn());
const useListAllAgenciesQuery = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => navigate };
});
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { profile: { accessList: [] } } }) }));
vi.mock("@/lib/api/clients", () => ({
  useListClientsQuery,
  useGetClientStatsQuery,
}));
vi.mock("@/pages/super-admin/agencies/api", () => ({ useListAllAgenciesQuery }));

import ClientsDirectory from "./index";

describe("super-admin clients directory", () => {
  beforeEach(() => {
    useListAllAgenciesQuery.mockReturnValue({
      data: { agencies: [{ id: "atlas", name: "Atlas Care" }] },
      isLoading: false,
    });
  });

  it("uses the shift-management workspace hierarchy without a date-range selector", () => {
    useListClientsQuery.mockReturnValue({ data: undefined, isLoading: true, isFetching: true });
    useGetClientStatsQuery.mockReturnValue({ data: undefined });

    render(<ClientsDirectory />);

    expect(screen.getByText("Operations")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Clients directory" })).toBeVisible();
    expect(screen.getByText("Agency scope")).toBeVisible();
    expect(screen.queryByText("Date range")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Loading clients directory")).toBeVisible();
    expect(screen.getAllByTestId("client-directory-skeleton-row")).toHaveLength(7);
  });

  it("scopes client data and the summary count to a selected agency", async () => {
    useListClientsQuery.mockReturnValue({
      data: { success: true, total: 1, count: 1, clients: [{ id: "client-1", firstName: "Avery", lastName: "Stone", status: "active" }] },
      isLoading: false,
      isFetching: false,
    });
    useGetClientStatsQuery.mockReturnValue({ data: { stats: { total: 4, active: 4, inactive: 0 } } });

    render(<ClientsDirectory />);
    await userEvent.selectOptions(screen.getByLabelText("Agency scope"), "atlas");

    expect(useListClientsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ agencyId: "atlas", agency: true }),
    );
    expect(useGetClientStatsQuery).toHaveBeenLastCalledWith({ agencyId: "atlas" }, { skip: false });
  });
});
