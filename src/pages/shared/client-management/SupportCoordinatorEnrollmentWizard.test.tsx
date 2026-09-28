import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi, test, expect } from "vitest";
import type { AddressDetails } from "@/hooks/useGooglePlacesAutocomplete";
import { getAgencyClientById, updateClient, type Client } from "@/lib/api/clients";
import { SupportCoordinatorEnrollmentWizard } from "./SupportCoordinatorEnrollmentWizard";

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.unmock("react-router");
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/api/clients", () => ({ createClient: vi.fn(), getAgencyClientById: vi.fn(), updateClient: vi.fn(), uploadClientDocument: vi.fn() }));
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

test("edit wizard loads saved fields and preserves outcome services and status", async () => {
  const service = { id: "service-1", name: "Community coaching" };
  const client = {
    id: "real-1", firstName: "Alex", lastName: "Example", dateOfBirth: "1990-01-02", status: "active",
    primaryAddress: { address: "42 Service Lane, Newark, NJ 07102", line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102" },
    scOutcomes: [{ id: "outcome-1", statement: "Join activities", services: [service] }],
    scEnrollment: { program: "SP", hasGuardian: false, familyMemberParticipates: false, eligibility: { medicaid: true, functional: true, financial: true, njResident: true, documents: true, requirements: true }, agreementSummaryReviewed: true, participantSignature: "Alex Example", participantSignatureImage: "data:image/png;base64,YQ==", signedOn: "2026-01-01" },
  } as Client;
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  let finishSave!: (value: Client) => void;
  vi.mocked(updateClient).mockImplementationOnce(() => new Promise<Client>(resolve => { finishSave = resolve; }));
  const { container } = render(<MemoryRouter initialEntries={["/agency/clients/edit/real-1"]}><Routes><Route path="/agency/clients/edit/:clientId" element={<SupportCoordinatorEnrollmentWizard isEditMode />} /><Route path="/agency/clients/:clientId" element={<p>Client details</p>} /></Routes></MemoryRouter>);
  expect(screen.getByRole("status", { name: "Loading client enrollment" })).toBeInTheDocument();
  expect(container.querySelector(".sc-enrollment-sidebar .animate-pulse")).toBeInTheDocument();
  expect(container.querySelector(".sc-enrollment-main .animate-pulse")).toBeInTheDocument();
  expect(await screen.findByText("Editing Alex Example")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Guardian \/ representative.*Completed/ }));
  fireEvent.click(screen.getByRole("button", { name: "Remove outcome 1" }));
  expect(screen.getByRole("dialog", { name: "Remove outcome 1?" })).toHaveTextContent("remove 1 attached service");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("textbox", { name: "Outcome 1" })).toHaveValue("Join activities");
  fireEvent.change(screen.getByRole("textbox", { name: "Outcome 1" }), { target: { value: "" } });
  expect(screen.getByRole("button", { name: "Remove outcome 1" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: /Review & sign.*Completed/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByRole("alert")).toHaveTextContent("An outcome with attached services needs a statement.");
  expect(updateClient).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox", { name: "Outcome 1" }), { target: { value: "Join more activities" } });
  fireEvent.click(screen.getByRole("button", { name: /Review & sign.*Completed/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  const savingButton = await screen.findByRole("button", { name: "Saving…" });
  expect(savingButton).toBeDisabled();
  expect(savingButton.querySelector("svg.animate-spin")).toBeInTheDocument();
  await waitFor(() => expect(updateClient).toHaveBeenCalledWith("real-1", expect.objectContaining({
    scOutcomes: [{ id: "outcome-1", statement: "Join more activities", services: [service] }],
  })));
  expect(vi.mocked(updateClient).mock.calls[0][1]).not.toHaveProperty("status");
  finishSave(client);
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Client updated", variant: "success" })));
});

test("confirmed outcome removal includes attached services in the saved change", async () => {
  const client = {
    id: "real-1", firstName: "Alex", lastName: "Example",
    scOutcomes: [{ id: "outcome-1", statement: "Join activities", services: [{ id: "service-1", name: "Community coaching" }] }],
    scEnrollment: { program: "SP", hasGuardian: false, familyMemberParticipates: false, eligibility: { medicaid: true, functional: true, financial: true, njResident: true, documents: true, requirements: true }, agreementSummaryReviewed: true, participantSignature: "Alex Example", participantSignatureImage: "data:image/png;base64,YQ==", signedOn: "2026-01-01" },
  } as Client;
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  vi.mocked(updateClient).mockReset();
  vi.mocked(updateClient).mockResolvedValue(client);
  render(<MemoryRouter initialEntries={["/agency/clients/edit/real-1"]}><Routes><Route path="/agency/clients/edit/:clientId" element={<SupportCoordinatorEnrollmentWizard isEditMode />} /><Route path="/agency/clients/:clientId" element={<p>Client details</p>} /></Routes></MemoryRouter>);
  expect(await screen.findByText("Editing Alex Example")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Guardian \/ representative.*Completed/ }));
  fireEvent.click(screen.getByRole("button", { name: "Remove outcome 1" }));
  expect(screen.getByDisplayValue("Join activities")).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("dialog", { name: "Remove outcome 1?" })).getByRole("button", { name: "Remove outcome" }));
  expect(screen.queryByRole("textbox", { name: "Outcome 1" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Review & sign.*Completed/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(updateClient).toHaveBeenCalledWith("real-1", expect.objectContaining({ scOutcomes: [] })));
});
