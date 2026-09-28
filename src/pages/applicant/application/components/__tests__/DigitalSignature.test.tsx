import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import DigitalSignatureModal from "../DigitalSignature";

const signDocument = vi.hoisted(() => vi.fn(() => ({ unwrap: async () => ({}) })));
vi.mock("@/pages/applicant/application/api", () => ({
  useSignDocumentMutation: () => [signDocument],
}));

afterEach(() => vi.restoreAllMocks());

it("keeps the signature modal open until submission succeeds", async () => {
  const user = userEvent.setup();
  const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
  let rejectSubmission!: (error: Error) => void;
  const proceed = vi.fn()
    .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectSubmission = reject; }))
    .mockResolvedValue(undefined);
  function Harness() {
    const [isOpen, setIsOpen] = useState(true);
    return <DigitalSignatureModal isOpen={isOpen} setIsOpen={setIsOpen} proceed={proceed} useCase="official-hire" />;
  }

  render(<Harness />);
  await user.type(screen.getByPlaceholderText("Type your signature here"), "Applicant");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(proceed).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

  await act(async () => rejectSubmission(new Error("Submission failed")));
  await waitFor(() => expect(alert).toHaveBeenCalledWith(
    "Signature saved, but the next step could not be completed. Please try again.",
  ));
  expect(screen.getByRole("dialog")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(proceed).toHaveBeenCalledTimes(2);
  expect(signDocument).toHaveBeenCalledTimes(1);
});
