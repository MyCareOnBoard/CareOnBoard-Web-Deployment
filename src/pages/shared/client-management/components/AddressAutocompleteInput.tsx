import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";

const DEFAULT_INPUT_CLASS = "h-[44px] rounded-[12px] border-[#cccccd] bg-white";

/**
 * Address text input with Google Places autocomplete + selection (same flow as the Stage 1
 * primary address). Each instance owns its own Places session, so it's safe to render many
 * (e.g. one per guardian/care-team row). A selection fills the field with the formatted address.
 * The suggestion list is a keyboard-navigable combobox (↑/↓ to move, Enter to pick, Esc to close).
 */
export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName = DEFAULT_INPUT_CLASS,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Applied to the wrapper (which is the grid/flex child) — use for col-span, width, etc. */
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}) {
  const places = useGooglePlacesAutocomplete();
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset the highlight whenever the suggestion set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [places.suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        places.setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [places.setShowSuggestions]);

  const select = async (placeId: string) => {
    const details = await places.selectSuggestion(placeId);
    if (details?.formattedAddress) onChange(details.formattedAddress);
  };

  const open = places.showSuggestions && places.suggestions.length > 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, places.suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      void select(places.suggestions[activeIndex].placeId);
    } else if (e.key === "Escape") {
      places.setShowSuggestions(false);
    }
  };

  return (
    <div className={`relative ${className ?? ""}`.trim()} ref={containerRef}>
      <Input
        value={value}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          places.handleInputChange(v);
        }}
        onFocus={() => {
          if (places.suggestions.length > 0) places.setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        className={inputClassName}
        placeholder={placeholder}
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border border-[#e5e5e6] bg-white shadow-lg"
        >
          {places.isSearching && (
            <li className="flex items-center gap-2 px-4 py-3 text-sm text-[#808081]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent" />
              Searching...
            </li>
          )}
          {!places.isSearching &&
            places.suggestions.map((suggestion, i) => (
              <li
                key={suggestion.placeId}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                // Keep focus on the input so blur/outside-click doesn't fire before the click.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => void select(suggestion.placeId)}
                className={`cursor-pointer border-b border-[#e5e5e6] px-4 py-3 text-sm text-[#10141a] last:border-b-0 ${
                  i === activeIndex ? "bg-[#f1f5f5]" : "hover:bg-[#f8f9fa]"
                }`}
              >
                <span className="line-clamp-2">{suggestion.description}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
