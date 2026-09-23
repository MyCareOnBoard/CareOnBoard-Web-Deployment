import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi, test, expect } from "vitest";
import type { AddressDetails } from "@/hooks/useGooglePlacesAutocomplete";
import { SupportCoordinatorEnrollmentWizard } from "./SupportCoordinatorEnrollmentWizard";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api/clients", () => ({ createClient: vi.fn(), updateClient: vi.fn(), uploadClientDocument: vi.fn() }));
vi.mock("./components/forms/AddressAutocompleteField", () => ({
  AddressAutocompleteField: ({ label, value, onChange, onSelectDetails }: { label: string; value: string; onChange: (value: string) => void; onSelectDetails?: (details: AddressDetails) => void }) => <div><input aria-label={label} value={value} onChange={event => onChange(event.target.value)} /><button type="button" onClick={() => onSelectDetails?.({ formattedAddress: "42 Service Lane, Newark, NJ 07102", line1: "42 Service Lane", street: "Service Lane", line2: null, city: "Newark", county: "Essex", state: "NJ", stateLong: "New Jersey", stateCode: "NJ", zipCode: "07102", country: "US", countryCode: "US", lat: 40, lng: -74 })}>Use sample address</button></div>,
}));

test("SC wizard enables the first step after selecting a program and counts completed sections", () => {
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  expect(screen.getByRole("button", { name: "Get started" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /Supports Program SP/ }));
  expect(screen.getByRole("button", { name: "Get started" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.getByRole("heading", { name: "Participant information" })).toBeInTheDocument();
  expect(screen.getByText("1 of 6 steps completed")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Program selection.*Completed/ })).toBeInTheDocument();
  const ssn = screen.getByLabelText("SSN");
  expect(ssn).toHaveAttribute("type", "password");
  fireEvent.change(ssn, { target: { value: "123456789" } });
  expect(ssn).toHaveValue("123-45-6789");
  fireEvent.click(screen.getByRole("button", { name: "Show SSN" }));
  expect(ssn).toHaveAttribute("type", "text");
  fireEvent.click(screen.getByRole("button", { name: "Use sample address" }));
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("42 Service Lane");
  expect(screen.getByRole("textbox", { name: "City" })).toHaveValue("Newark");
  expect(screen.getByRole("textbox", { name: "State" })).toHaveValue("NJ");
  expect(screen.getByRole("textbox", { name: "ZIP code" })).toHaveValue("07102");
  fireEvent.change(screen.getByRole("textbox", { name: "Primary address search" }), { target: { value: "Other address" } });
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("");
});

test("step one opens the document modal with download disabled", () => {
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  expect(screen.getByRole("dialog", { name: "Download & fill forms" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download document here" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Upload document" })).toBeDisabled();
});

test("participant photo upload previews the selected image and rejects other files", async () => {
  URL.createObjectURL = vi.fn(() => "blob:client-photo");
  URL.revokeObjectURL = vi.fn();
  const { container } = render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /Supports Program SP/ }));
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  const input = screen.getByLabelText("Client photo");
  fireEvent.change(input, { target: { files: [new File(["not an image"], "notes.pdf", { type: "application/pdf" })] } });
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPG or PNG photo up to 5 MB.");
  fireEvent.change(input, { target: { files: [new File(["image"], "client-photo.png", { type: "image/png" })] } });
  await waitFor(() => expect(container.querySelector(".sc-enrollment-photo-preview")).toHaveAttribute("src", "blob:client-photo"));
  expect(screen.getByText("Photo ready")).toBeInTheDocument();
  expect(screen.getByText(/client-photo.png · Click or drop to replace/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
