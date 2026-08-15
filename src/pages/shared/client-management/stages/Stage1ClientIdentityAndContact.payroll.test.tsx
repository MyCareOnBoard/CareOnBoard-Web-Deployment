import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialAddClientFormData } from "../types/formData";
import { formDataToApiPayload } from "../utils/formDataToApiPayload";
import { mergeExtractionDraft } from "../utils/mergeExtractionDraft";
import { Stage1ClientIdentityAndContact } from "./Stage1ClientIdentityAndContact";

vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: undefined }) }));
vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }));
const { selectSuggestion, fetchFirstPlaceDetailsForQuery, autocompleteState, setShowSuggestions } = vi.hoisted(() => {
  const autocompleteState = { showSuggestions: true };
  return {
    selectSuggestion: vi.fn(),
    fetchFirstPlaceDetailsForQuery: vi.fn(),
    autocompleteState,
    setShowSuggestions: vi.fn((show: boolean) => { autocompleteState.showSuggestions = show; }),
  };
});
vi.mock("@/hooks/useGooglePlacesAutocomplete", () => ({
  useGooglePlacesAutocomplete: () => ({ suggestions: [{ placeId: "same-place", description: "42 Service Lane" }], isSearching: false, showSuggestions: autocompleteState.showSuggestions, setShowSuggestions, handleInputChange: vi.fn(), selectSuggestion, clearSuggestions: vi.fn() }),
  fetchFirstPlaceDetailsForQuery,
}));

describe("Stage 1 payroll service-location attestation", () => {
  beforeEach(() => {
    selectSuggestion.mockReset();
    fetchFirstPlaceDetailsForQuery.mockReset();
    setShowSuggestions.mockClear();
    autocompleteState.showSuggestions = true;
  });
  it("renders an accessible selected-attestation date control and resets only a manually changed primary identity", () => {
    const formData = createInitialAddClientFormData();
    Object.assign(formData.stage1, {
      address: "42 Service Lane, Newark, NJ 07102, USA",
      location: { lat: "40.7357", lon: "-74.1724" },
      line1: "42 Service Lane",
      line2: "Suite 3",
      city: "Newark",
      state: "NJ",
      postalCode: "07102",
      country: "US",
      payrollServiceLocation: { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" },
    });
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => {
      current = typeof update === "function" ? update(current) : update;
    };

    const { rerender } = render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    const checkbox = screen.getByRole("checkbox", { name: /where services are actually delivered/i });
    expect(checkbox).toBeChecked();
    const date = screen.getByLabelText(/effective date/i);
    expect(date).toHaveValue("2026-08-14");
    expect(date).toBeRequired();

    fireEvent.change(screen.getByPlaceholderText("Enter primary address"), { target: { value: "43 Service Lane" } });
    rerender(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    expect(current.stage1.payrollServiceLocation).toBeNull();
    expect(current.stage1.line1).toBeUndefined();

    current = { ...current, stage1: { ...current.stage1, line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US", payrollServiceLocation: { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" } } };
    rerender(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    fireEvent.change(screen.getByPlaceholderText("Enter email"), { target: { value: "new@example.com" } });
    expect(current.stage1.payrollServiceLocation).toEqual({ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" });
  });

  it("shows a visible linked error when a checked attestation has no effective date", () => {
    const formData = createInitialAddClientFormData();
    Object.assign(formData.stage1, { line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US", payrollServiceLocation: { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "" } });
    render(<Stage1ClientIdentityAndContact formData={formData} setFormData={vi.fn()} footer={null} />);

    const date = screen.getByLabelText(/effective date/i);
    expect(date).toHaveAttribute("aria-describedby", "actual-service-location-effective-from-error");
    expect(screen.getByRole("alert")).toHaveTextContent(/effective date is required/i);
  });

  it("disables the named attestation checkbox until a complete structured primary address exists", () => {
    const formData = createInitialAddClientFormData();
    render(<Stage1ClientIdentityAndContact formData={formData} setFormData={vi.fn()} footer={null} />);
    expect(screen.getByRole("checkbox", { name: /where services are actually delivered/i })).toBeDisabled();
  });

  it("selects a primary Places suggestion with ArrowDown and Enter", async () => {
    selectSuggestion.mockResolvedValueOnce({ formattedAddress: "42 Service Lane, Newark, NJ 07102, USA", lat: 40.7, lng: -74, county: "Essex", line1: "42 Service Lane", line2: null, city: "Newark", state: "NJ", stateLong: "New Jersey", zipCode: "07102", country: "US" });
    const formData = createInitialAddClientFormData();
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => { current = typeof update === "function" ? update(current) : update; };
    const { rerender } = render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    const address = screen.getByLabelText(/primary \/ mailing address/i);
    fireEvent.focus(address);
    fireEvent.keyDown(address, { key: "ArrowDown" });
    fireEvent.keyDown(address, { key: "Enter" });
    await waitFor(() => expect(current.stage1.line1).toBe("42 Service Lane"));
    rerender(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    expect(screen.getByRole("checkbox", { name: /where services are actually delivered/i })).toBeEnabled();
  });

  it("reopens hidden Places suggestions before keyboard selection", () => {
    const formData = createInitialAddClientFormData();
    const { rerender } = render(<Stage1ClientIdentityAndContact formData={formData} setFormData={vi.fn()} footer={null} />);
    const address = screen.getByLabelText(/primary \/ mailing address/i);

    fireEvent.keyDown(address, { key: "Escape" });
    rerender(<Stage1ClientIdentityAndContact formData={formData} setFormData={vi.fn()} footer={null} />);
    expect(address).toHaveAttribute("aria-expanded", "false");
    expect(address).not.toHaveAttribute("aria-activedescendant");

    fireEvent.keyDown(address, { key: "ArrowDown" });
    expect(address).toHaveAttribute("aria-expanded", "true");
    expect(address).toHaveAttribute("aria-activedescendant", "primary-address-suggestion-0");
  });

  it("creates, completes, and explicitly opts out of the attestation through its accessible controls", () => {
    const formData = createInitialAddClientFormData();
    Object.assign(formData.stage1, { line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US" });
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => { current = typeof update === "function" ? update(current) : update; };
    const { rerender } = render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    expect(screen.getByLabelText(/primary \/ mailing address/i)).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", { name: /where services are actually delivered/i });
    expect(checkbox).toBeEnabled();
    fireEvent.click(checkbox);
    expect(current.stage1.payrollServiceLocation).toEqual({ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "" });
    rerender(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    fireEvent.change(screen.getByLabelText(/effective date/i), { target: { value: "2026-08-14" } });
    expect(current.stage1.payrollServiceLocation).toEqual({ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" });
    rerender(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /where services are actually delivered/i }));
    expect(current.stage1.payrollServiceLocation).toBeNull();
  });

  it("preserves an attestation when the same Places identity is reselected despite case, whitespace, and empty line2", async () => {
    selectSuggestion.mockResolvedValueOnce({ formattedAddress: "42 Service Lane, Newark, NJ 07102, USA", lat: 40.7, lng: -74, county: "Essex", line1: " 42  service lane ", line2: null, city: " NEWARK ", state: "nj", stateLong: "New Jersey", zipCode: "07102", country: "us" });
    const formData = createInitialAddClientFormData();
    Object.assign(formData.stage1, { line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US", payrollServiceLocation: { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" } });
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => { current = typeof update === "function" ? update(current) : update; };
    render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    fireEvent.click(screen.getAllByText("42 Service Lane")[0]);
    await waitFor(() => expect(current.stage1.line1).toBe("42 service lane"));
    expect(current.stage1.payrollServiceLocation).toEqual({ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" });
    expect(formDataToApiPayload(current, false, true, false)).toMatchObject({ primaryAddress: { country: "US" }, payrollServiceLocation: { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" } });
  });

  it("resets the attestation when a different Places identity is selected", async () => {
    selectSuggestion.mockResolvedValueOnce({ formattedAddress: "99 New Street, Newark, NJ 07102, USA", lat: 40.7, lng: -74, county: "Essex", line1: "99 New Street", line2: null, city: "Newark", state: "NJ", stateLong: "New Jersey", zipCode: "07102", country: "US" });
    const formData = createInitialAddClientFormData();
    Object.assign(formData.stage1, { line1: "42 Service Lane", line2: "Suite 3", city: "Newark", state: "NJ", postalCode: "07102", country: "US", payrollServiceLocation: { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" } });
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => { current = typeof update === "function" ? update(current) : update; };
    render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    fireEvent.click(screen.getAllByText("42 Service Lane")[0]);
    await waitFor(() => expect(current.stage1.line1).toBe("99 New Street"));
    expect(current.stage1.payrollServiceLocation).toBeNull();
    expect(current.stage1.line2).toBeNull();
  });

  it("resets the attestation when imported geocoding resolves a different structured address", async () => {
    fetchFirstPlaceDetailsForQuery.mockResolvedValueOnce({ formattedAddress: "99 New Street, Newark, NJ 07102, USA", lat: 40.7, lng: -74, county: "Essex", line1: "99 New Street", line2: null, city: "Newark", state: "NJ", stateLong: "New Jersey", zipCode: "07102", country: "US" });
    const formData = createInitialAddClientFormData();
    Object.assign(formData, { _pendingImportedPrimaryGeocode: true });
    Object.assign(formData.stage1, { address: "99 New Street", line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US", payrollServiceLocation: { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" } });
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => { current = typeof update === "function" ? update(current) : update; };
    render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    await waitFor(() => expect(current.stage1.payrollServiceLocation).toBeNull());
  });

  it("treats an HHA apartment edit as a line2 identity change without clearing the rest of the address", () => {
    const formData = createInitialAddClientFormData();
    formData.type = "hha";
    Object.assign(formData.stage1, { line1: "42 Service Lane", line2: "Unit 3", city: "Newark", state: "NJ", postalCode: "07102", country: "US", homeInfo: { ...formData.stage1.homeInfo, apartmentNumber: "Unit 3" }, payrollServiceLocation: { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" } });
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => { current = typeof update === "function" ? update(current) : update; };
    render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    fireEvent.change(screen.getByPlaceholderText("Apartment, unit, or suite"), { target: { value: "Unit 4" } });

    expect(current.stage1.line2).toBe("Unit 4");
    expect(current.stage1.homeInfo?.apartmentNumber).toBe("Unit 4");
    expect(current.stage1.payrollServiceLocation).toBeNull();
    expect(current.stage1).toMatchObject({ line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US" });
  });

  it("preserves an imported HHA unit when subsequent Places geocoding has no subpremise", async () => {
    const initial = createInitialAddClientFormData();
    initial.type = "hha";
    Object.assign(initial.stage1, { address: "42 Service Lane", location: { lat: "40", lon: "-74" }, line1: "42 Service Lane", line2: "Unit 3", city: "Newark", state: "NJ", postalCode: "07102", country: "US", homeInfo: { ...initial.stage1.homeInfo, apartmentNumber: "Unit 3" }, payrollServiceLocation: { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" } });
    const { formData } = mergeExtractionDraft(initial, { detectedDocumentType: "unknown", draft: { stage1: { address: "99 New Street", homeInfo: { apartmentNumber: "Unit 4" } } }, fieldConfidences: [], warnings: [], unmappedText: [] }, { overwrite: true });
    fetchFirstPlaceDetailsForQuery.mockResolvedValueOnce({ formattedAddress: "99 New Street", lat: 40, lng: -74, county: "Essex", line1: "99 New Street", line2: null, city: "Newark", state: "New Jersey", stateLong: "New Jersey", stateCode: "NJ", zipCode: "07102", country: "United States", countryCode: "US" });
    let current = formData;
    const setFormData = (update: React.SetStateAction<typeof formData>) => { current = typeof update === "function" ? update(current) : update; };
    render(<Stage1ClientIdentityAndContact formData={current} setFormData={setFormData} footer={null} />);
    await waitFor(() => expect(current._pendingImportedPrimaryGeocode).toBeUndefined());
    expect(screen.getByLabelText(/apartment number/i)).toHaveValue("Unit 4");
    expect(current.stage1.line2).toBe("Unit 4");
    expect(current.stage1.payrollServiceLocation).toBeNull();
    expect(formDataToApiPayload(current, false, true, false).primaryAddress?.line2).toBe("Unit 4");
  });
});
