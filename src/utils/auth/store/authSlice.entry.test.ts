import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  moduleEvaluations: {
    firebaseAuth: 0,
    firebaseConfig: 0,
    authService: 0,
  },
  auth: {
    onAuthStateChanged: vi.fn(),
  },
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  loginWithEmail: vi.fn(),
  transformFirebaseUser: vi.fn(),
}));

vi.mock("firebase/auth", () => {
  mocks.moduleEvaluations.firebaseAuth += 1;
  return {
    createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
    signOut: mocks.signOut,
    updateProfile: mocks.updateProfile,
    sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  };
});

vi.mock("@/lib/firebase", () => {
  mocks.moduleEvaluations.firebaseConfig += 1;
  return { auth: mocks.auth };
});

vi.mock("@/utils/auth/services/authService", () => {
  mocks.moduleEvaluations.authService += 1;
  return {
    loginWithEmail: mocks.loginWithEmail,
    transformFirebaseUser: mocks.transformFirebaseUser,
  };
});

import authReducer, {
  checkAuthState,
  clearError,
  loginUser,
  logoutUser,
  resetPassword,
  setUser,
  signupUser,
  updateUserProfile,
} from "./authSlice";

const runThunk = (thunk: ReturnType<typeof loginUser> | ReturnType<typeof signupUser> |
  ReturnType<typeof logoutUser> | ReturnType<typeof resetPassword> |
  ReturnType<typeof checkAuthState>) => thunk(vi.fn(), vi.fn(), undefined);

describe.sequential("authSlice entry loading", () => {
  beforeEach(() => {
    mocks.createUserWithEmailAndPassword.mockReset();
    mocks.signOut.mockReset();
    mocks.updateProfile.mockReset();
    mocks.sendPasswordResetEmail.mockReset();
    mocks.loginWithEmail.mockReset();
    mocks.transformFirebaseUser.mockReset();
    mocks.auth.onAuthStateChanged.mockReset();
  });

  it("defines the reducer and action contracts without evaluating action-only modules", () => {
    expect(mocks.moduleEvaluations).toEqual({
      firebaseAuth: 0,
      firebaseConfig: 0,
      authService: 0,
    });
    expect(loginUser.pending.type).toBe("auth/login/pending");
    expect(signupUser.pending.type).toBe("auth/signup/pending");
    expect(logoutUser.fulfilled.type).toBe("auth/logout/fulfilled");
    expect(resetPassword.pending.type).toBe("auth/resetPassword/pending");
    expect(checkAuthState.fulfilled.type).toBe("auth/checkState/fulfilled");
    expect(clearError.type).toBe("auth/clearError");
    expect(setUser.type).toBe("auth/setUser");
    expect(updateUserProfile.type).toBe("auth/updateUserProfile");
  });

  it("keeps MFA login rejections payload-only without setting a reducer error", async () => {
    mocks.loginWithEmail.mockResolvedValue({ status: "mfa_required" });

    const action = await runThunk(loginUser({
      email: "staff@example.com",
      password: "secret",
    }));
    const state = authReducer(undefined, action);

    expect(action.type).toBe("auth/login/rejected");
    expect(action.payload).toEqual({ code: "MFA_REQUIRED" });
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeNull();
  });

  it("preserves signup transformation and display-name ordering", async () => {
    const firebaseUser = { uid: "staff-1" };
    const transformedUser = { uid: "staff-1", fullName: "Before update" };
    mocks.createUserWithEmailAndPassword.mockResolvedValue({ user: firebaseUser });
    mocks.transformFirebaseUser.mockReturnValue(transformedUser);

    const action = await runThunk(signupUser({
      email: "staff@example.com",
      password: "secret",
      fullName: "Staff One",
    }));

    expect(mocks.updateProfile).toHaveBeenCalledWith(firebaseUser, {
      displayName: "Staff One",
    });
    expect(action.type).toBe("auth/signup/fulfilled");
    expect(action.payload).toEqual({ uid: "staff-1", fullName: "Staff One" });
  });

  it("preserves logout rejection payload and reducer state", async () => {
    mocks.signOut.mockRejectedValue(new Error("Provider logout failed"));

    const action = await runThunk(logoutUser());
    const state = authReducer(undefined, action);

    expect(action.type).toBe("auth/logout/rejected");
    expect(action.payload).toBe("Provider logout failed");
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Provider logout failed");
  });

  it("keeps reset and auth-state thunks wired to their original boundaries", async () => {
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    const firebaseUser = { uid: "staff-2" };
    const transformedUser = { uid: "staff-2", fullName: "Staff Two" };
    const unsubscribe = vi.fn();
    mocks.transformFirebaseUser.mockReturnValue(transformedUser);
    mocks.auth.onAuthStateChanged.mockImplementation((onUser) => {
      queueMicrotask(() => onUser(firebaseUser));
      return unsubscribe;
    });

    const resetAction = await runThunk(resetPassword("staff@example.com"));
    const checkAction = await runThunk(checkAuthState());

    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      mocks.auth,
      "staff@example.com",
    );
    expect(resetAction.type).toBe("auth/resetPassword/fulfilled");
    expect(checkAction.type).toBe("auth/checkState/fulfilled");
    expect(checkAction.payload).toEqual(transformedUser);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
