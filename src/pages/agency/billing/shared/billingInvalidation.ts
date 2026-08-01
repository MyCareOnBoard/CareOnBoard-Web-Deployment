type PayrollInvalidationListener = () => void;

const listenersByAgency = new Map<string, Set<PayrollInvalidationListener>>();
const debounceTimersByAgency = new Map<string, ReturnType<typeof setTimeout>>();

function requireAgencyId(agencyId: string) {
  const normalized = agencyId.trim();
  if (!normalized) throw new Error("Payroll invalidation agencyId is required");
  return normalized;
}

export function subscribePayrollInvalidation(
  agencyId: string,
  listener: PayrollInvalidationListener,
) {
  const key = requireAgencyId(agencyId);
  const listeners = listenersByAgency.get(key) ?? new Set<PayrollInvalidationListener>();
  listeners.add(listener);
  listenersByAgency.set(key, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByAgency.delete(key);
      const timer = debounceTimersByAgency.get(key);
      if (timer) clearTimeout(timer);
      debounceTimersByAgency.delete(key);
    }
  };
}

export function invalidatePayrollData(agencyId: string) {
  const key = requireAgencyId(agencyId);
  const existingTimer = debounceTimersByAgency.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    debounceTimersByAgency.delete(key);
    for (const listener of listenersByAgency.get(key) ?? []) {
      listener();
    }
  }, 300);
  debounceTimersByAgency.set(key, timer);
}
