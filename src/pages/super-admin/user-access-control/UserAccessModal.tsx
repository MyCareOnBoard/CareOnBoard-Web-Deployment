import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, RefreshCw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSuperAdminAccessConfig,
  type RoleTemplateKey,
  type SuperAdminAccessConfig,
} from "@/lib/api/super-admin-users";
import RolePermissionsFields from "./RolePermissionsFields";
import type { UserAccessFormValue } from "./userAccessTypes";

interface UserAccessInitialData {
  name: string;
  email: string;
  password: string;
  role?: string;
  roleTemplate?: RoleTemplateKey;
  accessList: string[];
}

interface UserAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  config?: SuperAdminAccessConfig;
  initialData?: UserAccessInitialData;
  onSave: (data: UserAccessFormValue) => Promise<void>;
}

type RoleAccessValue = Pick<
  UserAccessFormValue,
  "role" | "roleTemplate" | "accessList"
>;

const EMPTY_ROLE_ACCESS: RoleAccessValue = {
  role: "",
  roleTemplate: "custom",
  accessList: [],
};

function roleAccessFromInitialData(
  initialData?: UserAccessInitialData,
): RoleAccessValue {
  if (!initialData) return { ...EMPTY_ROLE_ACCESS };

  return {
    role: initialData.role || "Super Admin",
    roleTemplate: initialData.roleTemplate || "custom",
    accessList: [...initialData.accessList],
  };
}

export default function UserAccessModal({
  open,
  onOpenChange,
  mode,
  config,
  initialData,
  onSave,
}: UserAccessModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [password, setPassword] = useState(initialData?.password || "");
  const [roleAccess, setRoleAccess] = useState<RoleAccessValue>(() =>
    roleAccessFromInitialData(initialData),
  );
  const [resolvedConfig, setResolvedConfig] =
    useState<SuperAdminAccessConfig | null>(config || null);
  const [configError, setConfigError] = useState("");
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const previousOpenRef = useRef(false);
  const configRequestRef = useRef(0);

  useEffect(() => {
    if (config) {
      setResolvedConfig(config);
      setConfigError("");
    }
  }, [config]);

  const loadConfig = async () => {
    if (config) return;
    const requestId = configRequestRef.current + 1;
    configRequestRef.current = requestId;
    setIsConfigLoading(true);
    setConfigError("");

    try {
      const nextConfig = await getSuperAdminAccessConfig();
      if (configRequestRef.current === requestId) {
        setResolvedConfig(nextConfig);
      }
    } catch (error) {
      if (configRequestRef.current === requestId) {
        setConfigError(
          error instanceof Error
            ? error.message
            : "Unable to load role configuration.",
        );
      }
    } finally {
      if (configRequestRef.current === requestId) {
        setIsConfigLoading(false);
      }
    }
  };

  useEffect(() => {
    const justOpened = open && !previousOpenRef.current;

    if (justOpened) {
      setName(initialData?.name || "");
      setEmail(initialData?.email || "");
      setPassword(initialData?.password || "");
      setRoleAccess(roleAccessFromInitialData(initialData));
      setShowPassword(false);
      setIsSaving(false);

      if (!config && !resolvedConfig) {
        void loadConfig();
      }
    }

    previousOpenRef.current = open;
  }, [config, initialData, open, resolvedConfig]);

  useEffect(
    () => () => {
      configRequestRef.current += 1;
    },
    [],
  );

  const handleGeneratePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let newPassword = "";
    for (let index = 0; index < 12; index += 1) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
  };

  const customTitleLength = roleAccess.role.trim().length;
  const roleIsInvalid =
    customTitleLength === 0 ||
    (roleAccess.roleTemplate === "custom" &&
      (customTitleLength < 2 || customTitleLength > 60));
  const saveIsDisabled =
    isSaving ||
    isConfigLoading ||
    !resolvedConfig ||
    roleIsInvalid ||
    roleAccess.accessList.length === 0;

  const handleSave = async () => {
    if (saveIsDisabled) return;

    setIsSaving(true);
    try {
      await onSave({
        name,
        email,
        password,
        role: roleAccess.role.trim(),
        roleTemplate: roleAccess.roleTemplate,
        accessList: [...roleAccess.accessList],
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving user:", error);
      // Keep the modal open so the same form can be retried.
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen || !isSaving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="flex h-[min(940px,calc(100vh-24px))] w-[min(720px,calc(100vw-24px))] max-w-[720px] flex-col gap-0 rounded-[22px] border border-[#dfe5e5] bg-[#fdfefe] p-0 shadow-[0_24px_70px_rgba(21,54,55,0.18)] sm:h-[min(940px,calc(100vh-40px))] sm:rounded-[28px] md:!left-auto md:!right-6 md:!translate-x-0"
        showCloseButton={false}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e6eaea] px-5 py-4 sm:px-7 sm:py-5">
          <div className="space-y-0.5">
            <DialogTitle className="text-[20px] font-semibold leading-7 text-[#10141a]">
              {mode === "create" ? "Add new user" : "Edit user"}
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-5 text-[#6b7073]">
              Assign a clear role and review the final access before saving.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Close user access form"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dce1e2] bg-[#f1f4f4] text-[#303538] transition-colors hover:bg-[#e5ebeb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="user-access-name"
                  className="text-[12px] font-medium text-[#10141a]"
                >
                  Name
                </Label>
                <Input
                  id="user-access-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter name"
                  disabled={isSaving}
                  className="h-11 rounded-xl border-[#cfd4d5] bg-[#fbfcfc] px-4 text-[14px] text-[#10141a] placeholder:text-[#7b8083] focus-visible:border-[#008f92] focus-visible:ring-2 focus-visible:ring-[#008f92]/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="user-access-email"
                  className="text-[12px] font-medium text-[#10141a]"
                >
                  Email
                </Label>
                <Input
                  id="user-access-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email"
                  disabled={mode === "edit" || isSaving}
                  className="h-11 rounded-xl border-[#cfd4d5] bg-[#fbfcfc] px-4 text-[14px] text-[#10141a] placeholder:text-[#7b8083] focus-visible:border-[#008f92] focus-visible:ring-2 focus-visible:ring-[#008f92]/20 disabled:bg-[#f0f2f2]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="user-access-password"
                  className="text-[12px] font-medium text-[#10141a]"
                >
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  disabled={isSaving}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#087b7e] transition-colors hover:bg-[#e9f8f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Generate password
                </button>
              </div>
              <div className="relative">
                <Input
                  id="user-access-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    mode === "edit"
                      ? "Leave blank to keep current password"
                      : "Enter password"
                  }
                  disabled={isSaving}
                  className="h-11 rounded-xl border-[#cfd4d5] bg-[#fbfcfc] pl-4 pr-11 text-[14px] text-[#10141a] placeholder:text-[#7b8083] focus-visible:border-[#008f92] focus-visible:ring-2 focus-visible:ring-[#008f92]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={isSaving}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6f7477] transition-colors hover:bg-[#edf2f2] hover:text-[#10141a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="h-px bg-[#e8ecec]" />

            {resolvedConfig ? (
              <RolePermissionsFields
                config={resolvedConfig}
                value={roleAccess}
                disabled={isSaving}
                onChange={setRoleAccess}
              />
            ) : isConfigLoading ? (
              <div role="status" className="space-y-3" aria-label="Loading roles">
                <div className="h-4 w-28 animate-pulse rounded bg-[#dfe8e8]" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-xl bg-[#edf2f2]"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-[#e9c6c1] bg-[#fff5f3] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[#8f2f24]">
                    Roles could not be loaded
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#8a514a]">
                    {configError || "Try loading the access configuration again."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadConfig()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#c97b70] px-4 text-[12px] font-semibold text-[#8f2f24] transition-colors hover:bg-[#fbe8e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a83d30] focus-visible:ring-offset-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex shrink-0 flex-row gap-3 border-t border-[#e6eaea] bg-[#f8fafa] px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-[#9ca3a5] bg-[#fdfefe] px-4 text-[14px] font-semibold text-[#4d5457] transition-colors hover:bg-[#eef2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveIsDisabled}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#087f82] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#066d70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#b8c3c3] disabled:text-[#f4f7f7]"
          >
            {isSaving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
            )}
            {isSaving
              ? mode === "create"
                ? "Adding user..."
                : "Updating user..."
              : mode === "create"
                ? "Add User"
                : "Update User"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { UserAccessModalProps };
