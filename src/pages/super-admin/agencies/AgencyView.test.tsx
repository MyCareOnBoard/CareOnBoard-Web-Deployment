import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AgencyView from "./AgencyView";
import {
  useGetSingleAgencyClientsQuery,
  useGetSingleAgencyUsersQuery,
  useGetSummaryAgencyInfoQuery,
  useUpdateAgencyStatusMutation,
} from "./api";

vi.mock("./api", () => ({
  superAdminApi: {
    reducerPath: "superAdminApi",
    reducer: (state = {}) => state,
    middleware: () => (next: (action: unknown) => unknown) =>
      (action: unknown) => next(action),
    util: {
      resetApiState: vi.fn(() => ({ type: "superAdminApi/reset" })),
    },
  },
  useGetSummaryAgencyInfoQuery: vi.fn(),
  useUpdateAgencyStatusMutation: vi.fn(),
  useGetSingleAgencyUsersQuery: vi.fn(),
  useGetSingleAgencyClientsQuery: vi.fn(),
}));

vi.mock("@/components/DashboardHeader", () => ({
  UserAvatar: () => null,
}));

describe("AgencyView", () => {
  beforeEach(() => {
    vi.mocked(useGetSummaryAgencyInfoQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetSummaryAgencyInfoQuery>);
    vi.mocked(useUpdateAgencyStatusMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateAgencyStatusMutation>);
    vi.mocked(useGetSingleAgencyUsersQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGetSingleAgencyUsersQuery>);
    vi.mocked(useGetSingleAgencyClientsQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGetSingleAgencyClientsQuery>);
  });

  it("renders an accessible reduced-motion-safe loader while agency details are pending", () => {
    render(
      <MemoryRouter initialEntries={["/super-admin/agencies/agency-1"]}>
        <Routes>
          <Route path="/super-admin/agencies/:id" element={<AgencyView />} />
        </Routes>
      </MemoryRouter>,
    );

    const status = screen.getByRole("status", { name: "Loading agency" });
    expect(status).toHaveTextContent("Loading agency...");

    const loader = status.querySelector("svg");
    expect(loader).not.toBeNull();
    expect(loader).toHaveClass(
      "animate-spin",
      "motion-reduce:animate-none",
      "text-[#00b4b8]",
    );
  });
});
