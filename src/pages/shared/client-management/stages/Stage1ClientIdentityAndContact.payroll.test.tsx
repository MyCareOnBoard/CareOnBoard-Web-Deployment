import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialAddClientFormData } from "../types/formData";
import { Stage1ClientIdentityAndContact } from "./Stage1ClientIdentityAndContact";

const { selectSuggestion } = vi.hoisted(() => ({ selectSuggestion: vi.fn() }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: undefined }) }));
vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/hooks/useGooglePlacesAutocomplete", () => ({
  useGooglePlacesAutocomplete: () => ({ suggestions: [{ placeId: "same-primary-address", mainText: "42 Service Lane", secondaryText: "Newark, NJ" }], isSearching: false, showSuggestions: true, setShowSuggestions: vi.fn(), handleInputChange: vi.fn(), selectSuggestion }),
  fetchFirstPlaceDetailsForQuery: vi.fn(),
}));

function completeServiceAddresses() {
  const form = createInitialAddClientFormData();
  Object.assign(form.stage1, {
    address: "42 Service Lane, Newark, NJ 07102, USA",
    location: { lat: "40.7357", lon: "-74.1724" },
    line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US",
    secondaryAddress: "99 New Street, Newark, NJ 07102, USA",
    secondaryLocation: { lat: "40.7357", lon: "-74.1724" },
    secondaryLine1: "99 New Street", secondaryCity: "Newark", secondaryState: "NJ", secondaryPostalCode: "07102", secondaryCountry: "US",
    payrollServiceLocations: [
      { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" },
      { source: "secondaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-09-01" },
    ],
  });
  return form;
}

describe("Stage 1 payroll service locations", () => {
  it("renders a separate confirmation and effective date for each structured service address", () => {
    const formData = completeServiceAddresses();
    render(<Stage1ClientIdentityAndContact formData={formData} setFormData={vi.fn()} footer={null} />);

    expect(screen.getByRole("checkbox", { name: /services are delivered at this primary address/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /services are delivered at this secondary address/i })).toBeChecked();
    expect(screen.getByRole("button", { name: /primary service effective date/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /secondary service effective date/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Aug 14, 2026")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sep 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("Primary Address")).toBeInTheDocument();
    expect(screen.getByText("Secondary Address (Optional)")).toBeInTheDocument();
    expect(screen.getByText(/later address changes will not rewrite earlier payroll records/i)).toBeInTheDocument();
  });

  it("keeps verified street, city, state, and ZIP fields search-driven", () => {
    const formData = completeServiceAddresses();
    render(<Stage1ClientIdentityAndContact formData={formData} setFormData={vi.fn()} footer={null} />);

    for (const id of ["primary-street-address", "primary-city", "primary-state", "primary-postal-code", "secondary-street-address", "secondary-city", "secondary-state", "secondary-postal-code"]) {
      expect(document.getElementById(id)).toHaveAttribute("readonly");
    }
    expect(screen.getAllByText(/select an address to fill the verified payroll address fields below/i)).toHaveLength(2);
  });

  it("shows a linked secondary effective-date error", () => {
    const formData = completeServiceAddresses();
    formData.stage1.payrollServiceLocations = [
      { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" },
      { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "" },
    ];
    render(<Stage1ClientIdentityAndContact formData={formData} setFormData={vi.fn()} footer={null} />);

    expect(screen.getByRole("button", { name: /secondary service effective date/i })).toHaveAttribute("aria-describedby", "actual-secondary-service-location-effective-from-error");
    expect(screen.getByRole("alert")).toHaveTextContent(/choose an effective date before saving/i);
  });

  it("does not permit a manual secondary address change to invalidate verified coordinates", () => {
    const formData = completeServiceAddresses();
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => {
      current = typeof update === "function" ? update(current) : update;
    };
    render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);

    fireEvent.change(document.getElementById("secondary-street-address")!, { target: { value: "100 New Street" } });

    expect(current.stage1.secondaryLine1).toBe("99 New Street");
    expect(current.stage1.payrollServiceLocations).toEqual([
      { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" },
      { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-09-01" },
    ]);
  });

  it("keeps an absent service-location choice absent while the primary address search changes", () => {
    const formData = completeServiceAddresses();
    formData.stage1.payrollServiceLocations = undefined;
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => {
      current = typeof update === "function" ? update(current) : update;
    };
    render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);

    fireEvent.change(document.getElementById("primary-mailing-address")!, { target: { value: "100 New Street" } });

    expect(current.stage1.payrollServiceLocations).toBeUndefined();
  });

  it("preserves a primary confirmation when the same autocomplete address is selected again", async () => {
    selectSuggestion.mockResolvedValueOnce({ formattedAddress: "42 Service Lane, Newark, NJ 07102, USA", lat: 40.7357, lng: -74.1724, county: "Essex", line1: "42 Service Lane", line2: null, city: "Newark", state: "NJ", stateLong: "New Jersey", zipCode: "07102", country: "US" });
    const formData = completeServiceAddresses();
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => {
      current = typeof update === "function" ? update(current) : update;
    };
    render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole("option", { name: /42 service lane/i })[0]);
    });

    await vi.waitFor(() => expect(selectSuggestion).toHaveBeenCalledWith("same-primary-address"));
    await vi.waitFor(() => expect(current.stage1.payrollServiceLocations).toContainEqual({ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" }));
  });
});
