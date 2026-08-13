import { createAction } from "@reduxjs/toolkit";
export type Dispatch = (action: unknown) => unknown;
export const payrollScopeChanged = createAction<{ previousKey: string | null; nextKey: string | null }>("payroll/scopeChanged");
export function resetPayrollSession(dispatch: Dispatch, resetAction: unknown, clearProviderSession: () => void) {
  clearProviderSession();
  dispatch(resetAction);
}
