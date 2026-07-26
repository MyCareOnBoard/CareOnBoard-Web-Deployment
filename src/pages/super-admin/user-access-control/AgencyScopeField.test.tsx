import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AgencyScopeField from "./AgencyScopeField";

const agencies = [
  { id: "a1", name: "Atlas Care", status: "active" },
  { id: "a2", name: "Birch House", status: "inactive" },
];

describe("AgencyScopeField", () => {
  it("lets global creators choose all agencies", async () => {
    const onChange = vi.fn();
    render(
      <AgencyScopeField agencies={agencies} canAssignAllAgencies isLoading={false} hasMore={false} search="" value={{ agencyScope: "selected", agencyIds: ["a1"] }} disabled={false} onSearchChange={vi.fn()} onLoadMore={vi.fn()} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "All agencies" }));
    expect(onChange).toHaveBeenCalledWith({ agencyScope: "all", agencyIds: [] });
  });

  it("keeps restricted creators in selected mode and supports selection removal", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AgencyScopeField agencies={agencies} canAssignAllAgencies={false} isLoading={false} hasMore search="" value={{ agencyScope: "selected", agencyIds: ["a1"] }} disabled={false} onSearchChange={vi.fn()} onLoadMore={vi.fn()} onChange={onChange} />,
    );
    expect(screen.queryByRole("radio", { name: "All agencies" })).not.toBeInTheDocument();
    expect(screen.getByText("Atlas Care")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Remove Atlas Care" }));
    expect(onChange).toHaveBeenCalledWith({ agencyScope: "selected", agencyIds: [] });
    await user.click(screen.getByRole("button", { name: "Choose agencies" }));
    expect(screen.getByText("Inactive")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /Birch House/i }));
    expect(onChange).toHaveBeenLastCalledWith({ agencyScope: "selected", agencyIds: ["a1", "a2"] });
  });

  it("renders page loading skeletons and requests the next cursor page", async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <AgencyScopeField agencies={agencies} canAssignAllAgencies isLoading hasMore search="" value={{ agencyScope: "selected", agencyIds: [] }} disabled={false} onSearchChange={vi.fn()} onLoadMore={onLoadMore} onChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Choose agencies" }));
    expect(screen.getByRole("status", { name: "Loading agencies" })).toBeVisible();
    rerender(<AgencyScopeField agencies={agencies} canAssignAllAgencies isLoading={false} hasMore search="" value={{ agencyScope: "selected", agencyIds: [] }} disabled={false} onSearchChange={vi.fn()} onLoadMore={onLoadMore} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Load more agencies" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("keeps prior agency options visible with an inline retryable error", async () => {
    const onRetry = vi.fn();
    render(
      <AgencyScopeField agencies={agencies} canAssignAllAgencies isLoading={false} hasMore={false} search="atlas" value={{ agencyScope: "selected", agencyIds: ["a1"] }} disabled={false} error="Agency search failed" onSearchChange={vi.fn()} onLoadMore={vi.fn()} onRetry={onRetry} onChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Choose agencies" }));
    expect(screen.getByRole("checkbox", { name: "Atlas Care" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Agency search failed");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
