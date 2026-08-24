import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentFirebaseUser: null as null | {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    metadata: { creationTime: null };
    photoURL: null;
    phoneNumber: null;
  },
  authListeners: new Set<(user: unknown) => void>(),
  reduxUser: null,
  failAuthServiceImport: false,
  purge: vi.fn(),
  actionModuleEvaluations: {
    authService: 0,
    backendClient: 0,
    firebaseAuth: 0,
  },
}));

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn((action) => action),
  useSelector: () => mocks.reduxUser,
}));
vi.mock("@/store/redux/store", () => ({ persistor: { purge: mocks.purge } }));
vi.mock("../services/authService", () => {
  mocks.actionModuleEvaluations.authService += 1;
  if (mocks.failAuthServiceImport) {
    throw new Error("Failed to fetch dynamically imported module");
  }
  return {
    loginWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    getIdToken: vi.fn(),
    deleteCurrentUser: vi.fn(),
    removeUserData: vi.fn(),
  };
});
vi.mock("../store/authSlice", () => ({
  logoutUser: vi.fn(() => ({ type: "auth/logout" })),
  setUser: (user: unknown) => ({ type: "auth/setUser", payload: user }),
}));
vi.mock("../api/client", () => {
  mocks.actionModuleEvaluations.backendClient += 1;
  return { createUser: vi.fn() };
});
vi.mock("@/components/ui/loader", () => ({ PageLoader: () => null }));
vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mocks.currentFirebaseUser;
    },
    onAuthStateChanged(callback: (user: unknown) => void) {
      mocks.authListeners.add(callback);
      return () => mocks.authListeners.delete(callback);
    },
  },
}));
vi.mock("firebase/auth", () => {
  mocks.actionModuleEvaluations.firebaseAuth += 1;
  return { reload: vi.fn() };
});
vi.mock("@/lib/axios", () => ({ clearAuthCache: vi.fn() }));
vi.mock("../services/mfaSessionStore", () => ({ clearMfaResolverSession: vi.fn() }));
vi.mock("../services/mfaService", () => ({ clearRecaptchaVerifier: vi.fn() }));
vi.mock("@/lib/api/users", () => ({ getUser: vi.fn() }));
vi.mock("@/features/payroll/api/checkPayrollApi", () => ({
  checkPayrollApi: { util: { resetApiState: () => ({ type: "payroll/reset" }) } },
}));
vi.mock("@/features/payroll/onboard/payrollOnboardSession", () => ({
  clearPayrollOnboardSessions: vi.fn(),
}));

import { AuthProvider, useAuth } from "./AuthContext";

let authContext: ReturnType<typeof useAuth>;

function Probe() {
  authContext = useAuth();
  return null;
}

async function emitAuthState(user: typeof mocks.currentFirebaseUser) {
  mocks.currentFirebaseUser = user;
  await act(async () => {
    for (const listener of [...mocks.authListeners]) listener(user);
  });
}

describe.sequential("AuthProvider authenticated entry", () => {
  beforeEach(() => {
    mocks.currentFirebaseUser = {
      uid: "staff-1",
      email: "staff-1@example.com",
      displayName: "Staff One",
      emailVerified: true,
      metadata: { creationTime: null },
      photoURL: null,
      phoneNumber: null,
    };
    mocks.authListeners.clear();
    mocks.failAuthServiceImport = false;
    mocks.purge.mockReset();
  });

  it("does not evaluate action-only auth modules while restoring an existing session", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await emitAuthState(mocks.currentFirebaseUser);
    await waitFor(() => expect(authContext.loading).toBe(false));

    expect(mocks.actionModuleEvaluations).toEqual({
      authService: 0,
      backendClient: 0,
      firebaseAuth: 0,
    });
  });

  it("finishes local logout cleanup without loading the action service chunk", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await emitAuthState(mocks.currentFirebaseUser);
    await waitFor(() => expect(authContext.loading).toBe(false));
    localStorage.setItem("auth_user", "cached-user");
    mocks.failAuthServiceImport = true;

    await act(async () => {
      await expect(authContext.logout()).resolves.toBeUndefined();
    });

    expect(localStorage.getItem("auth_user")).toBeNull();
    expect(mocks.purge).toHaveBeenCalledOnce();
  });
});
