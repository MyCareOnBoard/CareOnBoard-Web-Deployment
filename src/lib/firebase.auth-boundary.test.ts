import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const moduleEvaluations = vi.hoisted(() => ({
  firestore: 0,
}));

vi.mock("firebase/app", () => ({
  getApp: () => ({}),
  getApps: () => [],
  initializeApp: () => ({}),
}));

vi.mock("firebase/auth", () => ({
  connectAuthEmulator: vi.fn(),
  getAuth: () => ({ settings: {} }),
}));

vi.mock("firebase/firestore", () => {
  moduleEvaluations.firestore += 1;
  return {
    connectFirestoreEmulator: vi.fn(),
    getFirestore: () => ({}),
  };
});

describe("Firebase auth startup boundary", () => {
  beforeEach(() => {
    moduleEvaluations.firestore = 0;
    vi.resetModules();
    vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test.example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not evaluate Firestore when auth initializes", async () => {
    const { auth } = await import("./firebase");

    expect(auth).toBeDefined();
    expect(moduleEvaluations.firestore).toBe(0);
  });
});
