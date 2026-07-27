import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  ConfirmDialog,
  ConfirmDialogContent,
} from "@/components/ui/confirm-dialog";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  RoleTemplateKey,
  SuperAdminAccessConfig,
} from "@/lib/api/super-admin-users";
import type { UserAccessFormValue } from "./userAccessTypes";

type RolePermissionsValue = Pick<
  UserAccessFormValue,
  "role" | "roleTemplate" | "accessList"
>;

interface RolePermissionsFieldsProps {
  config: SuperAdminAccessConfig;
  value: RolePermissionsValue;
  disabled: boolean;
  onChange: (next: RolePermissionsValue) => void;
}

type RoleTemplate = SuperAdminAccessConfig["roleTemplates"][number];

function haveSamePermissions(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((permission) => rightSet.has(permission));
}

function permittedTemplateAccess(
  template: RoleTemplate | undefined,
  assignablePermissions: string[],
): string[] {
  if (!template) return [];
  const defaults = new Set(template.accessList);
  return assignablePermissions.filter((permission) => defaults.has(permission));
}

export default function RolePermissionsFields({
  config,
  value,
  disabled,
  onChange,
}: RolePermissionsFieldsProps) {
  const [pendingTemplateKey, setPendingTemplateKey] =
    useState<RoleTemplateKey | null>(null);

  const templatesByKey = useMemo(
    () => new Map(config.roleTemplates.map((template) => [template.key, template])),
    [config.roleTemplates],
  );
  const currentTemplateAccess = permittedTemplateAccess(
    templatesByKey.get(value.roleTemplate),
    config.accessScopes,
  );
  const permissionsWereEdited = !haveSamePermissions(
    value.accessList,
    currentTemplateAccess,
  );

  const applyTemplate = (template: RoleTemplate) => {
    onChange({
      role: template.key === "custom" ? "" : template.label,
      roleTemplate: template.key,
      accessList: permittedTemplateAccess(template, config.accessScopes),
    });
  };

  const chooseTemplate = (template: RoleTemplate) => {
    if (disabled || template.key === value.roleTemplate) return;

    if (permissionsWereEdited) {
      setPendingTemplateKey(template.key);
      return;
    }

    applyTemplate(template);
  };

  const confirmTemplateChange = () => {
    const nextTemplate = pendingTemplateKey
      ? templatesByKey.get(pendingTemplateKey)
      : undefined;
    if (nextTemplate) applyTemplate(nextTemplate);
    setPendingTemplateKey(null);
  };

  const togglePermission = (permission: string) => {
    const selected = new Set(value.accessList);
    if (selected.has(permission)) {
      selected.delete(permission);
    } else {
      selected.add(permission);
    }

    onChange({
      ...value,
      accessList: config.accessScopes.filter((option) => selected.has(option)),
    });
  };

  const customTitleLength = value.role.trim().length;
  const customTitleIsInvalid =
    value.roleTemplate === "custom" &&
    customTitleLength > 0 &&
    (customTitleLength < 2 || customTitleLength > 60);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="role-template-heading" className="space-y-3">
        <div className="space-y-1">
          <h3
            id="role-template-heading"
            className="text-[14px] font-semibold text-[#10141a]"
          >
            Role template
          </h3>
          <p className="text-[12px] leading-5 text-[#666b70]">
            Start with a role, then tailor the final permissions below.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {config.roleTemplates.map((template) => {
            const isSelected = template.key === value.roleTemplate;
            const permissionCount = permittedTemplateAccess(
              template,
              config.accessScopes,
            ).length;

            return (
              <button
                key={template.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => chooseTemplate(template)}
                disabled={disabled}
                className={`group flex min-h-16 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-[#00a7aa] bg-[#dff7f5] text-[#075b5d] shadow-[0_1px_0_rgba(0,143,146,0.08)]"
                    : "border-[#d9ddde] bg-[#f9fbfb] text-[#303538] hover:border-[#9bcfd0] hover:bg-[#f0f8f8]"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-5">
                    {template.label}
                  </span>
                  <span
                    className={`block text-[11px] leading-4 ${
                      isSelected ? "text-[#347779]" : "text-[#73787b]"
                    }`}
                  >
                    {template.key === "custom"
                      ? "Build from an empty set"
                      : `${permissionCount} permission${permissionCount === 1 ? "" : "s"}`}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-[#008f92] bg-[#008f92] text-white"
                      : "border-[#c7ccce] bg-[#f2f4f4] text-transparent group-hover:border-[#86bfc0]"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {value.roleTemplate === "custom" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="custom-role-title"
              className="text-[12px] font-medium text-[#10141a]"
            >
              Custom role title
            </Label>
            <span className="text-[11px] tabular-nums text-[#73787b]">
              {customTitleLength}/60
            </span>
          </div>
          <Input
            id="custom-role-title"
            required
            minLength={2}
            value={value.role}
            onChange={(event) => onChange({ ...value, role: event.target.value })}
            disabled={disabled}
            aria-invalid={customTitleIsInvalid}
            aria-describedby="custom-role-help"
            placeholder="e.g. Quality Assurance Lead"
            className="h-11 rounded-xl border-[#cfd4d5] bg-[#fbfcfc] px-4 text-[14px] text-[#10141a] placeholder:text-[#8a8f92] focus-visible:border-[#008f92] focus-visible:ring-2 focus-visible:ring-[#008f92]/20"
          />
          <p
            id="custom-role-help"
            className={`text-[11px] leading-4 ${
              customTitleIsInvalid ? "text-[#c83224]" : "text-[#73787b]"
            }`}
          >
            Use 2 to 60 characters after trimming spaces.
          </p>
        </div>
      )}

      <fieldset className="space-y-3">
        <div className="space-y-1">
          <legend className="text-[14px] font-semibold text-[#10141a]">
            Final permissions
          </legend>
          <p className="text-[12px] leading-5 text-[#666b70]">
            These selections are the access this user will receive.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {config.accessScopes.map((permission, index) => {
            const isSelected = value.accessList.includes(permission);
            const inputId = `access-permission-${index}`;

            return (
              <label
                key={permission}
                htmlFor={inputId}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-[#008f92] focus-within:ring-offset-2 ${
                  isSelected
                    ? "border-[#84cccd] bg-[#e9f8f7] text-[#075b5d]"
                    : "border-[#dde1e2] bg-[#fbfcfc] text-[#42474a] hover:bg-[#f3f7f7]"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => togglePermission(permission)}
                  disabled={disabled}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-[#008f92] focus-visible:outline-none disabled:cursor-not-allowed"
                />
                <span className="text-[12px] font-medium leading-4">
                  {permission}
                </span>
              </label>
            );
          })}
        </div>

        {value.accessList.length === 0 && (
          <p role="status" className="text-[11px] font-medium text-[#b54335]">
            Select at least one permission to save this user.
          </p>
        )}
      </fieldset>

      <ConfirmDialog
        open={pendingTemplateKey !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingTemplateKey(null);
        }}
      >
        <ConfirmDialogContent
          confirmText="Replace permissions"
          cancelText="Keep edits"
          onConfirm={confirmTemplateChange}
          onCancel={() => setPendingTemplateKey(null)}
        >
          <DialogTitle className="text-[28px] font-semibold leading-normal text-[#10141a]">
            Replace edited permissions?
          </DialogTitle>
          <DialogDescription className="text-[16px] font-medium leading-[1.6] text-[#808081]">
            Changing roles will replace your permission edits with the new
            template defaults.
          </DialogDescription>
        </ConfirmDialogContent>
      </ConfirmDialog>
    </div>
  );
}

export type { RolePermissionsFieldsProps };
