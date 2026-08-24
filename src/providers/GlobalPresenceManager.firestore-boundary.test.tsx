import { render } from "@testing-library/react";
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
    Timestamp: class Timestamp {},
    collection: vi.fn(),
    connectFirestoreEmulator: vi.fn(),
    doc: vi.fn(),
    getFirestore: () => ({}),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
  };
});

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/axios", () => ({
  default: { post: vi.fn() },
}));

describe("GlobalPresenceManager Firestore startup boundary", () => {
  beforeEach(() => {
    moduleEvaluations.firestore = 0;
    vi.resetModules();
    vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test.example.test");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not evaluate Firestore when the root presence manager renders", async () => {
    const { GlobalPresenceManager } = await import("./GlobalPresenceManager");

    render(<GlobalPresenceManager />);

    expect(moduleEvaluations.firestore).toBe(0);
  });
});
