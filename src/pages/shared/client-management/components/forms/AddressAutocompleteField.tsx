import { useId, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useGooglePlacesAutocomplete,
  type AddressDetails,
} from "@/hooks/useGooglePlacesAutocomplete";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { FieldLabel, LineInput } from "./formControls";

// Mirrors the internal MIN_QUERY_LENGTH guard in useGooglePlacesAutocomplete so
// re-focusing a pre-filled field can re-trigger a search.
const MIN_QUERY_LENGTH = 3;

/**
 * Labeled address input with Google Places autocomplete (the same flow as the
 * applicant pre-screening address field) plus a current-location button that
 * reverse-geocodes the device's coordinates into a formatted address.
 *
 * The suggestions list is rendered through a Radix Popover so it is portaled to
 * the body and escapes the modal's scroll/overflow container, and it follows the
 * WAI-ARIA combobox pattern (arrow keys + Enter/Escape, aria-activedescendant).
 *
 * Privacy: the reverse-geocode fallback uses Google only. This field captures the
 * assessment location (the patient's home in home health), so the device's
 * coordinates are NOT sent to any third-party geocoder; if Google can't resolve a
 * street address we keep the coordinates local and ask for manual entry.
 *
 * Relies on GoogleMapsProvider (mounted at the app root) for `window.google`.
 */
export function AddressAutocompleteField({
  label,
  id,
  value,
  onChange,
  onSelectDetails,
  placeholder = "Start typing an address…",
  required,
}: {
  label: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectDetails?: (details: AddressDetails) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const autocomplete = useGooglePlacesAutocomplete();
  const { suggestions, isSearching, showSuggestions, setShowSuggestions } = autocomplete;
  const { reverseGeocode } = useReverseGeocode();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-opt-${index}`;

  const open = showSuggestions && (isSearching || suggestions.length > 0);

  const closeList = () => {
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const commitSuggestion = async (placeId: string) => {
    setActiveIndex(-1);
    const details = await autocomplete.selectSuggestion(placeId);
    if (details) {
      onChange(details.formattedAddress);
      onSelectDetails?.(details);
    } else {
      toast({
        title: "Couldn't load that address",
        description: "We couldn't load the details for that address. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      // Let the user re-open a pre-filled field's suggestions with ArrowDown.
      if (e.key === "ArrowDown" && value.trim().length >= MIN_QUERY_LENGTH) {
        autocomplete.handleInputChange(value);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        break;
      case "Enter":
        if (activeIndex >= 0) {
          e.preventDefault();
          void commitSuggestion(suggestions[activeIndex].placeId);
        }
        break;
      case "Escape":
        closeList();
        break;
      default:
        break;
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location unavailable",
        description: "Your browser doesn't support getting the current location.",
        variant: "destructive",
      });
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const result = await reverseGeocode(latitude, longitude);
          if (result?.formattedAddress) {
            onChange(result.formattedAddress);
          } else {
            // No third-party geocoder fallback for this PHI-adjacent field: keep
            // the coordinates local and prompt for manual entry.
            onChange(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
            toast({
              title: "Couldn't resolve a street address",
              description: "We saved your coordinates — please enter the location manually if needed.",
            });
          }
        } catch {
          onChange(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
        } finally {
          setLocating(false);
          closeList();
        }
      },
      (error) => {
        setLocating(false);
        toast({
          title: "Couldn't get your location",
          description:
            error.code === error.PERMISSION_DENIED
              ? "Location permission denied. Enable location access in your browser, then try again."
              : "Unable to determine your current location. Please enter the address manually.",
          variant: "destructive",
        });
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true },
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) closeList();
        }}
      >
        <PopoverPrimitive.Anchor asChild>
          <div ref={anchorRef} className="relative">
            <LineInput
              id={id}
              value={value}
              placeholder={placeholder}
              autoComplete="off"
              readOnly={locating}
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
              aria-required={required || undefined}
              className="pr-11"
              onChange={(e) => {
                onChange(e.target.value);
                autocomplete.handleInputChange(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
                else if (value.trim().length >= MIN_QUERY_LENGTH) autocomplete.handleInputChange(value);
              }}
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              title="Use my current location"
              aria-label="Use my current location"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#5c6368] transition-colors hover:bg-[#00b4b8]/10 hover:text-[#00b4b8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
            </button>
          </div>
        </PopoverPrimitive.Anchor>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // Interacting with the input/locate button (the anchor) must not close the list.
              if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
            className="z-[200] max-h-[220px] overflow-y-auto rounded-[10px] border border-[#e2e4e6] bg-white shadow-lg"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            <div role="listbox" id={listboxId} aria-label={label}>
              {isSearching && (
                <div className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-[#808081]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#00b4b8]" />
                  Searching…
                </div>
              )}
              {!isSearching &&
                suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.placeId}
                    type="button"
                    role="option"
                    id={optionId(index)}
                    aria-selected={index === activeIndex}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => void commitSuggestion(suggestion.placeId)}
                    className={cn(
                      "flex w-full items-start gap-2 border-b border-[#eef0f1] px-3 py-2.5 text-left transition-colors last:border-b-0",
                      index === activeIndex ? "bg-[#eafafa]" : "hover:bg-[#f5fbfb]",
                    )}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00b4b8]" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium text-[#10141a]">
                        {suggestion.mainText}
                      </span>
                      {suggestion.secondaryText && (
                        <span className="truncate text-[12px] text-[#808081]">
                          {suggestion.secondaryText}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
