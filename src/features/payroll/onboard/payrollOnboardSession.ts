type Teardown = () => void;
const callbacks = new Set<Teardown>();
export const registerPayrollOnboardTeardown = (callback: Teardown) => { callbacks.add(callback); return () => callbacks.delete(callback); };
export const clearPayrollOnboardSessions = () => callbacks.forEach((callback) => callback());
