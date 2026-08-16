export const employeePayrollBlockerCopy = {
  primary_assignment_required: "Choose a primary work location before payroll setup can continue.",
  office_workplace_unavailable: "Your agency is preparing the payroll workplace. Please check back shortly.",
  office_workplace_invalid: "Payroll setup needs attention from your agency.",
  employee_source_incomplete: "Your employment record needs attention from your agency.",
} as const;

export const employeePayrollFallbackBlockerCopy = "Payroll setup needs attention from your agency.";

export function employeePayrollBlockerMessage(code: string): string {
  return employeePayrollBlockerCopy[code as keyof typeof employeePayrollBlockerCopy] ?? employeePayrollFallbackBlockerCopy;
}
