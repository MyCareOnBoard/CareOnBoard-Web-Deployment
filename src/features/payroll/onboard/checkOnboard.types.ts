export interface CheckOnboardInstance { open(): void; close(): void; _show?(): void; }
export interface CheckOnboardCreateOptions { link: string; appearance?: { primaryColor: string }; onClose: () => void; onEvent: (eventName: string, eventData: unknown) => void; }
export interface CheckOnboardGlobal { create(options: CheckOnboardCreateOptions): CheckOnboardInstance; }
export type CheckWindow = Window & { Check?: CheckOnboardGlobal };
