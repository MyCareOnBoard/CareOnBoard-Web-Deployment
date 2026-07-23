import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchSelect } from "./search-select";

const options = [
  { value: "agency-1", label: "Bright Care" },
  { value: "agency-2", label: "Anchor Health" },
];

describe("SearchSelect", () => {
  it("keeps its clear action outside the trigger button", () => {
    const { container } = render(
      <SearchSelect
        options={options}
        value="agency-1"
        onChange={vi.fn()}
      />,
    );

    expect(container.querySelector("button button")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Clear Bright Care selection",
      }),
    ).toBeInTheDocument();
  });

  it("opens when scrollIntoView is unavailable", () => {
    render(
      <SearchSelect
        options={options}
        onChange={vi.fn()}
        placeholder="All agencies"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "All agencies" }));

    expect(
      screen.getByRole("button", { name: "Bright Care" }),
    ).toBeInTheDocument();
  });
});
