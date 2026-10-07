import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CareFormDialog, CarePager } from "./ui";

it("changes pages without submitting the surrounding form", () => {
  const submit = vi.fn();
  const next = vi.fn();
  render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <CarePager cursor="next-page" onNext={next} />
    </form>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(next).toHaveBeenCalledWith("next-page");
  expect(submit).not.toHaveBeenCalled();
});

it("returns keyboard focus to the opener after a controlled form dialog closes", async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Add a document</button>
        {open && (
          <CareFormDialog
            open
            title="Add document"
            onClose={() => setOpen(false)}
          >
            <label>
              Title
              <input />
            </label>
            <button onClick={() => setOpen(false)}>Cancel</button>
          </CareFormDialog>
        )}
      </>
    );
  }
  render(<Harness />);
  const opener = screen.getByRole("button", { name: "Add a document" });
  opener.focus();
  fireEvent.click(opener);
  expect(await screen.findByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(opener).toHaveFocus());
});
