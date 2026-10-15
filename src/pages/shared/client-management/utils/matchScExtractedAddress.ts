import { fetchFirstPlaceDetailsForQuery } from "@/hooks/useGooglePlacesAutocomplete";
import type { ScAddressMatch, ScAddressSuggestion, ScClientExtractionDraft } from "../types/scClientExtraction";

const addressFields = ["address", "city", "county", "state", "zip"] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** A matched address is applied as a complete group, never assembled from source fragments. */
export function isCompleteScAddressSuggestion(value: ScAddressSuggestion | null): value is ScAddressSuggestion {
  return !!value && /^\d[^,]*\s+\S/.test(text(value.address)) && !!text(value.city) && /^[A-Z]{2}$/.test(value.state) && /^\d{5}(?:-\d{4})?$/.test(value.zip);
}

export async function matchScExtractedAddress(
  draft: ScClientExtractionDraft,
  { signal }: { signal: AbortSignal },
): Promise<ScAddressMatch | undefined> {
  if (signal.aborted) throw new DOMException("Address matching cancelled.", "AbortError");
  if (!addressFields.some(key => text(draft[key]))) return undefined;

  const street = text(draft.address);
  const query = [street, text(draft.city), [text(draft.state), text(draft.zip)].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const unmatched: ScAddressMatch = { query, suggestion: null, selected: false };
  // A city or county alone is insufficient to identify a participant's residence.
  if (!street) return unmatched;

  try {
    const details = await fetchFirstPlaceDetailsForQuery(query, { signal });
    if (signal.aborted) throw new DOMException("Address matching cancelled.", "AbortError");
    if (!details || text(details.countryCode).toUpperCase() !== "US") return unmatched;

    const line1 = text(details.line1 || details.street);
    // Places often omits subpremises. Keep the source's explicit unit when present.
    const unitMatch = [...street.matchAll(/(?:(?:\b(?:apt|apartment|unit|suite|ste|floor|fl|room|rm)\b\.?\s*#?\s*|#\s*)[\p{L}\p{N}][\p{L}\p{N} .#/-]*|\b(?:\d+(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|ground|upper|lower)[\s-]+(?:floor|fl)\b\.?)(?=,|$)/giu)].find(match => {
      const streetPrefix = street.slice(0, match.index).replace(/[,\s]+$/, "");
      // A suffix needs a street before it; "Unit Rd" can itself be the route name.
      return /^\d\S*\s+\S/.test(streetPrefix) || match.index === 0 && street.slice(match[0].length).trimStart().startsWith(",");
    });
    const sourceUnit = unitMatch?.[0]?.trim() ?? "";
    const unit = sourceUnit && !line1.toLowerCase().endsWith(sourceUnit.toLowerCase()) ? sourceUnit : text(details.line2);
    const suggestion: ScAddressSuggestion = {
      address: [line1, unit].filter(Boolean).join(", "),
      city: text(details.city), county: text(details.county),
      state: text(details.stateCode).toUpperCase(), zip: text(details.zipCode),
    };
    if (!line1 || !isCompleteScAddressSuggestion(suggestion)) return unmatched;
    return { query, suggestion, selected: true };
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    return unmatched;
  }
}
