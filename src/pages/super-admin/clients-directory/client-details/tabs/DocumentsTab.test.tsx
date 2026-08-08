import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import { DocumentsTab } from "./DocumentsTab";

describe("super-admin client DocumentsTab", () => {
  it("opens uploaded documents in one shared modal without filename links", () => {
    const client = {
      type: "ddd",
      documents: [
        {
          key: "medicalDocs",
          title: "Care plan",
          fileName: "care-plan.pdf",
          url: "https://files.example.test/care-plan.pdf?token=secret",
        },
        {
          key: "idCard",
          title: "Photo ID",
          fileName: "photo-id.png",
          url: "https://files.example.test/photo-id.png?token=secret",
        },
      ],
    } as Client;

    render(<DocumentsTab client={client} readOnly />);

    expect(screen.getAllByRole("button", { name: "View" })).toHaveLength(2);
    expect(screen.getByText("care-plan.pdf").closest("a")).toBeNull();
    expect(screen.getByText("photo-id.png").closest("a")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]);

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Care plan" })).toBeInTheDocument();
    expect(screen.getByTitle("Care plan preview")).toHaveAttribute(
      "src",
      "https://files.example.test/care-plan.pdf?token=secret#toolbar=0&navpanes=0",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
