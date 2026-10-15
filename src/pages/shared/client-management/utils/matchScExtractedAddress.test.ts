import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFirstPlaceDetailsForQuery, type AddressDetails } from "@/hooks/useGooglePlacesAutocomplete";
import { matchScExtractedAddress } from "./matchScExtractedAddress";

vi.mock("@/hooks/useGooglePlacesAutocomplete", () => ({ fetchFirstPlaceDetailsForQuery: vi.fn() }));

const lookup = vi.mocked(fetchFirstPlaceDetailsForQuery);
const details: AddressDetails = {
  formattedAddress: "20 Main Street, Newark, NJ 07102, USA", street: "20 Main Street", line1: "20 Main Street", line2: null,
  city: "Newark", county: "Essex County", state: "New Jersey", stateLong: "New Jersey", stateCode: "NJ",
  zipCode: "07102", country: "United States", countryCode: "US", lat: 40.7, lng: -74.1,
};
const options = () => ({ signal: new AbortController().signal });

describe("matchScExtractedAddress", () => {
  beforeEach(() => { lookup.mockReset(); });

  it("matches an extracted street and fills missing structured components without changing the source", async () => {
    lookup.mockResolvedValue(details);
    const draft = { address: "20 Main St", state: "NJ", firstName: "Jane" };
    const context = options();
    await expect(matchScExtractedAddress(draft, context)).resolves.toEqual({
      query: "20 Main St, NJ", selected: true,
      suggestion: { address: "20 Main Street", city: "Newark", county: "Essex County", state: "NJ", zip: "07102" },
    });
    expect(lookup).toHaveBeenCalledExactlyOnceWith("20 Main St, NJ", context);
    expect(draft).toEqual({ address: "20 Main St", state: "NJ", firstName: "Jane" });
  });

  it("queries all available address components", async () => {
    lookup.mockResolvedValue(details);
    await matchScExtractedAddress({ address: "20 Main St", city: "Newark", state: "New Jersey", zip: "07102", county: "Essex" }, options());
    expect(lookup.mock.calls[0][0]).toBe("20 Main St, Newark, New Jersey 07102");
  });

  it("does not look up missing addresses or a city/county alone", async () => {
    await expect(matchScExtractedAddress({ firstName: "Jane" }, options())).resolves.toBeUndefined();
    await expect(matchScExtractedAddress({ city: "Newark", county: "Essex" }, options())).resolves.toEqual({ query: "Newark", selected: false, suggestion: null });
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...details, countryCode: "CA" },
    { ...details, countryCode: "" },
    { ...details, line1: "Main Street", street: "Main Street" },
    { ...details, city: "" },
    { ...details, stateCode: "New Jersey" },
    { ...details, zipCode: "unknown" },
  ])("keeps an unmatched review record for incomplete or non-US results", async result => {
    lookup.mockResolvedValue(result);
    await expect(matchScExtractedAddress({ address: "20 Main St" }, options())).resolves.toEqual({ query: "20 Main St", selected: false, suggestion: null });
  });

  it("does not fail extraction when Places lookup fails", async () => {
    lookup.mockRejectedValue(new Error("Google unavailable"));
    await expect(matchScExtractedAddress({ address: "20 Main St" }, options())).resolves.toEqual({ query: "20 Main St", selected: false, suggestion: null });
  });

  it.each(["Apt 4B", "Apartment 4B", "Unit #4B", "Suite 4B", "#4B"])("keeps source unit %s when Google omits it", async unit => {
    lookup.mockResolvedValue(details);
    const match = await matchScExtractedAddress({ address: `20 Main St, ${unit}` }, options());
    expect(match?.suggestion?.address).toBe(`20 Main Street, ${unit}`);
  });

  it("keeps the explicit source unit over a different Google subpremise", async () => {
    lookup.mockResolvedValue({ ...details, line2: "Unit 9" });
    const match = await matchScExtractedAddress({ address: "20 Main St Apt 4B, Newark" }, options());
    expect(match?.suggestion?.address).toBe("20 Main Street, Apt 4B");
  });

  it.each(["2nd Floor", "Second Floor", "2nd Fl."])("keeps source floor %s when Google omits it", async floor => {
    lookup.mockResolvedValue(details);
    const match = await matchScExtractedAddress({ address: `20 Main St, ${floor}` }, options());
    expect(match?.suggestion?.address).toBe(`20 Main Street, ${floor}`);
  });

  it("keeps a source unit written before the street", async () => {
    lookup.mockResolvedValue(details);
    const match = await matchScExtractedAddress({ address: "Apt 4B, 20 Main St" }, options());
    expect(match?.suggestion?.address).toBe("20 Main Street, Apt 4B");
  });

  it("does not append an abbreviated route name as a unit", async () => {
    lookup.mockResolvedValue({ ...details, line1: "20 Unit Road" });
    const match = await matchScExtractedAddress({ address: "20 Unit Rd" }, options());
    expect(match?.suggestion?.address).toBe("20 Unit Road");
  });

  it("keeps a real unit after a route name containing Unit", async () => {
    lookup.mockResolvedValue({ ...details, line1: "20 Unit Road" });
    const match = await matchScExtractedAddress({ address: "20 Unit Rd, Apt 4B" }, options());
    expect(match?.suggestion?.address).toBe("20 Unit Road, Apt 4B");
  });

  it("includes Google's subpremise when the source does not specify one", async () => {
    lookup.mockResolvedValue({ ...details, line2: "Suite 4B" });
    const match = await matchScExtractedAddress({ address: "20 Main St" }, options());
    expect(match?.suggestion?.address).toBe("20 Main Street, Suite 4B");
  });

  it.each(["20 Unity Road", "20 Unit Road"])("does not duplicate a street name as a unit suffix: %s", async street => {
    lookup.mockResolvedValue({ ...details, line1: street });
    const match = await matchScExtractedAddress({ address: street }, options());
    expect(match?.suggestion?.address).toBe(street);
  });

  it("propagates cancellation before starting and while lookup is in progress", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(matchScExtractedAddress({ address: "20 Main St" }, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(lookup).not.toHaveBeenCalled();

    const active = new AbortController();
    lookup.mockImplementation(async () => { active.abort(); return details; });
    await expect(matchScExtractedAddress({ address: "20 Main St" }, { signal: active.signal })).rejects.toMatchObject({ name: "AbortError" });
  });
});
