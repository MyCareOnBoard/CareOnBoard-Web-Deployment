import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { useProtectedDocument } from "./ProtectedDocumentPreview";

vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { versionContent: vi.fn(), publicationContent: vi.fn() },
}));
const first = {
  submissionId: "report",
  versionId: "v2",
  title: "Approved report",
  fileName: "report-v2.pdf",
};
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:private-preview");
  URL.revokeObjectURL = vi.fn();
});

it("loads only the selected authenticated version and revokes its URL when closed", async () => {
  vi.mocked(agencyCareApi.versionContent).mockResolvedValue(
    new Blob(["pdf"], { type: "application/pdf" }),
  );
  const { result, rerender } = renderHook(
    ({ item }) =>
      useProtectedDocument("user|organization|john", item, "internal:agency"),
    { initialProps: { item: first as typeof first | null } },
  );
  await waitFor(() => expect(result.current.url).toBe("blob:private-preview"));
  expect(agencyCareApi.versionContent).toHaveBeenCalledWith(
    "report",
    "v2",
    expect.objectContaining({
      agencyKey: "internal:agency",
      signal: expect.any(AbortSignal),
    }),
  );
  rerender({ item: null });
  expect(result.current.url).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-preview");
});

it("does not create a URL for denied content or fall back to a file URL", async () => {
  vi.mocked(agencyCareApi.versionContent).mockRejectedValue(
    new Error("Unavailable"),
  );
  const { result } = renderHook(() =>
    useProtectedDocument("user|organization|john", first, "internal:agency"),
  );
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(result.current.url).toBeNull();
});

it("drops a late protected file after the source client changes", async () => {
  let resolve!: (blob: Blob) => void;
  vi.mocked(agencyCareApi.versionContent).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result, rerender } = renderHook(
    ({ scope }) => useProtectedDocument(scope, first, "internal:agency"),
    { initialProps: { scope: "john" } },
  );
  rerender({ scope: "mary" });
  await act(async () =>
    resolve(new Blob(["private"], { type: "application/pdf" })),
  );
  expect(result.current.url).toBeNull();
});
