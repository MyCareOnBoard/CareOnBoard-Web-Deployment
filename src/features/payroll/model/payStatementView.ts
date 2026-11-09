import type { PayStatement, PayStatementLine, PayStatementStatus } from "./types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatAmount = (cents: number | null) => (cents === null ? "—" : usd.format(cents / 100));

/** Statement dates are calendar days (YYYY-MM-DD), so format them in UTC to avoid shifting a day. */
export function formatPayDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

export const payPeriod = (statement: Pick<PayStatement, "periodStart" | "periodEnd">) =>
  `${formatPayDate(statement.periodStart)} – ${formatPayDate(statement.periodEnd)}`;

export const STATUS_LABEL: Record<PayStatementStatus, string> = { processing: "Processing", paid: "Paid", needs_attention: "Needs attention" };
export const STATUS_TONE = { processing: "blue", paid: "green", needs_attention: "red" } as const satisfies Record<PayStatementStatus, string>;

/** Hours on the statement's earning lines, or null when none of them carry hours. */
export function statementHours(statement: Pick<PayStatement, "earnings">) {
  const withHours = statement.earnings.filter((line): line is PayStatementLine & { hours: number } => line.hours !== null);
  if (!withHours.length) return null;
  return Math.round(withHours.reduce((total, line) => total + line.hours, 0) * 100) / 100;
}

export const formatHours = (hours: number | null) => (hours === null ? "—" : `${hours} h`);

/** Matches the pay period, pay date, status or any amount as shown in the table. */
export function filterStatements(statements: PayStatement[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return statements;
  return statements.filter((statement) => [
    payPeriod(statement), formatPayDate(statement.payDate), STATUS_LABEL[statement.status],
    formatAmount(statement.grossPayCents), formatAmount(statement.deductionsCents), formatAmount(statement.netPayCents),
  ].some((text) => text.toLowerCase().includes(query)));
}
