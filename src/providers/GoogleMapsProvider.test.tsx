import { act, render, screen, waitFor } from "@testing-library/react";
import { afterAll, describe, expect, it, vi } from "vitest";

const loader = vi.hoisted(() => ({ moduleLoads: 0, renders: 0 }));

vi.mock("./GoogleMapsLoader", () => {
  loader.moduleLoads += 1;
  return {
    default: () => {
      loader.renders += 1;
      return null;
    },
  };
});

vi.stubEnv("VITE_GOOGLE_PLACES_API_KEY", "test-key");

afterAll(() => {
  vi.unstubAllEnvs();
});

describe.sequential("GoogleMapsProvider demand loading", () => {
  it("does not import or render the Maps loader for a non-consumer route", async () => {
    const { GoogleMapsProvider } = await import("./GoogleMapsProvider");

    render(
      <GoogleMapsProvider>
        <p>Payroll workspace</p>
      </GoogleMapsProvider>,
    );
    await act(async () => Promise.resolve());

    expect(screen.getByText("Payroll workspace")).toBeVisible();
    expect(loader.moduleLoads).toBe(0);
    expect(loader.renders).toBe(0);
  });

  it("loads Maps when the autocomplete consumer hook mounts", async () => {
    const [{ GoogleMapsProvider }, { useGooglePlacesAutocomplete }] = await Promise.all([
      import("./GoogleMapsProvider"),
      import("../hooks/useGooglePlacesAutocomplete"),
    ]);
    const rendersBefore = loader.renders;

    function AutocompleteConsumer() {
      useGooglePlacesAutocomplete();
      return <p>Address autocomplete</p>;
    }

    render(
      <GoogleMapsProvider>
        <AutocompleteConsumer />
      </GoogleMapsProvider>,
    );

    await waitFor(() => expect(loader.renders).toBeGreaterThan(rendersBefore));
  });

  it("loads Maps when the reverse-geocode consumer hook mounts", async () => {
    const [{ GoogleMapsProvider }, { useReverseGeocode }] = await Promise.all([
      import("./GoogleMapsProvider"),
      import("../hooks/useReverseGeocode"),
    ]);
    const rendersBefore = loader.renders;

    function ReverseGeocodeConsumer() {
      useReverseGeocode();
      return <p>Current location</p>;
    }

    render(
      <GoogleMapsProvider>
        <ReverseGeocodeConsumer />
      </GoogleMapsProvider>,
    );

    await waitFor(() => expect(loader.renders).toBeGreaterThan(rendersBefore));
  });
});
