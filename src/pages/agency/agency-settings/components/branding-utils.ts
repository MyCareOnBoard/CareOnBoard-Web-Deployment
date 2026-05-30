import { validateImageUrl } from "@/lib/utils/string-utils";

export const AGENCY_LOGO_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const AGENCY_LOGO_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp";

export function isAllowedLogoMime(type: string): boolean {
  return AGENCY_LOGO_MIME_TYPES.includes(type as (typeof AGENCY_LOGO_MIME_TYPES)[number]);
}

export function resolveBrandingPreviewSrc(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  return validateImageUrl(url);
}

export function createBrandingPreview(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeBrandingPreview(url: string | null): void {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function isLetterheadImagePreviewUrl(preview: string | null): boolean {
  if (!preview) return false;
  if (preview.startsWith("blob:") || preview.startsWith("data:image")) return true;
  return preview.startsWith("http") && !/\.pdf(\?|$)/i.test(preview);
}
