import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ComplianceMonitorError,
  ComplianceMonitorSkeleton,
} from "./ComplianceMonitorStates";

describe("compliance monitor states", () => {
  it("reserves responsive issue-row geometry while loading", () => {
    render(<ComplianceMonitorSkeleton count={4} />);

    expect(screen.getAllByTestId("compliance-issue-skeleton")).toHaveLength(4);
    expect(
      screen.getAllByTestId("compliance-issue-skeleton-details"),
    ).toHaveLength(4);
  });

  it("renders a dashboard-style retry action", () => {
    const onRetry = vi.fn();
    render(
      <ComplianceMonitorError
        message="We couldn't load document alerts."
        retryLabel="Retry document alerts"
        onRetry={onRetry}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Retry document alerts" }),
    );
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
