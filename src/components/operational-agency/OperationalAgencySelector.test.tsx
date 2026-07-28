import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";

const listOperationalAgencies = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/super-admin-operations", () => ({ listOperationalAgencies }));

import OperationalAgencySelector from "./OperationalAgencySelector";

const options: OperationalAgencySummary[] = [
  { id: "atlas", name: "Atlas Care", status: "active", supportedClientTypes: ["ddd"], timezone: "UTC" },
  { id: "birch", name: "Birch House", status: "active", supportedClientTypes: ["hha"], timezone: "UTC" },
];

function SelectorHarness({
  initialIds = [],
  selectionMode = "multiple",
}: {
  initialIds?: string[];
  selectionMode?: "single" | "multiple";
}) {
  const [selectedIds, setSelectedIds] = useState(initialIds);
  return (
    <>
      <OperationalAgencySelector
        feature="shift-management"
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
      <output aria-label="Selected agency IDs">{selectedIds.join(",")}</output>
    </>
  );
}

describe("OperationalAgencySelector", () => {
  beforeEach(() => {
    listOperationalAgencies.mockImplementation((_: string, input: { ids?: string[] } = {}) => Promise.resolve({
      data: input.ids ? options.filter((agency) => input.ids?.includes(agency.id)) : options,
      nextCursor: null,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("supports single selection through the real rendered control", async () => {
    const user = userEvent.setup();
    render(<SelectorHarness selectionMode="single" />);

    await user.click(screen.getByRole("button", { name: "Select an agency, none selected" }));
    await user.click(await screen.findByRole("option", { name: "Atlas Care" }));
    expect(screen.getByLabelText("Selected agency IDs")).toHaveTextContent("atlas");

    await user.click(screen.getByRole("button", { name: "Select an agency, Atlas Care selected" }));
    await user.click(await screen.findByRole("option", { name: "Birch House" }));
    expect(screen.getByLabelText("Selected agency IDs")).toHaveTextContent("birch");
    expect(screen.getByLabelText("Selected agency IDs")).not.toHaveTextContent("atlas");
  });

  it("selects all loaded agencies, clears them, and exposes selected state", async () => {
    const user = userEvent.setup();
    render(<SelectorHarness />);

    await user.click(screen.getByRole("button", { name: "Select agencies, none selected" }));
    await user.click(await screen.findByRole("button", { name: "Select all agencies" }));

    expect(screen.getByLabelText("Selected agency IDs")).toHaveTextContent("atlas,birch");
    expect(screen.getByRole("option", { name: "Atlas Care" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("2 agencies selected");

    await user.click(screen.getByRole("button", { name: "Clear agency selection" }));
    expect(screen.getByLabelText("Selected agency IDs")).toBeEmptyDOMElement();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("No agencies selected");
  });

  it("hydrates selected IDs outside the current page and keeps their names stable", async () => {
    const zenith = { ...options[0], id: "zenith", name: "Zenith Supports" };
    listOperationalAgencies.mockImplementation((_: string, input: { ids?: string[]; search?: string } = {}) => {
      if (input.ids) return Promise.resolve({ data: [zenith], nextCursor: null });
      return Promise.resolve({ data: input.search ? [options[1]] : [options[0]], nextCursor: null });
    });
    render(<SelectorHarness initialIds={["zenith"]} />);

    const hydratedTrigger = await screen.findByRole("button", {
      name: "Select agencies, Zenith Supports selected",
    });
    expect(within(screen.getByLabelText("Selected agencies")).getByText("Zenith Supports")).toBeVisible();
    fireEvent.click(hydratedTrigger);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search agencies" }), { target: { value: "Birch" } });

    expect(within(screen.getByLabelText("Selected agencies")).getByText("Zenith Supports")).toBeVisible();
    expect(screen.getByLabelText("Selected agency IDs")).toHaveTextContent("zenith");
  });

  it("debounces search by 300ms, aborts superseded work, and ignores late results", async () => {
    vi.useFakeTimers();
    const deferred = <T,>() => {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((yes) => { resolve = yes; });
      return { promise, resolve };
    };
    const alpha = deferred<{ data: OperationalAgencySummary[]; nextCursor: null }>();
    const birch = deferred<{ data: OperationalAgencySummary[]; nextCursor: null }>();
    listOperationalAgencies.mockImplementation((_: string, input: { search?: string } = {}) => {
      if (input.search === "Alpha") return alpha.promise;
      if (input.search === "Birch") return birch.promise;
      return Promise.resolve({ data: [], nextCursor: null });
    });
    render(<SelectorHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select agencies, none selected" }));
    const search = screen.getByRole("searchbox", { name: "Search agencies" });

    fireEvent.change(search, { target: { value: "Alpha" } });
    act(() => vi.advanceTimersByTime(299));
    expect(listOperationalAgencies.mock.calls.some(([, input]) => input.search === "Alpha")).toBe(false);
    await act(async () => { vi.advanceTimersByTime(1); });
    const alphaInput = listOperationalAgencies.mock.calls.find(([, input]) => input.search === "Alpha")?.[1];
    expect(alphaInput).toBeDefined();

    fireEvent.change(search, { target: { value: "Birch" } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(alphaInput.signal.aborted).toBe(true);

    await act(async () => { birch.resolve({ data: [options[1]], nextCursor: null }); });
    expect(screen.getByRole("option", { name: "Birch House" })).toBeVisible();
    await act(async () => { alpha.resolve({ data: [options[0]], nextCursor: null }); });
    expect(screen.queryByRole("option", { name: "Atlas Care" })).not.toBeInTheDocument();
  });

  it("aborts page and hydration requests when unmounted", () => {
    listOperationalAgencies.mockReturnValue(new Promise(() => undefined));
    const { unmount } = render(<SelectorHarness initialIds={["atlas"]} />);

    expect(listOperationalAgencies).toHaveBeenCalledTimes(2);
    unmount();
    for (const [, input] of listOperationalAgencies.mock.calls) {
      expect(input.signal.aborted).toBe(true);
    }
  });

  it("supports Arrow navigation, selection, Escape, and trigger focus restoration", async () => {
    const user = userEvent.setup();
    render(<SelectorHarness />);
    const trigger = screen.getByRole("button", { name: "Select agencies, none selected" });
    await user.click(trigger);
    const search = screen.getByRole("searchbox", { name: "Search agencies" });
    search.focus();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByLabelText("Selected agency IDs")).toHaveTextContent("atlas");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("gives multiple selector instances unique search fields and focuses the opened instance", async () => {
    const user = userEvent.setup();
    render(
      <>
        <OperationalAgencySelector
          feature="shift-management"
          selectionMode="multiple"
          selectedIds={[]}
          onSelectionChange={vi.fn()}
        />
        <OperationalAgencySelector
          feature="billing-management"
          selectionMode="multiple"
          selectedIds={[]}
          onSelectionChange={vi.fn()}
        />
      </>,
    );

    const triggers = screen.getAllByRole("button", { name: "Select agencies, none selected" });
    await user.click(triggers[0]);
    const firstSearchId = screen.getByRole("searchbox", { name: "Search agencies" }).id;
    await user.click(triggers[1]);
    const openedSearchField = screen.getByRole("searchbox", { name: "Search agencies" });

    expect(openedSearchField.id).not.toBe(firstSearchId);
    expect(openedSearchField).toHaveFocus();
  });

  it("wraps Arrow navigation within the current results after search shrinks the list", async () => {
    const user = userEvent.setup();
    const cedar = { ...options[0], id: "cedar", name: "Cedar Home" };
    listOperationalAgencies.mockImplementation((_: string, input: { search?: string } = {}) => Promise.resolve({
      data: input.search ? options : [...options, cedar],
      nextCursor: null,
    }));
    render(<SelectorHarness />);
    await user.click(screen.getByRole("button", { name: "Select agencies, none selected" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search agencies" }), {
      target: { value: "Care" },
    });
    await waitFor(() => {
      expect(screen.queryByRole("option", { name: "Cedar Home" })).not.toBeInTheDocument();
    });

    const atlas = screen.getByRole("option", { name: "Atlas Care" });
    atlas.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Birch House" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(atlas).toHaveFocus();
  });

  it("hydrates every selected agency when the selection exceeds one API page", async () => {
    const manyAgencies = Array.from({ length: 51 }, (_, index) => ({
      ...options[0],
      id: `agency-${index}`,
      name: `Agency ${index + 1}`,
    }));
    listOperationalAgencies.mockImplementation((_: string, input: { ids?: string[]; limit?: number } = {}) => Promise.resolve({
      data: input.ids
        ? manyAgencies.filter((agency) => input.ids?.includes(agency.id)).slice(0, input.limit)
        : [],
      nextCursor: null,
    }));

    render(<SelectorHarness initialIds={manyAgencies.map((agency) => agency.id)} />);

    expect(await screen.findByRole("button", { name: "Remove Agency 51" })).toBeVisible();
  });
});
