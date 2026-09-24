import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format, startOfWeek } from "date-fns";
import { expect, it } from "vitest";
import SupportCoordinatorMonitoringTab from "./SupportCoordinatorMonitoringTab";

it("opens monitoring on the current week with today selected", async () => {
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const user = userEvent.setup();
  render(<SupportCoordinatorMonitoringTab sample />);

  expect(screen.getByText(format(today, "EEE, MMMM d"))).toBeInTheDocument();
  expect(screen.getByRole("button", { name: format(today, "EEEE, MMMM d, yyyy") })).toHaveAttribute("aria-current", "date");
  expect(screen.getByRole("button", { name: format(monday, "EEEE, MMMM d, yyyy") })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: format(addDays(monday, 6), "EEEE, MMMM d, yyyy") })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start monitoring" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Next week" }));
  expect(screen.getByText(format(addDays(today, 7), "EEE, MMMM d"))).toBeInTheDocument();
  expect(screen.getByText("No services scheduled for this date.")).toBeInTheDocument();
});
