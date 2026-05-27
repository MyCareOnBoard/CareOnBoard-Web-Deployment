import axios from "axios";
import { describe, expect, it } from "vitest";
import { formatGeminiExtractError } from "./formatGeminiExtractError";

describe("formatGeminiExtractError", () => {
  it("maps OUTPUT_TOKEN_CAP errorCode", () => {
    const err = new axios.AxiosError("bad");
    err.response = {
      data: { errorCode: "OUTPUT_TOKEN_CAP", message: "technical" },
      status: 502,
      statusText: "Bad Gateway",
      headers: {},
      config: {} as never,
    };
    expect(formatGeminiExtractError(err)).toMatch(/too many service rows/i);
  });

  it("maps timeout / ECONNABORTED", () => {
    const err = new axios.AxiosError("timeout of 300000ms exceeded");
    err.code = "ECONNABORTED";
    expect(formatGeminiExtractError(err)).toMatch(/longer than expected/i);
  });

  it("maps network errors without response", () => {
    const err = new axios.AxiosError("Network Error");
    expect(formatGeminiExtractError(err)).toMatch(/Connection interrupted/i);
  });

  it("returns empty string for canceled requests", () => {
    const err = new axios.AxiosError("canceled");
    err.code = "ERR_CANCELED";
    expect(formatGeminiExtractError(err)).toBe("");
  });

  it("falls back to default message", () => {
    expect(formatGeminiExtractError(new Error("x"))).toBe("x");
    expect(formatGeminiExtractError(null)).toMatch(/couldn't read that file/i);
  });
});
