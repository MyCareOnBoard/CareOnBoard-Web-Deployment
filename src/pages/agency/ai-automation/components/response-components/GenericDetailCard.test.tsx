import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GenericDetailCard from "./GenericDetailCard";
import { getAgencyClientById } from "@/lib/api/clients";

vi.mock("@/lib/api/clients", () => ({ getAgencyClientById: vi.fn() }));
const getClient = vi.mocked(getAgencyClientById);

const card = {
  title: "John Smith",
  sections: [{
    heading: "Documents",
    fields: [
      { label: "Consents & Releases", value: "On file", document: { clientId: "c1", index: 1, key: "consents", fileName: "consent.pdf" } },
      { label: "ISP", value: "Missing file" },
    ],
  }],
};

describe("GenericDetailCard documents", () => {
  beforeEach(() => getClient.mockReset());

  it("opens the client's file in the preview modal when clicked", async () => {
    getClient.mockResolvedValue({ documents: [
      { key: "isp", fileName: "isp.pdf", url: "https://files.example.test/isp.pdf" },
      { key: "consents", fileName: "consent.pdf", url: "https://files.example.test/consent.pdf?token=t" },
    ] } as never);
    render(<GenericDetailCard data={card} />);
    expect(screen.queryByRole("button", { name: /Preview ISP/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Preview Consents & Releases: consent\.pdf$/ }));
    await waitFor(() => expect(screen.getByTitle("Consents & Releases preview")).toHaveAttribute(
      "src", "https://files.example.test/consent.pdf?token=t#toolbar=0&navpanes=0"));
    expect(getClient).toHaveBeenCalledWith("c1", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("finds the file by key when the list moved, and refuses non-web URLs", async () => {
    getClient.mockResolvedValue({ documents: [{ key: "consents", fileName: "consent.pdf", url: "javascript:alert(1)" }] } as never);
    render(<GenericDetailCard data={card} />);
    fireEvent.click(screen.getByRole("button", { name: /^Preview Consents & Releases: consent\.pdf$/ }));
    expect(await screen.findByText("This file is no longer on the client's record.")).toBeInTheDocument();
  });

  it("shows an error when the client can't be loaded", async () => {
    getClient.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
    render(<GenericDetailCard data={card} />);
    fireEvent.click(screen.getByRole("button", { name: /^Preview Consents & Releases: consent\.pdf$/ }));
    expect(await screen.findByText("Couldn't load this document. Try again.")).toBeInTheDocument();
  });
});
