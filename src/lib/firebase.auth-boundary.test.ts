import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const moduleEvaluations = vi.hoisted(() => ({
  firestore: 0,
}));

const authMocks = vi.hoisted(() => ({
  initializeAuth: vi.fn(() => ({ settings: {} })),
  indexedDBLocalPersistence: { name: "indexed-db" },
  browserLocalPersistence: { name: "local" },
  browserSessionPersistence: { name: "session" },
}));

vi.mock("firebase/app", () => ({
  getApp: () => ({}),
  getApps: () => [],
  initializeApp: () => ({}),
}));

vi.mock("firebase/auth", () => ({
  browserLocalPersistence: authMocks.browserLocalPersistence,
  browserSessionPersistence: authMocks.browserSessionPersistence,
  connectAuthEmulator: vi.fn(),
  indexedDBLocalPersistence: authMocks.indexedDBLocalPersistence,
  initializeAuth: authMocks.initializeAuth,
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
    authMocks.initializeAuth.mockClear();
    vi.resetModules();
    vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test.example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initializes persistent auth without popup/redirect or Firestore dependencies", async () => {
    const { auth } = await import("./firebase");

    expect(auth).toBeDefined();
    expect(authMocks.initializeAuth).toHaveBeenCalledOnce();
    expect(authMocks.initializeAuth).toHaveBeenCalledWith(
      expect.anything(),
      {
        persistence: [
          authMocks.indexedDBLocalPersistence,
          authMocks.browserLocalPersistence,
          authMocks.browserSessionPersistence,
        ],
      },
    );
    expect(moduleEvaluations.firestore).toBe(0);
  });
});
