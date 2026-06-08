/** Reuse one PDF Blob per generation result identity. */
export function createPocPdfBlobCache() {
  let blob: Blob | null = null;
  let resultKey: string | null = null;

  return {
    async getOrBuild(key: string, build: () => Promise<Blob>): Promise<Blob> {
      if (blob && resultKey === key) return blob;
      blob = await build();
      resultKey = key;
      return blob;
    },
    reset() {
      blob = null;
      resultKey = null;
    },
  };
}
