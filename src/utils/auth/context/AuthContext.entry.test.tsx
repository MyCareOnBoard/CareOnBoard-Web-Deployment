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
  reduxUser: null as any,
  getUser: vi.fn(),
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  createBackendUser: vi.fn(),
  deleteCurrentUser: vi.fn(),
  dispatch: vi.fn((action) => action),
  failAuthServiceImport: false,
  purge: vi.fn(),
  actionModuleEvaluations: {
    authService: 0,
    backendClient: 0,
    firebaseAuth: 0,
  },
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: () => mocks.reduxUser,
}));
vi.mock("@/store/redux/store", () => ({ persistor: { purge: mocks.purge } }));
vi.mock("../services/authService", () => {
  mocks.actionModuleEvaluations.authService += 1;
  if (mocks.failAuthServiceImport) {
    throw new Error("Failed to fetch dynamically imported module");
  }
  return {
    loginWithEmail: mocks.loginWithEmail,
    registerWithEmail: mocks.registerWithEmail,
    sendPasswordResetEmail: vi.fn(),
    getIdToken: vi.fn(),
    deleteCurrentUser: mocks.deleteCurrentUser,
    removeUserData: vi.fn(),
  };
});
vi.mock("../store/authSlice", () => ({
  logoutUser: vi.fn(() => ({ type: "auth/logout" })),
  setUser: (user: unknown) => ({ type: "auth/setUser", payload: user }),
}));
vi.mock("../api/client", () => {
  mocks.actionModuleEvaluations.backendClient += 1;
  return { createUser: mocks.createBackendUser };
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
vi.mock("@/lib/api/users", () => ({ getUser: mocks.getUser }));
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
    mocks.reduxUser = null;
    mocks.getUser.mockReset().mockResolvedValue({ uid: 'staff-1', userType: 'employee' });
    mocks.loginWithEmail.mockReset();
    mocks.registerWithEmail.mockReset();
    mocks.createBackendUser.mockReset();
    mocks.deleteCurrentUser.mockReset();
    mocks.dispatch.mockClear();
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

  it("revalidates a cached product role before rendering protected children", async () => {
    mocks.reduxUser = { uid: 'staff-1', userType: 'employee' };
    let resolveProfile!: (user: unknown) => void;
    mocks.getUser.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve; }));
    const view = render(<AuthProvider><div>Authenticated content</div><Probe /></AuthProvider>);
    await emitAuthState(mocks.currentFirebaseUser);
    expect(view.queryByText('Authenticated content')).toBeNull();
    await act(async () => resolveProfile({ uid: 'staff-1', userType: 'agency_care' }));
    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/setUser', payload: { uid: 'staff-1', userType: 'agency_care' } }));
    expect(authContext.user?.userType).toBe('agency_care');
  });

  it("restores the new UID when the account changes during initial profile loading", async () => {
    let resolveFirst!: (user: unknown) => void;
    let resolveNext!: (user: unknown) => void;
    mocks.getUser
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { resolveNext = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await emitAuthState(mocks.currentFirebaseUser);
    await waitFor(() => expect(mocks.getUser).toHaveBeenCalledTimes(1));
    await emitAuthState({ ...mocks.currentFirebaseUser!, uid: 'care-2', email: 'care-2@example.com' });
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
    await act(async () => resolveNext({ uid: 'care-2', userType: 'agency_care' }));
    await waitFor(() => expect(authContext.loading).toBe(false));
    expect(authContext.user).toEqual({ uid: 'care-2', userType: 'agency_care' });
    await act(async () => resolveFirst({ uid: 'staff-1', userType: 'employee' }));
    expect(authContext.user).toEqual({ uid: 'care-2', userType: 'agency_care' });
    expect(mocks.dispatch).not.toHaveBeenCalledWith({ type: 'auth/setUser', payload: { uid: 'staff-1', userType: 'employee' } });
  });

  it("ignores a late Redux profile from a different Firebase account", async () => {
    const view = render(<AuthProvider><Probe /></AuthProvider>);
    await emitAuthState(mocks.currentFirebaseUser);
    await waitFor(() => expect(authContext.loading).toBe(false));
    mocks.getUser.mockResolvedValueOnce({ uid: 'care-2', userType: 'agency_care' });
    await emitAuthState({ ...mocks.currentFirebaseUser!, uid: 'care-2', email: 'care-2@example.com' });
    await waitFor(() => expect(authContext.user?.uid).toBe('care-2'));
    mocks.reduxUser = { uid: 'staff-1', userType: 'employee' };
    view.rerender(<AuthProvider><Probe /></AuthProvider>);
    expect(authContext.user).toEqual({ uid: 'care-2', userType: 'agency_care' });
  });

  it("rejects a late successful login before its caller can continue as the old account", async () => {
    let resolveLogin!: (value: unknown) => void;
    mocks.loginWithEmail.mockReturnValueOnce(new Promise(resolve => { resolveLogin = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await emitAuthState(mocks.currentFirebaseUser);
    await waitFor(() => expect(authContext.loading).toBe(false));
    const login = authContext.login('staff-1@example.com', 'synthetic-password');
    await waitFor(() => expect(mocks.loginWithEmail).toHaveBeenCalledOnce());
    mocks.getUser.mockResolvedValueOnce({ uid: 'care-2', userType: 'agency_care' });
    await emitAuthState({ ...mocks.currentFirebaseUser!, uid: 'care-2', email: 'care-2@example.com' });
    await act(async () => {
      resolveLogin({ status: 'success', user: { uid: 'staff-1', userType: 'employee' } });
      await expect(login).rejects.toMatchObject({ code: 'auth/account-changed' });
    });
    expect(authContext.user).toEqual({ uid: 'care-2', userType: 'agency_care' });
  });

  it.each(['succeeded', 'failed'])("does not publish or delete another account when signup provisioning %s after a switch", async result => {
    let settle!: (value?: unknown) => void;
    mocks.registerWithEmail.mockResolvedValueOnce({ success: true, user: { uid: 'staff-1', userType: 'applicant' } });
    mocks.createBackendUser.mockReturnValueOnce(new Promise((resolve, reject) => { settle = result === 'succeeded' ? () => resolve(undefined) : () => reject(new Error('Provisioning failed')); }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await emitAuthState(mocks.currentFirebaseUser);
    await waitFor(() => expect(authContext.loading).toBe(false));
    const signup = authContext.signup('staff-1@example.com', 'synthetic-password', 'Staff One');
    await waitFor(() => expect(mocks.createBackendUser).toHaveBeenCalledOnce());
    mocks.getUser.mockResolvedValueOnce({ uid: 'care-2', userType: 'agency_care' });
    await emitAuthState({ ...mocks.currentFirebaseUser!, uid: 'care-2', email: 'care-2@example.com' });
    await act(async () => {
      settle();
      await expect(signup).rejects.toMatchObject({ code: 'auth/account-changed' });
    });
    expect(mocks.deleteCurrentUser).not.toHaveBeenCalled();
    expect(authContext.user).toEqual({ uid: 'care-2', userType: 'agency_care' });
    expect(mocks.dispatch).not.toHaveBeenCalledWith({ type: 'auth/setUser', payload: { uid: 'staff-1', userType: 'applicant' } });
  });

  it("keeps signup rollback for the same registered account when provisioning fails", async () => {
    mocks.registerWithEmail.mockResolvedValueOnce({ success: true, user: { uid: 'staff-1', userType: 'applicant' } });
    mocks.createBackendUser.mockRejectedValueOnce(new Error('Provisioning failed'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await emitAuthState(mocks.currentFirebaseUser);
    await waitFor(() => expect(authContext.loading).toBe(false));
    await expect(authContext.signup('staff-1@example.com', 'synthetic-password', 'Staff One')).rejects.toThrow('Provisioning failed');
    expect(mocks.deleteCurrentUser).toHaveBeenCalledOnce();
    expect(mocks.dispatch).not.toHaveBeenCalledWith({ type: 'auth/setUser', payload: { uid: 'staff-1', userType: 'applicant' } });
  });
});
