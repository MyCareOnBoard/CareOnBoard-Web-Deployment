import { describe, expect, it } from "vitest";

import {
  assertPayrollRevisionIdentity,
  parseCurrentPayrollBootstrapPair,
  parseCurrentPayrollEmployeePage,
  parseCurrentPayrollRunResponse,
  parsePayrollEmployeePage,
  parsePayrollObligationPage,
  parsePayrollRunEmployeeDetail,
  parsePayrollRunEmployeeSourcePage,
  parsePayrollRunEventPage,
  parsePayrollRunPage,
  parsePayrollRunProjectionResponse,
} from "./payrollRunContracts";

const disabled = { enabled: false, reasonCode: "capability_disabled" };

function validRunResponse(): Record<string, unknown> {
  return {
    kind: "run",
    runId: "run-a",
    activeRevisionId: "revision-a",
    revisionNumber: 2,
    run: {
      runId: "run-a",
      runType: "regular",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-23",
      payday: "2026-08-28",
      approvalDeadline: "2026-08-27T17:00:00.000Z",
      reopenDeadline: null,
      timezone: "America/New_York",
      workflowState: "review",
      providerStatus: "draft",
      projectionRevision: 9,
      revisionNumber: 2,
      activeRevisionId: "revision-a",
      stale: false,
      employeeCount: 2,
      includedCount: 1,
      deferredCount: 0,
      zeroDueCount: 1,
      blockerCount: 0,
      warningCount: 1,
      blockerCodes: [],
      warningCodes: ["source_warning"],
      totals: {
        grossEarningsCents: 125_00,
        reimbursementCents: 25_00,
        adjustmentCents: 10_00,
        totalDueCents: 160_00,
      },
      preview: {
        status: "succeeded",
        revisionId: "revision-a",
        hash: "a".repeat(64),
        observedAt: "2026-08-24T11:59:00.000Z",
        totals: {
          grossCents: 135_00,
          reimbursementsCents: 25_00,
          employeeTaxesCents: 20_00,
          employeeDeductionsCents: 5_00,
          employerTaxesCents: 15_00,
          employerContributionsCents: 3_00,
          netPayCents: 110_00,
          expectedCashRequirementCents: 153_00,
        },
      },
      asOf: "2026-08-24T12:00:00.000Z",
    },
    workspaceMode: "run",
    capabilities: {
      replacementWorkspace: true,
      commands: {
        refresh_sources: { enabled: true, reasonCode: null },
        add_adjustment: disabled,
        remove_adjustment: disabled,
        defer_employee: disabled,
        restore_employee: disabled,
        request_preview: disabled,
        approve_payroll: disabled,
        reopen_payroll: disabled,
        refresh_reconciliation: { enabled: true, reasonCode: null },
      },
    },
    prerequisites: {
      revisionReady: true,
      dispositionsComplete: true,
      noBlockers: true,
      providerSynchronized: true,
      previewReady: true,
    },
    activeOperation: {
      operationId: "b".repeat(64),
      command: "refresh_sources",
      state: "running",
      pollAfterMs: 1_000,
    },
  };
}

function validEmployeePage(): Record<string, unknown> {
  return {
    kind: "run",
    runId: "run-a",
    activeRevisionId: "revision-a",
    revisionNumber: 2,
    workspaceMode: "run",
    capabilities: { replacementWorkspace: true },
    items: [{
      employeeId: "employee-a",
      activeRevisionId: "revision-a",
      revisionId: "revision-a",
      employmentType: "field",
      displayName: "Alex Example",
      disposition: "included",
      grossEarningsCents: 125_00,
      reimbursementCents: 25_00,
      adjustmentCents: 10_00,
      totalDueCents: 160_00,
      regularHours: 40,
      overtimeHours: 2.5,
      sourceCount: 3,
      sourceCounts: { shift: 2, expense: 1 },
      hasBlockers: false,
      blockerCodes: [],
      warningCodes: ["source_warning"],
      obligationId: null,
      providerItemState: "pending",
    }],
    nextCursor: null,
    hasMore: false,
  };
}

function validEmpty(workspaceMode: "legacy" | "run" = "legacy"): Record<string, unknown> {
  return {
    kind: "empty",
    runId: null,
    activeRevisionId: null,
    revisionNumber: null,
    run: null,
    emptyReason: "no_active_period",
    workspaceMode,
    capabilities: { replacementWorkspace: workspaceMode === "run" },
  };
}

function setPath(value: Record<string, unknown>, path: string, replacement: unknown): Record<string, unknown> {
  const clone = structuredClone(value);
  const segments = path.split(".");
  let target: Record<string, unknown> = clone;
  for (const segment of segments.slice(0, -1)) {
    target = target[segment] as Record<string, unknown>;
  }
  target[segments.at(-1)!] = replacement;
  return clone;
}

describe("current payroll runtime contracts", () => {
  it("accepts exact run, employee-page, and explicit empty unions", () => {
    expect(parseCurrentPayrollRunResponse(validRunResponse()).kind).toBe("run");
    expect(parseCurrentPayrollEmployeePage(validEmployeePage()).kind).toBe("run");
    expect(parseCurrentPayrollRunResponse(validEmpty()).kind).toBe("empty");
    expect(parseCurrentPayrollEmployeePage(validEmpty("run")).kind).toBe("empty");
  });

  it("parses actionable run detail and rejects the current empty union", () => {
    expect(parsePayrollRunProjectionResponse(validRunResponse()).kind).toBe("run");
    expect(() => parsePayrollRunProjectionResponse(validEmpty("run"))).toThrow();
  });

  it.each([
    ["run.runType", "surprise"],
    ["run.workflowState", "waiting"],
    ["run.providerStatus", "complete"],
    ["run.preview.status", "ready"],
    ["activeOperation.command", "cancel_payroll"],
    ["activeOperation.state", "complete"],
  ])("rejects unknown closed-enum value at %s", (path, replacement) => {
    expect(() => parseCurrentPayrollRunResponse(setPath(validRunResponse(), path, replacement))).toThrow();
  });

  it.each([
    ["employmentType", "contractor"],
    ["disposition", "omitted"],
    ["providerItemState", "created"],
  ])("rejects unknown employee enum value at %s", (field, replacement) => {
    const clone = structuredClone(validEmployeePage());
    const employee = (clone.items as Array<Record<string, unknown>>)[0];
    employee[field] = replacement;
    expect(() => parseCurrentPayrollEmployeePage(clone)).toThrow();
  });

  it.each([
    ["run.totals.grossEarningsCents", 1.5],
    ["run.preview.totals.netPayCents", -1],
    ["run.preview.totals.expectedCashRequirementCents", Number.MAX_SAFE_INTEGER + 1],
    ["run.employeeCount", -1],
  ])("requires safe non-negative integer money and counts at %s", (path, replacement) => {
    expect(() => parseCurrentPayrollRunResponse(setPath(validRunResponse(), path, replacement))).toThrow();
  });

  it("enforces employee page, code, map, cursor, and response-size bounds", () => {
    const tooManyEmployees = validEmployeePage();
    tooManyEmployees.items = Array.from({ length: 51 }, () => structuredClone((validEmployeePage().items as unknown[])[0]));
    expect(() => parseCurrentPayrollEmployeePage(tooManyEmployees)).toThrow();

    expect(() => parseCurrentPayrollRunResponse(setPath(
      validRunResponse(),
      "run.warningCodes",
      Array.from({ length: 101 }, (_, index) => `warning_${index}`),
    ))).toThrow();

    const tooManySourceCounts = validEmployeePage();
    (tooManySourceCounts.items as Array<Record<string, unknown>>)[0].sourceCounts = Object.fromEntries(
      Array.from({ length: 33 }, (_, index) => [`source_${index}`, index]),
    );
    expect(() => parseCurrentPayrollEmployeePage(tooManySourceCounts)).toThrow();

    expect(() => parseCurrentPayrollEmployeePage({
      ...validEmployeePage(),
      nextCursor: "x".repeat(4_097),
    })).toThrow();

    expect(() => parseCurrentPayrollRunResponse({
      ...validRunResponse(),
      padding: "x".repeat(500 * 1_024),
    })).toThrow();
  });

  it("requires exact empty and run identities", () => {
    expect(() => parseCurrentPayrollRunResponse({ ...validEmpty(), runId: "run-a" })).toThrow();
    expect(() => parseCurrentPayrollRunResponse({ ...validRunResponse(), activeRevisionId: null })).toThrow();
    expect(() => parseCurrentPayrollEmployeePage({ ...validEmployeePage(), revisionNumber: 0 })).toThrow();
  });

  it("requires workspace mode to match the monotonic replacement capability", () => {
    expect(() => parseCurrentPayrollRunResponse({
      ...validEmpty("run"),
      capabilities: { replacementWorkspace: false },
    })).toThrow();
    expect(() => parseCurrentPayrollRunResponse({
      ...validEmpty("legacy"),
      capabilities: { replacementWorkspace: true },
    })).toThrow();
    expect(() => parseCurrentPayrollEmployeePage({
      ...validEmployeePage(),
      workspaceMode: "legacy",
    })).toThrow();
  });

  it("requires identical workspace bootstrap values across the current pair", () => {
    expect(() => parseCurrentPayrollBootstrapPair(validEmpty("legacy"), validEmpty("run"))).toThrow();
    expect(parseCurrentPayrollBootstrapPair(validEmpty("run"), validEmpty("run"))).toMatchObject({
      runResponse: { workspaceMode: "run" },
      employeePage: { workspaceMode: "run" },
    });
  });

  it.each([
    ["runId", "run-b"],
    ["activeRevisionId", "revision-b"],
    ["revisionNumber", 3],
  ])("rejects a current pair with mismatched %s", (field, replacement) => {
    const employeePage = validEmployeePage();
    employeePage[field] = replacement;
    if (field === "activeRevisionId") {
      const employee = (employeePage.items as Array<Record<string, unknown>>)[0];
      employee.activeRevisionId = replacement;
      employee.revisionId = replacement;
    }
    expect(() => parseCurrentPayrollBootstrapPair(validRunResponse(), employeePage)).toThrow();
  });

  it("rejects mixed empty and run identities even when workspace values match", () => {
    expect(() => parseCurrentPayrollBootstrapPair(validEmpty("run"), validEmployeePage())).toThrow();
    expect(() => parseCurrentPayrollBootstrapPair(validRunResponse(), validEmpty("run"))).toThrow();
  });

  it("requires all server capabilities and prerequisites with closed disabled reasons", () => {
    const missingCommand = validRunResponse();
    delete ((missingCommand.capabilities as Record<string, unknown>).commands as Record<string, unknown>).request_preview;
    expect(() => parseCurrentPayrollRunResponse(missingCommand)).toThrow();
    expect(() => parseCurrentPayrollRunResponse(setPath(
      validRunResponse(),
      "capabilities.commands.request_preview.reasonCode",
      "unknown_reason",
    ))).toThrow();
    expect(() => parseCurrentPayrollRunResponse(setPath(
      validRunResponse(),
      "prerequisites.previewReady",
      "yes",
    ))).toThrow();
  });

  it("rejects provider, hidden-run, and sensitive fields instead of passing them through", () => {
    for (const extra of [
      { providerPayrollId: "payroll-secret" },
      { visibilityState: "hidden" },
      { bankAccount: "0000" },
      { taxId: "111-11-1111" },
    ]) {
      expect(() => parseCurrentPayrollRunResponse({ ...validRunResponse(), ...extra })).toThrow();
    }
  });

  it("rejects unknown fields at nested boundaries", () => {
    const value = validRunResponse();
    (value.run as Record<string, unknown>).unexpected = true;
    expect(() => parseCurrentPayrollRunResponse(value)).toThrow();
  });

  it("binds revision-scoped responses to the exact requested identity", () => {
    expect(() => assertPayrollRevisionIdentity(validRunResponse(), {
      runId: "run-a",
      activeRevisionId: "revision-b",
    })).toThrow();
    expect(() => assertPayrollRevisionIdentity(validEmployeePage(), {
      runId: "run-a",
      activeRevisionId: "revision-a",
    })).not.toThrow();
    expect(() => assertPayrollRevisionIdentity({
      employeeId: "employee-b",
      activeRevisionId: "revision-a",
    }, {
      employeeId: "employee-a",
      activeRevisionId: "revision-a",
    })).toThrow();
  });

  it("parses exact bounded historical run and employee projections", () => {
    const run = structuredClone(validRunResponse().run);
    expect(parsePayrollRunPage({ items: [run], nextCursor: null, hasMore: false })).toMatchObject({
      items: [{ runId: "run-a" }],
    });

    const employeePage = validEmployeePage();
    delete employeePage.workspaceMode;
    delete employeePage.capabilities;
    expect(parsePayrollEmployeePage(employeePage)).toMatchObject({
      runId: "run-a",
      items: [{ employeeId: "employee-a" }],
    });

    const employee = structuredClone((employeePage.items as unknown[])[0]) as Record<string, unknown>;
    expect(parsePayrollRunEmployeeDetail({ ...employee, sourceDetailsAvailable: true })).toMatchObject({
      employeeId: "employee-a",
      sourceDetailsAvailable: true,
    });

    expect(() => parsePayrollRunPage({
      items: [{ ...(run as Record<string, unknown>), providerPayrollId: "private" }],
      nextCursor: null,
      hasMore: false,
    })).toThrow();
    expect(() => parsePayrollEmployeePage({
      ...employeePage,
      items: [{ ...employee, bankAccount: "private" }],
    })).toThrow();
  });

  it("parses exact bounded source, event, and obligation pages without private payloads", () => {
    const sourcePage = {
      kind: "run",
      runId: "run-a",
      activeRevisionId: "revision-a",
      revisionNumber: 2,
      employeeId: "employee-a",
      items: [{
        key: "source-a",
        type: "timesheet",
        refPath: "staffTimesheets/source-a",
        serviceDate: "2026-08-20",
        sourceVersion: 3,
        payrollInput: { regularHours: 8, serviceCode: "HHA" },
      }],
      nextCursor: null,
      hasMore: false,
    };
    expect(parsePayrollRunEmployeeSourcePage(sourcePage)).toMatchObject({ employeeId: "employee-a" });
    expect(() => parsePayrollRunEmployeeSourcePage({
      ...sourcePage,
      items: [{ ...(sourcePage.items[0]), payrollInput: { taxId: "private" } }],
    })).toThrow();

    const eventPage = {
      items: [{
        eventId: "event-a",
        revisionId: "revision-a",
        type: "preview_requested",
        occurredAt: "2026-08-24T12:00:00.000Z",
        data: { sourceCount: 1 },
      }],
      nextCursor: null,
      hasMore: false,
    };
    expect(parsePayrollRunEventPage(eventPage)).toMatchObject({ items: [{ eventId: "event-a" }] });
    expect(() => parsePayrollRunEventPage({
      ...eventPage,
      items: [{ ...eventPage.items[0], occurredAt: "not-a-date" }],
    })).toThrow();

    const obligationPage = {
      items: [{
        obligationId: "obligation-a",
        kind: "correction",
        state: "open",
        version: 1,
        employeeId: "employee-a",
        originatingRunId: "run-a",
        originatingRevisionId: "revision-a",
        attachedRunId: null,
        reasonCategory: "underpayment",
        amountCents: 500,
        compatibility: { paydayNotBefore: "2026-08-25", paydayNotAfter: null },
        requestedPayday: null,
        createdAt: "2026-08-24T12:00:00.000Z",
        updatedAt: "2026-08-24T12:00:00.000Z",
      }],
      nextCursor: null,
      hasMore: false,
    };
    expect(parsePayrollObligationPage(obligationPage)).toMatchObject({
      items: [{ obligationId: "obligation-a", amountCents: 500 }],
    });
    expect(() => parsePayrollObligationPage({
      ...obligationPage,
      items: [{ ...obligationPage.items[0], amountCents: 0.5 }],
    })).toThrow();
  });
});
