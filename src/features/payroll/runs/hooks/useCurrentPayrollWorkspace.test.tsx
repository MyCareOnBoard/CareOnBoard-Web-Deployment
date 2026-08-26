import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
} from "../model/types";
import { useCurrentPayrollWorkspace } from "./useCurrentPayrollWorkspace";

const queryState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
  employees: {} as Record<string, unknown>,
  currentHook: vi.fn(),
  employeesHook: vi.fn(),
}));

vi.mock("../api/payrollRunEndpoints", () => ({
  useGetCurrentPayrollRunQuery: (...args: unknown[]) => queryState.currentHook(...args),
  useGetCurrentPayrollEmployeesQuery: (...args: unknown[]) => queryState.employeesHook(...args),
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };

const runResponse = (revision = "revision-1", number = 1): CurrentPayrollRunResponse => ({
  kind: "run",
  runId: "run-1",
  activeRevisionId: revision,
  revisionNumber: number,
  run: { runId: "run-1", activeRevisionId: revision, revisionNumber: number },
  capabilities: { commands: {} },
  prerequisites: {},
} as unknown as CurrentPayrollRunResponse);

const employeePage = (revision = "revision-1", number = 1): CurrentPayrollEmployeePage => ({
  kind: "run",
  runId: "run-1",
  activeRevisionId: revision,
  revisionNumber: number,
  items: [],
  nextCursor: null,
  hasMore: false,
});

describe("useCurrentPayrollWorkspace", () => {
  beforeEach(() => {
    queryState.currentHook.mockReset();
    queryState.employeesHook.mockReset();
    const currentData = runResponse();
    const employeeData = employeePage();
    queryState.current = { data: currentData, currentData, isLoading: false, isFetching: false, refetch: vi.fn() };
    queryState.employees = { data: employeeData, currentData: employeeData, isLoading: false, isFetching: false, refetch: vi.fn() };
    queryState.currentHook.mockImplementation(() => queryState.current);
    queryState.employeesHook.mockImplementation(() => queryState.employees);
  });

  it("mounts the atomic current pair in one render and exposes a fresh snapshot", () => {
    const { result } = renderHook(() => useCurrentPayrollWorkspace(scope));

    expect(queryState.currentHook).toHaveBeenCalledOnce();
    expect(queryState.employeesHook).toHaveBeenCalledOnce();
    expect(queryState.currentHook).toHaveBeenCalledWith(scope, { skip: false });
    expect(queryState.employeesHook).toHaveBeenCalledWith(scope, { skip: false });
    expect(result.current).toMatchObject({ freshness: "fresh", commandsEnabled: true });
  });

  it("retains prior data and refetches the pair once for each mismatch identity", async () => {
    const currentRefetch = queryState.current.refetch as ReturnType<typeof vi.fn>;
    const employeeRefetch = queryState.employees.refetch as ReturnType<typeof vi.fn>;
    const { result, rerender } = renderHook(() => useCurrentPayrollWorkspace(scope));
    const originalRun = result.current.runResponse;

    act(() => {
      const currentData = runResponse("revision-2", 2);
      queryState.current = { ...queryState.current, data: currentData, currentData };
      rerender();
    });

    expect(result.current).toMatchObject({ freshness: "stale", commandsEnabled: false });
    expect(result.current.runResponse).toBe(originalRun);
    await waitFor(() => expect(currentRefetch).toHaveBeenCalledOnce());
    expect(employeeRefetch).toHaveBeenCalledOnce();

    rerender();
    await Promise.resolve();
    expect(currentRefetch).toHaveBeenCalledOnce();

    act(() => {
      const currentData = runResponse("revision-3", 3);
      queryState.current = { ...queryState.current, data: currentData, currentData };
      rerender();
    });
    await waitFor(() => expect(currentRefetch).toHaveBeenCalledTimes(2));
    expect(employeeRefetch).toHaveBeenCalledTimes(2);
  });

  it("waits for an in-flight mismatched pair to settle before requesting recovery", async () => {
    const currentRefetch = queryState.current.refetch as ReturnType<typeof vi.fn>;
    const employeeRefetch = queryState.employees.refetch as ReturnType<typeof vi.fn>;
    const { rerender } = renderHook(() => useCurrentPayrollWorkspace(scope));

    act(() => {
      const currentData = runResponse("revision-2", 2);
      queryState.current = { ...queryState.current, data: currentData, currentData, isFetching: false };
      queryState.employees = { ...queryState.employees, isFetching: true };
      rerender();
    });
    await Promise.resolve();
    expect(currentRefetch).not.toHaveBeenCalled();
    expect(employeeRefetch).not.toHaveBeenCalled();

    act(() => {
      queryState.employees = { ...queryState.employees, isFetching: false };
      rerender();
    });
    await waitFor(() => expect(currentRefetch).toHaveBeenCalledOnce());
    expect(employeeRefetch).toHaveBeenCalledOnce();
  });

  it("drops the previous snapshot synchronously when the scope changes", () => {
    let activeScope = scope;
    const { result, rerender } = renderHook(() => useCurrentPayrollWorkspace(activeScope));
    expect(result.current.runResponse).not.toBeNull();

    queryState.current = {
      ...queryState.current,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      refetch: vi.fn(),
    };
    queryState.employees = {
      ...queryState.employees,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      refetch: vi.fn(),
    };
    activeScope = { ...scope, agencyId: "agency-2" };
    rerender();

    expect(result.current).toMatchObject({
      freshness: "loading",
      runResponse: null,
      employeePage: null,
      scopeKey: JSON.stringify(["agency", "actor-1", "agency-2"]),
    });
  });

  it("marks an equal cached pair stale and disables commands while either half refetches", () => {
    const { result, rerender } = renderHook(() => useCurrentPayrollWorkspace(scope));
    expect(result.current).toMatchObject({ freshness: "fresh", commandsEnabled: true });

    queryState.employees = { ...queryState.employees, isFetching: true };
    rerender();

    expect(result.current).toMatchObject({ freshness: "stale", commandsEnabled: false });
    expect(result.current.runResponse).not.toBeNull();
    expect(result.current.employeePage).not.toBeNull();
  });

  it("keeps cached financial data stale and commands disabled after a refresh fails", () => {
    const { result, rerender } = renderHook(() => useCurrentPayrollWorkspace(scope));
    expect(result.current).toMatchObject({ freshness: "fresh", commandsEnabled: true });

    queryState.current = {
      ...queryState.current,
      isFetching: false,
      error: { status: 503 },
    };
    rerender();

    expect(result.current).toMatchObject({
      freshness: "stale",
      commandsEnabled: false,
      error: { status: 503 },
    });
    expect(result.current.runResponse).not.toBeNull();
    expect(result.current.employeePage).not.toBeNull();
  });

  it("fails closed when the initial current pair cannot be loaded", () => {
    queryState.current = {
      data: undefined,
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      error: { status: 503 },
      refetch: vi.fn(),
    };
    queryState.employees = {
      data: undefined,
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      error: { status: 503 },
      refetch: vi.fn(),
    };

    const { result } = renderHook(() => useCurrentPayrollWorkspace(scope));

    expect(result.current).toMatchObject({
      freshness: "unavailable",
      commandsEnabled: false,
      runResponse: null,
      employeePage: null,
    });
  });
});
