/**
 * Keep in sync with CareOnBoard-BackEnd functions/utils/storage-url.js
 */
const ALLOWED_HOSTS = new Set([
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
]);

export const ALLOWED_BUCKET_IDS = [
  "care-on-board.firebasestorage.app",
  "care-on-board.appspot.com",
] as const;

const ALLOWED_BUCKET_ID_SET = new Set<string>(ALLOWED_BUCKET_IDS);

function isAllowedStoragePath(parsed: URL): boolean {
  const host = parsed.hostname;

  if (host === "storage.googleapis.com") {
    const segment = parsed.pathname.split("/").filter(Boolean)[0];
    return segment != null && ALLOWED_BUCKET_ID_SET.has(segment);
  }

  if (host === "firebasestorage.googleapis.com") {
    const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\//);
    return match != null && ALLOWED_BUCKET_ID_SET.has(match[1]);
  }

  return false;
}

export function isAllowedStorageUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  if (trimmed.startsWith("//")) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_HOSTS.has(parsed.hostname) &&
      isAllowedStoragePath(parsed)
    );
  } catch {
    return false;
  }
}
