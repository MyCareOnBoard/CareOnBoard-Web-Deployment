import { act, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentFirebaseUser: null as any,
  authListeners: new Set<(user: any) => void>(),
  dispatch: vi.fn((action) => action),
  reduxUser: null as any,
  getUser: vi.fn(),
  logoutUser: vi.fn(() => ({ type: "auth/logout" })),
  purge: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: () => mocks.reduxUser,
}));
vi.mock("@/store/redux/store", () => ({
  persistor: { purge: mocks.purge },
}));
vi.mock("@/utils/auth/services/authService", () => ({
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  getIdToken: vi.fn(),
  deleteCurrentUser: vi.fn(),
  removeUserData: vi.fn(),
}));
vi.mock("@/utils/auth/store/authSlice", () => ({
  logoutUser: mocks.logoutUser,
  setUser: (user: unknown) => ({ type: "auth/setUser", payload: user }),
}));
vi.mock("@/utils/auth/api/client", () => ({ createUser: vi.fn() }));
vi.mock("@/components/ui/loader", () => ({ PageLoader: () => null }));
vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mocks.currentFirebaseUser;
    },
    onAuthStateChanged(callback: (user: any) => void) {
      mocks.authListeners.add(callback);
      return () => mocks.authListeners.delete(callback);
    },
  },
}));
vi.mock("firebase/auth", () => ({ reload: vi.fn() }));
vi.mock("@/lib/axios", () => ({ clearAuthCache: vi.fn() }));
vi.mock("@/utils/auth/services/mfaSessionStore", () => ({ clearMfaResolverSession: vi.fn() }));
vi.mock("@/utils/auth/services/mfaService", () => ({ clearRecaptchaVerifier: vi.fn() }));
vi.mock("@/lib/api/users", () => ({ getUser: mocks.getUser }));

import { AuthProvider, useAuth } from "./AuthContext";

function firebaseUser(uid = "super-1") {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: uid,
    emailVerified: true,
    metadata: { creationTime: null },
    photoURL: null,
    phoneNumber: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

let authContext: ReturnType<typeof useAuth>;

function Probe({ children }: { children?: ReactNode }) {
  authContext = useAuth();
  return <>{children}</>;
}

async function emitAuthState(user: any) {
  mocks.currentFirebaseUser = user;
  await act(async () => {
    for (const listener of [...mocks.authListeners]) listener(user);
  });
}

async function renderReady() {
  mocks.currentFirebaseUser = firebaseUser();
  render(<AuthProvider><Probe /></AuthProvider>);
  await emitAuthState(mocks.currentFirebaseUser);
  await waitFor(() => expect(authContext.loading).toBe(false));
}

describe("AuthProvider.refreshProfile", () => {
  beforeEach(() => {
    mocks.currentFirebaseUser = null;
    mocks.authListeners.clear();
    mocks.dispatch.mockClear();
    mocks.getUser.mockReset();
    mocks.logoutUser.mockClear();
    mocks.purge.mockClear();
    mocks.reduxUser = null;
  });

  it("does not restore a profile after logout during refresh", async () => {
    await renderReady();
    const pending = deferred<any>();
    const refreshedUser = { uid: "super-1", fullName: "Stale Admin" };
    mocks.getUser.mockReturnValueOnce(pending.promise);

    const refresh = authContext.refreshProfile();
    mocks.currentFirebaseUser = null;
    await act(async () => { await authContext.logout(); });
    await act(async () => {
      pending.resolve(refreshedUser);
      await refresh;
    });

    await expect(refresh).resolves.toBeNull();
    expect(authContext.user).toBeNull();
    expect(mocks.dispatch).not.toHaveBeenCalledWith({
      type: "auth/setUser",
      payload: refreshedUser,
    });
  });

  it("keeps the newest same-user refresh when responses resolve in reverse order", async () => {
    await renderReady();
    const first = deferred<any>();
    const second = deferred<any>();
    const staleUser = { uid: "super-1", fullName: "Older Scope" };
    const currentUser = { uid: "super-1", fullName: "Newest Scope" };
    mocks.getUser.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const firstRefresh = authContext.refreshProfile();
    const secondRefresh = authContext.refreshProfile();
    await act(async () => {
      second.resolve(currentUser);
      await secondRefresh;
    });

    await expect(secondRefresh).resolves.toEqual(currentUser);
    expect(authContext.user?.fullName).toBe("Newest Scope");

    await act(async () => {
      first.resolve(staleUser);
      await firstRefresh;
    });
    await expect(firstRefresh).resolves.toBeNull();
    expect(authContext.user?.fullName).toBe("Newest Scope");
    expect(mocks.dispatch).not.toHaveBeenCalledWith({
      type: "auth/setUser",
      payload: staleUser,
    });
  });
});
