import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClientForm } from "./useClientForm";

describe("useClientForm", () => {
  it("goToStage navigates directly to the requested stage", () => {
    const { result } = renderHook(() => useClientForm());
    act(() => result.current.goToStage(3));
    expect(result.current.stage).toBe(3);
  });
});
