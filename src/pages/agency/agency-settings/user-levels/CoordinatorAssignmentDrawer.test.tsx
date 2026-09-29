import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

const listEmployees = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/employees", () => ({ listEmployees }));
import CoordinatorAssignmentDrawer from "./CoordinatorAssignmentDrawer";

it("searches coordinators and saves the selected IDs with the original selection", async () => {
  listEmployees.mockResolvedValue({ employees: [
    { id: "sc-a", fullName: "Ari Coordinator", email: "ari@example.com" },
    { id: "sc-b", fullName: "Bea Coordinator", email: "bea@example.com" },
  ], nextCursor: null });
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<CoordinatorAssignmentDrawer staffName="Morgan" agencyId="agency-a" assignedIds={["sc-a"]} canAssign onClose={onClose} onSave={onSave} />);
  expect(await screen.findByRole("checkbox", { name: /Ari Coordinator/ })).toBeChecked();
  await user.type(screen.getByLabelText("Search coordinators"), "bea");
  expect(screen.queryByRole("checkbox", { name: /Ari Coordinator/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: /Bea Coordinator/ }));
  await user.click(screen.getByRole("button", { name: "Save assignments" }));
  expect(onSave).toHaveBeenCalledWith(["sc-a", "sc-b"], ["sc-a"]);
  expect(onClose).toHaveBeenCalledOnce();
});
