import type { CheckOnboardGlobal, CheckWindow } from "./checkOnboard.types";
import { CHECK_ONBOARD_SCRIPT_URL, isTrustedCheckOnboardUrl } from "./checkOnboardPolicy";

const scriptId = "check-onboard-initialize";
const pendingLoads = new WeakMap<Document, Promise<CheckOnboardGlobal>>();

export function validateExistingCheckScript(src: string) {
  if (!isTrustedCheckOnboardUrl(src)) throw new Error("Existing Check Onboard script is not trusted.");
}

export function loadCheckOnboard(win: CheckWindow = window, doc: Document = document): Promise<CheckOnboardGlobal> {
  const existing = doc.getElementById(scriptId) as HTMLScriptElement | null;
  if (win.Check && !existing) return Promise.reject(new Error("Check Onboard has no trusted script provenance."));
  if (win.Check && existing) {
    validateExistingCheckScript(existing.src);
    return Promise.resolve(win.Check);
  }

  const pending = pendingLoads.get(doc);
  if (pending) return pending;

  let resolvePending!: (value: CheckOnboardGlobal) => void;
  let rejectPending!: (reason: Error) => void;
  const result = new Promise<CheckOnboardGlobal>((resolve, reject) => {
    resolvePending = resolve;
    rejectPending = reject;
  });
  pendingLoads.set(doc, result);
  const resolve = (value: CheckOnboardGlobal) => {
    pendingLoads.delete(doc);
    resolvePending(value);
  };
  const reject = (error: Error) => {
    pendingLoads.delete(doc);
    rejectPending(error);
  };
  const fail = (script: HTMLScriptElement, message: string) => {
    script.remove();
    reject(new Error(message));
  };

  if (existing) {
    validateExistingCheckScript(existing.src);
    existing.addEventListener("load", () => win.Check ? resolve(win.Check) : fail(existing, "Check Onboard did not initialize."), { once: true });
    existing.addEventListener("error", () => fail(existing, "Check Onboard failed to load."), { once: true });
    return result;
  }

  const script = doc.createElement("script");
  script.id = scriptId;
  script.src = CHECK_ONBOARD_SCRIPT_URL;
  script.async = true;
  script.onload = () => win.Check ? resolve(win.Check) : fail(script, "Check Onboard did not initialize.");
  script.onerror = () => fail(script, "Check Onboard failed to load.");
  doc.head.appendChild(script);
  return result;
}
