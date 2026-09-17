import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import CurrentRecordsLinks from "./CurrentRecordsLinks";
vi.mock("@/utils/auth", () => ({
  useAuth: () => ({
    user: {
      userType: "agency_staff",
      profile: {
        accessList: ["Compliance Alerts", "Trainings", "Client Management"],
        agencyModes: ["hha"],
      },
      agency: { supportedClientTypes: ["hha"] },
    },
  }),
}));
it("intersects fresh server permissions and emits date-free links without a list request", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const summary = {
    currentRecordSources: ["training", "document_expiry", "unsigned_form485"],
    riskTrends: [],
    complianceInsights: {
      breakdown: [{ key: "other" }, { key: "missingDocuments" }],
    },
  } as any;
  render(
    <MemoryRouter>
      <CurrentRecordsLinks summary={summary} mode="hha" />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(
    screen.getByRole("link", { name: "Training assignments" }),
  ).toHaveAttribute(
    "href",
    "/agency/compliance-alerts?section=staff&source=training&mode=hha",
  );
  expect(
    screen.queryByRole("link", {
      name: /Document expiry|Other|Missing document/,
    }),
  ).not.toBeInTheDocument();
  expect(
    screen
      .getByRole("link", { name: "Unsigned Form 485" })
      .getAttribute("href"),
  ).not.toMatch(/Date|cursor/);
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
