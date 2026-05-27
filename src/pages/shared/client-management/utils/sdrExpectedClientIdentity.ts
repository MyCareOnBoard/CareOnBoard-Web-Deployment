import type { Stage1ClientIdentityAndContactData } from "../types/formData";

export type ExpectedClientIdentity = {
  firstName?: string;
  lastName?: string;
  medicaidId?: string;
  dddId?: string;
};

function trimField(value: string | undefined): string {
  return String(value ?? "").trim();
}

export function hasClientIdentityAnchors(stage1: Stage1ClientIdentityAndContactData): boolean {
  if (trimField(stage1.medicaidId)) return true;
  if (trimField(stage1.dddId)) return true;
  const first = trimField(stage1.firstName);
  const last = trimField(stage1.lastName);
  return Boolean(first && last);
}

export function buildExpectedClientIdentityJson(
  stage1: Stage1ClientIdentityAndContactData,
): string | undefined {
  if (!hasClientIdentityAnchors(stage1)) return undefined;
  const payload: ExpectedClientIdentity = {
    firstName: trimField(stage1.firstName) || undefined,
    lastName: trimField(stage1.lastName) || undefined,
    medicaidId: trimField(stage1.medicaidId) || undefined,
    dddId: trimField(stage1.dddId) || undefined,
  };
  return JSON.stringify(payload);
}
