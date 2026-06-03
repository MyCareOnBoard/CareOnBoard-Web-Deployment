type PayrollInvalidationListener = () => void;

const listeners = new Set<PayrollInvalidationListener>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function subscribePayrollInvalidation(listener: PayrollInvalidationListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function invalidatePayrollData() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    for (const listener of listeners) {
      listener();
    }
  }, 300);
}
