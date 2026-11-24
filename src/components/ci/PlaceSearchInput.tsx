import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, MapPin } from "lucide-react";
import { DRAWER_FIELD } from "@/components/agency/ScheduleDrawerParts";
import { cn } from "@/lib/utils";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";
import type { CiAddress, CiLocationCategory } from "@/lib/api/ci-tracker";

export type PickedPlace = { name: string; address: CiAddress; category: CiLocationCategory | null };

const CATEGORY_WORDS: [CiLocationCategory, RegExp][] = [
  ["library", /\blibrar(y|ies)\b/i],
  ["park", /\b(park|garden|trail|playground|beach)\b/i],
  ["place_of_worship", /\b(church|chapel|mosque|masjid|temple|synagogue|cathedral|parish)\b/i],
  ["community_center", /\b(community|recreation|senior|ymca|ywca)\b.*\bcent(er|re)\b|\bymca\b|\bywca\b/i],
  ["store", /\b(store|shop|market|mall|supermarket|grocery|walmart|target|costco)\b/i],
];

/** Place type guessed from a place's name ("Ocean County Library" is a library); null when unsure. */
export function guessPlaceCategory(name: string): CiLocationCategory | null {
  return CATEGORY_WORDS.find(([, pattern]) => pattern.test(name))?.[0] ?? null;
}

/**
 * Place name field with Google Places autocomplete. Typing searches places and addresses;
 * picking one fills the name and keeps its address and coordinates. Free text still works
 * for a place Google doesn't know.
 */
export function PlaceSearchInput({ value, onChange, onPick, placeholder }: {
  value: string;
  onChange: (name: string) => void;
  onPick: (place: PickedPlace) => void;
  placeholder?: string;
}) {
  const places = useGooglePlacesAutocomplete();
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [picking, setPicking] = useState(false);

  useEffect(() => setActiveIndex(-1), [places.suggestions]);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) places.setShowSuggestions(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [places.setShowSuggestions]);

  const pick = async (index: number) => {
    const suggestion = places.suggestions[index];
    if (!suggestion) return;
    setPicking(true);
    try {
      const details = await places.selectSuggestion(suggestion.placeId);
      // Some results have no separate main text; keep the part before the first comma.
      const main = suggestion.mainText.trim();
      const name = !main || main === suggestion.description ? suggestion.description.split(",")[0].trim() : main;
      const countyState = details ? [details.city, details.stateCode].filter(Boolean).join(", ") : "";
      onPick({
        name,
        category: guessPlaceCategory(name),
        address: {
          address: details?.formattedAddress || suggestion.description,
          ...(countyState ? { countyState } : {}),
          ...(details?.zipCode ? { zipCode: details.zipCode } : {}),
          latlon: details && (details.lat || details.lng) ? { lat: details.lat, lon: details.lng } : null,
        },
      });
    } finally {
      setPicking(false);
    }
  };

  const open = places.showSuggestions && (places.isSearching || places.suggestions.length > 0);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, places.suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      void pick(activeIndex);
    } else if (e.key === "Escape") {
      places.setShowSuggestions(false);
    }
  };

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <MapPin aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5b636b]" />
      <input
        className={cn(DRAWER_FIELD, "pl-9 pr-9")}
        value={value}
        placeholder={placeholder}
        aria-label="New place name"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          places.handleInputChange(e.target.value);
        }}
        onFocus={() => { if (places.suggestions.length > 0) places.setShowSuggestions(true); }}
        onKeyDown={onKeyDown}
      />
      {(places.isSearching || picking) && (
        <Loader2 aria-hidden="true" className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#5b636b]" />
      )}
      {open && (
        <ul id={listId} role="listbox" aria-label="Matching places" className="absolute z-50 mt-1 max-h-[240px] w-full overflow-y-auto rounded-[10px] border border-[#dcdfe2] bg-white py-1 shadow-lg dark:border-white/15 dark:bg-[#1b232b]">
          {places.isSearching && places.suggestions.length === 0 && (
            <li className="px-3.5 py-2.5 text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">Searching…</li>
          )}
          {places.suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => void pick(i)}
              className={cn("cursor-pointer px-3.5 py-2", i === activeIndex ? "bg-[#f4f5f6] dark:bg-white/5" : "")}
            >
              <span className="block truncate text-[14px] text-[#10141a] dark:text-[#f4f6f7]">{s.mainText}</span>
              {s.secondaryText && <span className="block truncate text-[12px] text-[#5b636b] dark:text-[#9aa4a8]">{s.secondaryText}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
