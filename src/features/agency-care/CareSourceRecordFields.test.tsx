import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CareSourceRecordFields, type CareSourceRecord } from "./CareSourceRecordFields";

const records: CareSourceRecord[] = [
  { id: "c1", firstName: "John", lastName: "Smith", servicePrograms: ["ddd", "sc"] },
  { id: "c2", firstName: "Joan", lastName: "Smythe", servicePrograms: [] },
];
function Harness({ onSearch, found = records }: { onSearch: (query: string) => void; found?: CareSourceRecord[] }) {
  const [clientId, setClientId] = useState("");
  const [programs, setPrograms] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <>
      <CareSourceRecordFields careClientName="John Smith" careAgencyName="Test SC" onSearch={onSearch} searching={false} onRetry={() => {}} records={found}
        clientId={clientId} onClientId={setClientId} programs={programs} onPrograms={setPrograms} confirmed={confirmed} onConfirmed={setConfirmed} />
      <output>{JSON.stringify({ clientId, programs, confirmed })}</output>
    </>
  );
}

it("searches as the user types, selects a record and starts from its enrolled programs", async () => {
  const onSearch = vi.fn();
  const { container } = render(<Harness onSearch={onSearch} />);
  const result = () => JSON.parse(container.querySelector("output")!.textContent!);
  expect(screen.getByText("Not selected yet")).toBeInTheDocument();
  expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox", { name: "1. Find your client record" }), { target: { value: " jo " } });
  await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith("jo"));
  const list = await screen.findByRole("radiogroup", { name: "Matching client records" });
  expect(within(list).getByText("DDD · SC")).toBeInTheDocument();
  expect(within(list).getByText("No programs on file")).toBeInTheDocument();
  fireEvent.click(within(list).getByRole("radio", { name: /John Smith/ }));
  expect(result()).toEqual({ clientId: "c1", programs: ["ddd"], confirmed: false });
  expect(screen.queryByText("Not selected yet")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: /HHA/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /same person/ }));
  expect(result()).toEqual({ clientId: "c1", programs: ["ddd", "hha"], confirmed: true });
  // A record with no DDD or HHA enrollment leaves the chosen programs alone.
  fireEvent.click(within(list).getByRole("radio", { name: /Joan Smythe/ }));
  expect(result()).toEqual({ clientId: "c2", programs: ["ddd", "hha"], confirmed: true });
});

it("says when nothing matches and clears the search for short text", async () => {
  const onSearch = vi.fn();
  render(<Harness onSearch={onSearch} found={[]} />);
  const box = screen.getByRole("searchbox", { name: "1. Find your client record" });
  fireEvent.change(box, { target: { value: "zz" } });
  expect(await screen.findByText(/No client records match “zz”/)).toBeInTheDocument();
  fireEvent.change(box, { target: { value: "z" } });
  await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith(""));
  expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument();
});
