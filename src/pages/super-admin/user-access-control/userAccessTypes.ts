import type { AgencyScopeMode, RoleTemplateKey } from "@/lib/api/super-admin-users";

export interface UserAccessFormValue {
  name: string;
  email: string;
  password: string;
  role: string;
  roleTemplate: RoleTemplateKey;
  accessList: string[];
  agencyScope: AgencyScopeMode;
  agencyIds: string[];
}

export type UserAccessInitialData = UserAccessFormValue;
