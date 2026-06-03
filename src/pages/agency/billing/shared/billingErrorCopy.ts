type ApiErrorPayload = {
  status?: number;
  data?: { message?: string };
};

export function mapExpenseMutationError(error: unknown): string {
  const payload = error as ApiErrorPayload;
  const status = payload?.status;
  const message = payload?.data?.message;

  if (status === 403) {
    return "It belongs to another agency or you don't have access.";
  }

  if (status === 409) {
    return "Another reviewer changed it. Refresh the list and try again if needed.";
  }

  if (message) {
    return message;
  }

  return "Check your connection and try again.";
}

export function mapExpensesLoadError(error: unknown): string {
  const payload = error as ApiErrorPayload;
  const message = payload?.data?.message;

  if (message?.includes("366 days")) {
    return "Pick a range of 366 days or less.";
  }

  return message || "Try refreshing the page.";
}
