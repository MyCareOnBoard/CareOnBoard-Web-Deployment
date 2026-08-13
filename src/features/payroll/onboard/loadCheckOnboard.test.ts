import { describe, expect, it } from "vitest";
import { loadCheckOnboard, validateExistingCheckScript } from "./loadCheckOnboard";

describe("loadCheckOnboard", () => {
  it("rejects a preexisting script with a different source", () => {
    expect(() => validateExistingCheckScript("https://evil.example/sdk.js")).toThrow(/trusted/i);
  });
  it("rejects an actual preexisting script with a different source", () => {
    const doc = document.implementation.createHTMLDocument(); const script = doc.createElement("script"); script.id = "check-onboard-initialize"; script.src = "https://evil.example/sdk.js"; doc.head.appendChild(script);
    expect(() => loadCheckOnboard({} as never, doc)).toThrow(/trusted/i);
  });
  it("inserts the immutable script once", async () => {
    const doc = document.implementation.createHTMLDocument(); const win = {} as Window & { Check?: { create: () => unknown } };
    const promise = loadCheckOnboard(win as never, doc); const script = doc.getElementById("check-onboard-initialize") as HTMLScriptElement;
    expect(script.src).toBe("https://cdn.checkhq.com/onboard-initialize.js"); win.Check = { create: () => ({}) }; script.onload?.(new Event("load")); await expect(promise).resolves.toBe(win.Check);
  });
  it("shares one pending trusted-script load for concurrent Continue attempts", async () => {
    const doc = document.implementation.createHTMLDocument(); const win = {} as Window & { Check?: { create: () => unknown } };
    const first = loadCheckOnboard(win as never, doc); const second = loadCheckOnboard(win as never, doc);
    expect(second).toBe(first); expect(doc.querySelectorAll("#check-onboard-initialize")).toHaveLength(1);
    win.Check = { create: () => ({}) }; (doc.getElementById("check-onboard-initialize") as HTMLScriptElement).onload?.(new Event("load"));
    await expect(first).resolves.toBe(win.Check);
  });
  it("removes a failed owned script so a later attempt can retry", async () => {
    const doc = document.implementation.createHTMLDocument(); const win = {} as Window & { Check?: { create: () => unknown } };
    const failed = loadCheckOnboard(win as never, doc); (doc.getElementById("check-onboard-initialize") as HTMLScriptElement).onerror?.(new Event("error")); await expect(failed).rejects.toThrow(/failed/i);
    expect(doc.getElementById("check-onboard-initialize")).toBeNull(); const retry = loadCheckOnboard(win as never, doc); expect(doc.getElementById("check-onboard-initialize")).not.toBeNull(); (doc.getElementById("check-onboard-initialize") as HTMLScriptElement).onerror?.(new Event("error")); await expect(retry).rejects.toThrow(/failed/i);
  });
});
