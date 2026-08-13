export interface CheckOnboardInstance { open(): void; close(): void; }
export interface CheckOnboardCreateOptions { link: string; onClose: () => void; onEvent: (eventName: string, eventData: unknown) => void; }
export interface CheckOnboardGlobal { create(options: CheckOnboardCreateOptions): CheckOnboardInstance; }
export type CheckWindow = Window & { Check?: CheckOnboardGlobal };
