import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocumentsByClient = vi.fn();
const createGoalDocument = vi.fn();
vi.mock("./goals-and-documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./goals-and-documents")>()),
  getDocumentsByClient: (...args: unknown[]) => getDocumentsByClient(...args),
  createGoalDocument: (...args: unknown[]) => createGoalDocument(...args),
}));

import { ensureProgramGoalsDocuments, findProgramGoalsDocument } from "./ci-tracker";

describe("program goals documents", () => {
  beforeEach(() => {
    getDocumentsByClient.mockReset();
    createGoalDocument.mockReset().mockResolvedValue({ id: "new" });
  });

  it("prefers an approved document, then a submitted one, over drafts", async () => {
    getDocumentsByClient.mockResolvedValue({
      documents: [
        { id: "draft", status: "draft" },
        { id: "submitted", status: "submitted" },
        { id: "approved", status: "submitted", approval: { status: "approved" } },
      ],
    });
    expect((await findProgramGoalsDocument("c1", "community_inclusion_individualized_goals"))?.id).toBe("approved");
  });

  it("starts a draft only for clients without one", async () => {
    getDocumentsByClient.mockImplementation(async (clientId: string) => ({
      documents: clientId === "has" ? [{ id: "d", status: "draft" }] : [],
    }));
    const created = await ensureProgramGoalsDocuments("a1", "ci", [
      { id: "has", name: "A" },
      { id: "none", name: "B" },
    ]);
    expect(created).toBe(1);
    expect(createGoalDocument).toHaveBeenCalledTimes(1);
    expect(createGoalDocument).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "a1", clientId: "none", documentType: "community_inclusion_individualized_goals", status: "draft" }),
    );
  });
});
