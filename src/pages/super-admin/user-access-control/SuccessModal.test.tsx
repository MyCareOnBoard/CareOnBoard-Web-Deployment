import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SuccessModal from "./SuccessModal";

describe("SuccessModal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not auto-close while the committed access refresh is pending", () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const view = render(
      <SuccessModal
        open
        onOpenChange={onOpenChange}
        userName="Ada Admin"
        mode="edit"
        isRetrying
      />,
    );

    act(() => vi.advanceTimersByTime(4000));
    expect(onOpenChange).not.toHaveBeenCalled();

    view.rerender(
      <SuccessModal
        open
        onOpenChange={onOpenChange}
        userName="Ada Admin"
        mode="edit"
        isRetrying={false}
      />,
    );
    act(() => vi.advanceTimersByTime(3000));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
