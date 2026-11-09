import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import FieldStaffHelpCenterPage from "./index";
import { FIELD_STAFF_FAQS } from "./faqs";

it("opens one answer at a time and links to the agency", async () => {
  render(<MemoryRouter><FieldStaffHelpCenterPage /></MemoryRouter>);
  const [first, second] = FIELD_STAFF_FAQS;
  const firstButton = screen.getByRole("button", { name: first.question });
  expect(firstButton).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(first.answer)).toBeVisible();

  await userEvent.click(screen.getByRole("button", { name: second.question }));
  expect(firstButton).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText(second.answer)).toBeVisible();
  expect(screen.queryByText(first.answer)).not.toBeVisible();

  await userEvent.click(screen.getByRole("button", { name: second.question }));
  expect(screen.queryByText(second.answer)).not.toBeVisible();

  for (const link of [screen.getByRole("link", { name: "Contact support agency" }), screen.getByRole("link", { name: "Contact us" })]) {
    expect(link).toHaveAttribute("href", "/user-panel/messages");
  }
});
