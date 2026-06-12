import { describe, expect, it, vi } from "vitest";
import { createPocPdfBlobCache } from "./pocPdfBlobCache";

describe("pocPdfBlobCache", () => {
  it("builds the PDF blob once for the same result key", async () => {
    const cache = createPocPdfBlobCache();
    const build = vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" }));

    const first = await cache.getOrBuild("job-1", build);
    const second = await cache.getOrBuild("job-1", build);

    expect(build).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("rebuilds when the result key changes", async () => {
    const cache = createPocPdfBlobCache();
    const build = vi
      .fn()
      .mockResolvedValueOnce(new Blob(["a"], { type: "application/pdf" }))
      .mockResolvedValueOnce(new Blob(["b"], { type: "application/pdf" }));

    await cache.getOrBuild("job-1", build);
    await cache.getOrBuild("job-2", build);

    expect(build).toHaveBeenCalledTimes(2);
  });
});
