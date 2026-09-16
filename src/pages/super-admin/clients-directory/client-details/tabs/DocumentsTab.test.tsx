import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Client } from "@/lib/api/clients";
import { DocumentsTab } from "./DocumentsTab";

describe("super-admin client DocumentsTab", () => {
  it("remains read-only even when update callbacks are supplied and malformed rows are present", () => {
    const client = { type: 'hha', documents: [null, { key: 'form485', title: 'Form 485', url: 'https://example.test/form.pdf', signed: false }],
      documentChecklist: { state: 'ready', evaluatedAt: '2026-09-16T12:00:00Z', timezone: 'UTC', localDate: '2026-09-16', groups: [{ program: 'hha', rows: [{ key: 'form485', status: 'on_file_no_expiry', reasonCode: null, entries: [{ documentIndex: 1, issuedDate: null, expiryDate: null, status: 'on_file_no_expiry', reasonCode: null }] }] }] },
    } as unknown as Client;
    render(<DocumentsTab client={client} readOnly showChecklist onOpenUploadModal={vi.fn()} onUploadChecklist={vi.fn()} />);
    expect(screen.getAllByText('On file · expiry not recorded')).toHaveLength(2);
    expect(screen.getByText('Unsigned')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload|Update document|Add Document/ })).not.toBeInTheDocument();
  });
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
