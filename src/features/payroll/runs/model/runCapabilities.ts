import type {
  CurrentPayrollRunResponse,
  PayrollRunActionState,
  PayrollRunCommandName,
} from "./types";

export function getPayrollRunActionState(
  projection: CurrentPayrollRunResponse,
  command: PayrollRunCommandName,
): PayrollRunActionState {
  if (projection.kind === "empty") {
    return { enabled: false, reasonCode: "no_active_run" };
  }
  if (projection.activeOperation) {
    return { enabled: false, reasonCode: "operation_in_progress" };
  }

  return projection.capabilities.commands[command];
}
