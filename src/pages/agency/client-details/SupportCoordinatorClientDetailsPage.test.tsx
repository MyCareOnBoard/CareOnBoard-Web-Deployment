import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format, startOfWeek } from "date-fns";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
vi.unmock("react-router");
import SupportCoordinatorClientDetailsPage from "./SupportCoordinatorClientDetailsPage";

const scrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeAll(() => Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: () => {} }));
afterAll(() => {
  if (scrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

it("keeps the client header while routing tabs through the query parameter", async () => {
  const user = userEvent.setup();
  function Location() { const location = useLocation(); return <output data-testid="location">{location.search}</output>; }
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=profile-isp"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<><SupportCoordinatorClientDetailsPage /><Location /></>} /></Routes>
  </MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "DDD Assessment & Determination" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Assessment & Tier" })).toHaveAttribute("aria-current", "page");
  await user.click(screen.getByRole("button", { name: "View NJCAT Document" }));
  const dialog = screen.getByRole("dialog", { name: "NJCAT Assessment" });
  expect(within(dialog).getAllByText("02/23/2026")).toHaveLength(2);
  expect(within(dialog).getByRole("button", { name: "Download" })).toBeDisabled();
  await user.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog", { name: "NJCAT Assessment" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "View Tier Letter Document" }));
  const tierDialog = screen.getByRole("dialog", { name: "Tier Letter — Tier D" });
  expect(within(tierDialog).getByText("DDD / iRecord")).toBeInTheDocument();
  expect(within(tierDialog).getByText("TierLetter_Alexander_2026.pdf")).toBeInTheDocument();
  expect(within(tierDialog).getByRole("button", { name: "Download" })).toBeDisabled();
  await user.click(within(tierDialog).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2026" }));
  const currentHistory = screen.getByRole("dialog", { name: "NJCAT — 2026" });
  expect(within(currentHistory).getByText("T. Booker")).toBeInTheDocument();
  expect(within(currentHistory).getByText(/Annual reassessment\. Tier D confirmed/)).toBeInTheDocument();
  await user.click(within(currentHistory).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2023" }));
  const oldHistory = screen.getByRole("dialog", { name: "NJCAT — 2023" });
  expect(within(oldHistory).getByText("Historical")).toBeInTheDocument();
  expect(within(oldHistory).getByText("04/11/2023")).toBeInTheDocument();
  await user.click(within(oldHistory).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "No, information is pending" }));
  expect(screen.getByRole("heading", { name: "Data Lineage" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Section A — NJCAT Status" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Planning" }));
  expect(screen.getByRole("heading", { name: "Person-Centered Planning" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Monitoring" }));
  expect(screen.getByTestId("location")).toHaveTextContent("?tab=monitoring");
  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Monitoring" })).toBeInTheDocument();
});

it("opens the ISP quality checklist and keeps the preview review on the page", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=planning"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  await user.click(screen.getByRole("button", { name: /ISP Quality Review Pre-finalization checklist Open/ }));
  const dialog = screen.getByRole("dialog", { name: "ISP Quality Review Checklist" });
  expect(within(dialog).getAllByRole("checkbox")).toHaveLength(8);
  await user.click(within(dialog).getByRole("checkbox", { name: "Plan is person-centered and reflects individual preferences and goals" }));
  expect(within(dialog).getByText("1 of 8 items confirmed")).toBeInTheDocument();
  await user.type(within(dialog).getByRole("textbox", { name: "Reviewer's name*" }), "T. Booker");
  await user.click(within(dialog).getByRole("button", { name: "Save review" }));
  expect(within(dialog).getByRole("textbox", { name: "Corrections note*" })).toBeInTheDocument();
  await user.type(within(dialog).getByRole("textbox", { name: "Corrections note*" }), "Confirm remaining documents.");
  await user.click(within(dialog).getByRole("button", { name: "Save review" }));
  expect(screen.queryByRole("dialog", { name: "ISP Quality Review Checklist" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /ISP Quality Review.*Saved in this preview/ })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /ISP Quality Review.*Saved in this preview/ }));
  expect(screen.getByRole("dialog", { name: "ISP Quality Review Checklist" })).toHaveTextContent("1 of 8 items confirmed");
});

it("opens the participant rights record and keeps its preview entries on the page", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=planning"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  await user.click(screen.getByRole("button", { name: /Participant Rights Rights & Responsibilities record Open/ }));
  const dialog = screen.getByRole("dialog", { name: "Participant Rights & Responsibilities" });
  expect(within(dialog).getByText("Rights include the right to:")).toBeInTheDocument();
  expect(within(dialog).getAllByRole("checkbox")).toHaveLength(3);
  expect(within(dialog).getByRole("button", { name: "Date of birth" })).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Participant or representative signature" })).toBeInTheDocument();
  await user.click(within(dialog).getByRole("checkbox", { name: "Presented to participant / representative" }));
  await user.click(within(dialog).getByRole("button", { name: "Save record" }));
  expect(screen.getByRole("button", { name: /Participant Rights.*Saved in this preview/ })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Participant Rights.*Saved in this preview/ }));
  const reopened = screen.getByRole("dialog", { name: "Participant Rights & Responsibilities" });
  expect(within(reopened).getByRole("checkbox", { name: "Presented to participant / representative" })).toBeChecked();
  expect(within(reopened).getByRole("button", { name: "Participant or representative signature" })).toBeInTheDocument();
});

it("shows sample service authorizations and responds to service actions", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=services"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Service Authorization" })).toBeInTheDocument();
  const services = screen.getAllByRole("article");
  expect(services).toHaveLength(3);
  expect(within(services[0]).getByRole("heading", { name: "Individual supports" })).toBeInTheDocument();
  expect(within(services[0]).getByText("90 hrs/week")).toBeInTheDocument();
  expect(within(services[1]).getByText("Missing")).toBeInTheDocument();
  expect(within(services[2]).getByText("Review")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Add service" }));
  const addService = screen.getByRole("dialog", { name: "Add service" });
  expect(within(addService).getByRole("textbox", { name: "Service code" })).toBeInTheDocument();
  expect(within(addService).getByRole("spinbutton", { name: "Total authorized units" })).toHaveAttribute("placeholder", "e.g. 120 total units");
  expect(within(addService).getByRole("combobox", { name: "Unit" })).toBeInTheDocument();
  await user.click(within(addService).getByRole("button", { name: "Cancel" }));
  await user.click(within(services[0]).getByRole("button", { name: "View details" }));
  const detail = screen.getByRole("dialog", { name: "Individual supports" });
  expect(detail).toHaveTextContent("Madu Sarah");
  expect(detail).toHaveTextContent("551.312.8522");
  expect(within(detail).getAllByRole("row")).toHaveLength(6);
  expect(detail).toHaveTextContent("Received · Effective 03/24/2026");
  await user.click(within(detail).getByRole("button", { name: "View PA document for Aug 10–16" }));
  expect(detail).toHaveTextContent("Sample PA document for Aug 10–16 is not available yet.");
  await user.click(within(detail).getByRole("button", { name: "Close" }));
  await user.click(within(services[1]).getByRole("button", { name: "View details" }));
  expect(screen.getByRole("dialog", { name: "Community Inclusion Services" })).toHaveTextContent("No prior authorization history recorded.");
});

it("adds a service to the local preview with total units and a selected unit", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=services"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  await user.click(screen.getByRole("button", { name: "Add service" }));
  const dialog = screen.getByRole("dialog", { name: "Add service" });
  await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "Community coaching");
  await user.type(within(dialog).getByRole("textbox", { name: "Service code" }), "H2020");
  await user.type(within(dialog).getByRole("textbox", { name: "Provider / Agency" }), "Sample Agency");
  await user.click(within(dialog).getByRole("button", { name: "Start date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.click(within(dialog).getByRole("button", { name: "End date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.type(within(dialog).getByRole("spinbutton", { name: "Total authorized units" }), "120");
  fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "Unit" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Hourly" }));
  await user.type(within(dialog).getByRole("spinbutton", { name: "Rate" }), "9.85");
  await user.click(within(dialog).getByRole("button", { name: "Add service" }));

  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(4);
  expect(within(cards[3]).getByRole("heading", { name: "Community coaching" })).toBeInTheDocument();
  expect(cards[3]).toHaveTextContent("120 total · Hourly");
  expect(cards[3]).toHaveTextContent("$1,182.00");
  expect(cards[3]).toHaveTextContent("Source: Local preview");
}, 15000);

it("handles monitoring dates, follow-up tasks, and service monitoring in the local preview", async () => {
  const user = userEvent.setup();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=monitoring"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(screen.getByText(format(today, "EEE, MMMM d"))).toBeInTheDocument();
  expect(screen.getByRole("button", { name: format(today, "EEEE, MMMM d, yyyy") })).toHaveAttribute("aria-current", "date");
  expect(screen.getByRole("button", { name: format(weekStart, "EEEE, MMMM d, yyyy") })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: format(addDays(weekStart, 6), "EEEE, MMMM d, yyyy") })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next week" }));
  expect(screen.getByText(format(addDays(today, 7), "EEE, MMMM d"))).toBeInTheDocument();
  expect(screen.getByText("No services scheduled for this date.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Previous week" }));

  await user.click(screen.getByRole("button", { name: "Follow up" }));
  const followUp = screen.getByRole("dialog", { name: "Follow-Up: Missing PA (Aug 10–16)" });
  expect(within(followUp).getByRole("button", { name: "Create follow-up task" })).toBeDisabled();
  fireEvent.keyDown(within(followUp).getByRole("combobox", { name: "Follow-Up Method" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Phone call" }));
  await user.click(within(followUp).getByRole("button", { name: "Create follow-up task" }));
  expect(screen.queryByRole("dialog", { name: "Follow-Up: Missing PA (Aug 10–16)" })).not.toBeInTheDocument();
  expect(screen.getByText("3 Pending")).toBeInTheDocument();
  expect(screen.getByText("Missing PA follow-up task created · Phone call")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Start monitoring" }));
  const monitoring = screen.getByRole("dialog", { name: "Individual Supports" });
  await user.click(within(monitoring).getByRole("button", { name: "Save monitoring record" }));
  expect(within(monitoring).getByRole("alert")).toHaveTextContent("Answer each monitoring question");
  for (const question of ["Service Delivery", "Client Satisfaction", "Goal Alignment"]) {
    const fieldset = within(monitoring).getByRole("group", { name: new RegExp(question) });
    await user.click(within(fieldset).getByRole("button", { name: "Yes" }));
  }
  await user.click(within(monitoring).getByRole("button", { name: "Save monitoring record" }));
  expect(screen.queryByRole("dialog", { name: "Individual Supports" })).not.toBeInTheDocument();
  expect(screen.getByText("Completed today")).toBeInTheDocument();
  expect(screen.getByText("Individual Supports monitoring recorded")).toBeInTheDocument();
}, 15000);

it("shows sample documents and adds an uploaded document to the local preview", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=documents"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Document Control" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("row")).toHaveLength(7);
  expect(within(table).getByText("NJ ISP — Plan 10.04")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Upload document" }));
  const dialog = screen.getByRole("dialog", { name: "Upload document" });
  await user.upload(within(dialog).getByLabelText("Document file"), new File(["sample"], "sample.pdf", { type: "application/pdf" }));
  fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "Document type" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Assessment" }));
  await user.type(within(dialog).getByRole("textbox", { name: "Document name" }), "Follow-up assessment");
  await user.click(within(dialog).getByRole("button", { name: "Effective date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.click(within(dialog).getByRole("button", { name: "Upload & save" }));

  expect(screen.queryByRole("dialog", { name: "Upload document" })).not.toBeInTheDocument();
  expect(within(table).getAllByRole("row")).toHaveLength(8);
  expect(within(table).getByText("Follow-up assessment")).toBeInTheDocument();
}, 15000);
