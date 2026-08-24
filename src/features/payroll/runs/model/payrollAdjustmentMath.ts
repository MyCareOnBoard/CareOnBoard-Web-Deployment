const ROUNDING_DIVISOR = 60n;

export function calculateHourlyAdjustmentCents(
  minutes: number,
  rateCentsPerHour: number,
): number {
  if (!Number.isSafeInteger(minutes) || minutes <= 0
    || !Number.isSafeInteger(rateCentsPerHour) || rateCentsPerHour <= 0) {
    throw new TypeError("Minutes and hourly rate must be positive safe integers.");
  }

  const cents = (BigInt(minutes) * BigInt(rateCentsPerHour) + (ROUNDING_DIVISOR / 2n))
    / ROUNDING_DIVISOR;
  if (cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("The calculated adjustment must be a positive safe integer.");
  }
  return Number(cents);
}
