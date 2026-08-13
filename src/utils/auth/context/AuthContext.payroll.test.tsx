import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AuthProvider } from "./AuthContext";
import { checkPayrollApi } from "@/features/payroll/api/checkPayrollApi";

let authListener: ((user: { uid: string } | null) => void) | undefined;
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null, onAuthStateChanged: (listener: typeof authListener) => { authListener = listener; return () => {}; } } }));
vi.mock("@/utils/auth/services/authService", () => ({ getIdToken: vi.fn(), loginWithEmail: vi.fn(), registerWithEmail: vi.fn(), sendPasswordResetEmail: vi.fn(), deleteCurrentUser: vi.fn(), removeUserData: vi.fn() }));
vi.mock("@/lib/api/users", () => ({ getUser: vi.fn() }));
vi.mock("@/components/ui/loader", () => ({ PageLoader: () => null }));
vi.mock("firebase/auth", () => ({ reload: vi.fn() }));
vi.mock("@/features/payroll/onboard/payrollOnboardSession", () => ({ clearPayrollOnboardSessions: vi.fn() }));

describe("AuthContext payroll lifecycle", () => {
  it("resets payroll cache before handling a changed Firebase UID", () => {
    const store = configureStore({ reducer: { auth: () => ({ user: null }), [checkPayrollApi.reducerPath]: checkPayrollApi.reducer }, middleware: (getDefault) => getDefault().concat(checkPayrollApi.middleware) });
    const dispatch = vi.spyOn(store, "dispatch");
    render(<Provider store={store}><AuthProvider><div /></AuthProvider></Provider>);
    authListener?.({ uid: "first" }); authListener?.({ uid: "second" });
    expect(dispatch).toHaveBeenCalledWith(checkPayrollApi.util.resetApiState());
  });
});
