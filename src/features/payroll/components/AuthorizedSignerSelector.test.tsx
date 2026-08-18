import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthorizedSignerSelector } from "./AuthorizedSignerSelector";

const owner = { userUid: "owner", fullName: "Ada Owner", email: "ada@example.test", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: false };
const staff = { userUid: "staff", fullName: "Sam Staff", email: "sam@example.test", title: "Director", identityVersion: `check_signer_v1_${"b".repeat(64)}`, designated: false };
const scope = { audience: "agency" as const, actorUid: "actor", agencyId: "agency" };
const mocks = vi.hoisted(() => ({ ownerQuery: {} as any, searchQuery: {} as any, trigger: vi.fn() }));

vi.mock("../api/agencyPayrollEndpoints", () => ({
  useGetAgencyPayrollSignerCandidatesQuery: () => mocks.ownerQuery,
  useLazyGetAgencyPayrollSignerCandidatesQuery: () => [mocks.trigger, mocks.searchQuery],
}));
vi.mock("../api/payrollCommands", () => ({ newIdempotencyKey: vi.fn(() => "00000000-0000-4000-8000-000000000001") }));

const renderSelector = (props: Partial<React.ComponentProps<typeof AuthorizedSignerSelector>> = {}) => render(<AuthorizedSignerSelector scope={scope} onSelectionChange={vi.fn()} {...props} />);

describe("AuthorizedSignerSelector", () => {
  it("pins an attested staff selection when a later search has no matching results", async () => {
    mocks.ownerQuery = { data: { ownerCandidate: owner }, isLoading: false, isError: false };
    mocks.searchQuery = { currentData: { staffCandidates: [staff] }, originalArgs: { ...scope, q: "sa" }, isFetching: false, isError: false };
    const user = userEvent.setup();
    renderSelector();
    await user.type(screen.getByRole("searchbox"), "sa");
    await user.click(await screen.findByRole("radio", { name: /sam staff/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.clear(screen.getByRole("searchbox"));
    expect(screen.getByText("Selected signer")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /sam staff/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /selected account is authorized/i })).toBeChecked();
  });

  it("does not render last-query data when RTK reports the new query as current", async () => {
    mocks.ownerQuery = { data: { ownerCandidate: owner }, isLoading: false, isError: false };
    mocks.searchQuery = { data: { staffCandidates: [staff] }, currentData: undefined, originalArgs: { ...scope, q: "sa" }, isFetching: true, isError: false };
    const user = userEvent.setup();
    renderSelector();
    await user.type(screen.getByRole("searchbox"), "sa");
    expect(screen.queryByRole("radio", { name: /sam staff/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/searching eligible staff/i);
  });

  it("clears a committed selection after a reset and requires a new attestation", async () => {
    mocks.ownerQuery = { data: { ownerCandidate: owner }, isLoading: false, isError: false };
    mocks.searchQuery = { data: undefined, originalArgs: undefined, isFetching: false, isError: false };
    const onSelectionChange = vi.fn();
    const user = userEvent.setup();
    const view = render(<AuthorizedSignerSelector scope={scope} onSelectionChange={onSelectionChange} />);
    await user.click(screen.getByRole("radio", { name: /ada owner/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(expect.objectContaining({ candidate: owner, authorityAttested: true }));
    view.rerender(<AuthorizedSignerSelector scope={scope} resetKey={1} onSelectionChange={onSelectionChange} />);
    expect(screen.getByRole("checkbox", { name: /selected account is authorized/i })).toBeDisabled();
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
  });

  it("shows loading, owner guidance, empty results, and retry for the current query", async () => {
    mocks.ownerQuery = { isLoading: true, isError: false };
    const view = renderSelector();
    expect(screen.getByRole("status")).toHaveTextContent(/loading signer options/i);
    mocks.ownerQuery = { data: { ownerCandidate: null }, isLoading: false, isError: false };
    view.rerender(<AuthorizedSignerSelector scope={scope} onSelectionChange={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(/only the active agency owner/i);
    mocks.ownerQuery = { data: { ownerCandidate: owner }, isLoading: false, isError: false };
    mocks.searchQuery = { currentData: { staffCandidates: [] }, originalArgs: { ...scope, q: "sa" }, isFetching: false, isError: true };
    view.rerender(<AuthorizedSignerSelector scope={scope} onSelectionChange={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("searchbox"), "sa");
    await user.click(screen.getByRole("button", { name: /try search again/i }));
    expect(mocks.trigger).toHaveBeenCalledWith({ ...scope, q: "sa" }, true);
  });

  it("renders a current empty result and clears selection on an agency scope change", async () => {
    mocks.ownerQuery = { data: { ownerCandidate: owner }, isLoading: false, isError: false };
    mocks.searchQuery = { currentData: { staffCandidates: [] }, originalArgs: { ...scope, q: "sa" }, isFetching: false, isError: false };
    const user = userEvent.setup();
    const view = renderSelector();
    await user.type(screen.getByRole("searchbox"), "sa");
    expect(screen.getByRole("status")).toHaveTextContent(/no eligible staff signer/i);
    await user.clear(screen.getByRole("searchbox"));
    await user.click(screen.getByRole("radio", { name: /ada owner/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    view.rerender(<AuthorizedSignerSelector scope={{ ...scope, agencyId: "agency-b" }} onSelectionChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: /selected account is authorized/i })).toBeDisabled();
  });
});
