import { describe, expect, it } from "vitest";
import { guessPlaceCategory } from "./PlaceSearchInput";

describe("guessPlaceCategory", () => {
  it("guesses the place type from its name", () => {
    expect(guessPlaceCategory("Princeton Public Library")).toBe("library");
    expect(guessPlaceCategory("Marquand Park")).toBe("park");
    expect(guessPlaceCategory("Trinity Church")).toBe("place_of_worship");
    expect(guessPlaceCategory("Hamilton YMCA")).toBe("community_center");
    expect(guessPlaceCategory("ShopRite Supermarket")).toBe("store");
  });

  it("returns null when unsure", () => {
    expect(guessPlaceCategory("Nassau Hall")).toBeNull();
  });
});
