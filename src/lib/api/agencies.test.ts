import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosGet = vi.hoisted(() => vi.fn());

vi.mock("../axios", () => ({
  default: { get: axiosGet },
}));

import { getAgencyById } from "./agencies";

describe("agency API error privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not write a raw transport error to the browser console", async () => {
    const rawError = Object.assign(new Error("request denied"), {
      response: { data: { token: "must-not-be-logged" } },
    });
    axiosGet.mockRejectedValue(rawError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getAgencyById("atlas")).rejects.toThrow("request denied");
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
