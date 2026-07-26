import { describe, expect, it, vi } from "vitest";

import {
  AGENCY_ACCESS_REFRESH_TOAST_ID,
  showAgencyAccessRefreshWarning,
} from "./agencyAccessRefreshToast";

const { warning, dismiss } = vi.hoisted(() => ({
  warning: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { warning, dismiss },
}));

describe("agency access refresh toast", () => {
  it("reuses one warning toast and dismisses it after a successful retry", async () => {
    const refreshProfile = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ uid: "super-1" });

    showAgencyAccessRefreshWarning(refreshProfile);
    expect(warning).toHaveBeenCalledOnce();
    expect(warning.mock.calls[0][1]).toMatchObject({
      id: AGENCY_ACCESS_REFRESH_TOAST_ID,
      duration: Infinity,
    });

    await warning.mock.calls[0][1].action.onClick();
    expect(warning).toHaveBeenCalledTimes(2);
    expect(warning.mock.calls.map(([, options]) => options.id)).toEqual([
      AGENCY_ACCESS_REFRESH_TOAST_ID,
      AGENCY_ACCESS_REFRESH_TOAST_ID,
    ]);
    expect(dismiss).not.toHaveBeenCalled();

    await warning.mock.calls[1][1].action.onClick();
    expect(dismiss).toHaveBeenCalledWith(AGENCY_ACCESS_REFRESH_TOAST_ID);
    expect(warning).toHaveBeenCalledTimes(2);
  });
});
