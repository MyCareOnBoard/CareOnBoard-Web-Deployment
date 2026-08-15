import { describe, expect, it, vi } from "vitest";
import { fetchFirstPlaceDetailsForQuery } from "./useGooglePlacesAutocomplete";

describe("Google Places payroll address mapping", () => {
  it("maps a Google Place using short state/country codes and its subpremise", async () => {
    const components = [
      { longText: "12", shortText: "12", types: ["street_number"] },
      { longText: "Main Street", shortText: "Main St", types: ["route"] },
      { longText: "Suite 4B", shortText: "4B", types: ["subpremise"] },
      { longText: "Trenton", shortText: "Trenton", types: ["locality"] },
      { longText: "New Jersey", shortText: "NJ", types: ["administrative_area_level_1"] },
      { longText: "08608", shortText: "08608", types: ["postal_code"] },
      { longText: "United States", shortText: "US", types: ["country"] },
    ];
    const fetchFields = vi.fn().mockResolvedValue(undefined);
    window.google = {
      maps: {
        importLibrary: vi.fn().mockResolvedValue({
          AutocompleteSuggestion: { fetchAutocompleteSuggestions: vi.fn().mockResolvedValue({ suggestions: [{ placePrediction: { placeId: "place-1" } }] }) },
          Place: class { addressComponents = components; formattedAddress = "12 Main Street, Trenton, NJ 08608, USA"; location = { lat: () => 40.2171, lng: () => -74.7429 }; fetchFields = fetchFields; constructor(_: unknown) {} },
        }),
      },
    } as never;

    await expect(fetchFirstPlaceDetailsForQuery("12 Main Street")).resolves.toMatchObject({
      line1: "12 Main Street",
      line2: "Suite 4B",
      city: "Trenton",
      county: "",
      state: "New Jersey",
      stateLong: "New Jersey",
      stateCode: "NJ",
      zipCode: "08608",
      country: "United States",
      countryCode: "US",
    });
  });
});
