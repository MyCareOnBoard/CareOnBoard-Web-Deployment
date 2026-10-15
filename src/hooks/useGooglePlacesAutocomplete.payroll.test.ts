import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFirstPlaceDetailsForQuery } from "./useGooglePlacesAutocomplete";

const originalGoogle = window.google;

function installGoogle() {
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
  const fetchAutocompleteSuggestions = vi.fn().mockResolvedValue({ suggestions: [{ placePrediction: { placeId: "place-1" } }] });
  const library = {
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
    Place: class { addressComponents = components; formattedAddress = "12 Main Street, Trenton, NJ 08608, USA"; location = { lat: () => 40.2171, lng: () => -74.7429 }; fetchFields = fetchFields; constructor(_: unknown) {} },
  };
  const importLibrary = vi.fn().mockResolvedValue(library);
  window.google = {
    maps: {
      importLibrary,
    },
  } as never;
  return { fetchFields, fetchAutocompleteSuggestions, importLibrary, library };
}

afterEach(() => {
  window.google = originalGoogle;
  vi.useRealTimers();
});

describe("Google Places address mapping", () => {
  it("maps a Google Place using short state/country codes and its subpremise", async () => {
    installGoogle();

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

  it("returns an empty search result without repeatedly calling Google", async () => {
    vi.useFakeTimers();
    const { fetchAutocompleteSuggestions } = installGoogle();
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] });

    await expect(fetchFirstPlaceDetailsForQuery("12 Main Street")).resolves.toBeNull();
    await vi.advanceTimersByTimeAsync(12000);

    expect(fetchAutocompleteSuggestions).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns an API failure without retrying the same search", async () => {
    vi.useFakeTimers();
    const { fetchAutocompleteSuggestions } = installGoogle();
    fetchAutocompleteSuggestions.mockRejectedValue(new Error("Places unavailable"));

    await expect(fetchFirstPlaceDetailsForQuery("12 Main Street")).resolves.toBeNull();
    await vi.advanceTimersByTimeAsync(12000);

    expect(fetchAutocompleteSuggestions).toHaveBeenCalledOnce();
  });

  it("waits for Maps readiness before running a single lookup", async () => {
    vi.useFakeTimers();
    Reflect.deleteProperty(window, "google");
    const lookup = fetchFirstPlaceDetailsForQuery("12 Main Street");
    await vi.advanceTimersByTimeAsync(900);
    const { fetchAutocompleteSuggestions } = installGoogle();
    await vi.advanceTimersByTimeAsync(300);

    await expect(lookup).resolves.toMatchObject({ city: "Trenton", stateCode: "NJ" });
    expect(fetchAutocompleteSuggestions).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops waiting when Maps is still unavailable after twelve seconds", async () => {
    vi.useFakeTimers();
    Reflect.deleteProperty(window, "google");
    const lookup = fetchFirstPlaceDetailsForQuery("12 Main Street");
    await vi.advanceTimersByTimeAsync(12000);

    await expect(lookup).resolves.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["Maps library", "suggestions", "details library", "details"] as const)("times out a stalled %s request and ignores late completion", async stage => {
    vi.useFakeTimers();
    const { fetchFields, fetchAutocompleteSuggestions, importLibrary, library } = installGoogle();
    let finish!: () => void;
    if (stage === "Maps library" || stage === "details library") {
      if (stage === "details library") importLibrary.mockResolvedValueOnce(library);
      importLibrary.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(library); }));
    } else if (stage === "suggestions") {
      fetchAutocompleteSuggestions.mockImplementationOnce(() => new Promise(resolve => {
        finish = () => resolve({ suggestions: [{ placePrediction: { placeId: "late-place" } }] });
      }));
    } else {
      fetchFields.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(undefined); }));
    }
    const lookup = fetchFirstPlaceDetailsForQuery("12 Main Street");
    const completed = vi.fn();
    void lookup.then(completed);
    await vi.advanceTimersByTimeAsync(11999);
    expect(completed).not.toHaveBeenCalled();
    const calls = [importLibrary.mock.calls.length, fetchAutocompleteSuggestions.mock.calls.length, fetchFields.mock.calls.length];

    await vi.advanceTimersByTimeAsync(1);

    await expect(lookup).resolves.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect([importLibrary.mock.calls.length, fetchAutocompleteSuggestions.mock.calls.length, fetchFields.mock.calls.length]).toEqual(calls);
    expect(completed).toHaveBeenCalledExactlyOnceWith(null);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels readiness waiting immediately and removes its timer", async () => {
    vi.useFakeTimers();
    Reflect.deleteProperty(window, "google");
    const controller = new AbortController();
    const lookup = fetchFirstPlaceDetailsForQuery("12 Main Street", { signal: controller.signal });
    const rejected = expect(lookup).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();

    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects cancellation while details are pending and ignores their late completion", async () => {
    vi.useFakeTimers();
    const { fetchFields, fetchAutocompleteSuggestions } = installGoogle();
    let finishDetails!: () => void;
    fetchFields.mockImplementation(() => new Promise<void>((resolve) => { finishDetails = resolve; }));
    const controller = new AbortController();
    const lookup = fetchFirstPlaceDetailsForQuery("12 Main Street", { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFields).toHaveBeenCalledOnce();
    const rejected = expect(lookup).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();

    await rejected;
    finishDetails();
    await vi.advanceTimersByTimeAsync(12000);

    expect(fetchAutocompleteSuggestions).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not call Google for an already cancelled lookup", async () => {
    const { fetchAutocompleteSuggestions } = installGoogle();
    const controller = new AbortController();
    controller.abort();

    await expect(fetchFirstPlaceDetailsForQuery("12 Main Street", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchAutocompleteSuggestions).not.toHaveBeenCalled();
  });
});
