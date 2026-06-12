import React, { useState, useEffect, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Service, CreateServiceRequest } from "@/lib/api/services";

const INPUT_CLASS =
  "h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] disabled:opacity-50 disabled:cursor-not-allowed";

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: Service;
  existingTypes: string[];
  existingCodes: string[];
  onSave: (data: CreateServiceRequest) => Promise<void>;
}

function ServiceModalInner({
  open,
  onOpenChange,
  mode,
  initialData,
  existingTypes,
  existingCodes,
  onSave,
}: ServiceModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [code, setCode] = useState(initialData?.code ?? "");
  const [program, setProgram] = useState<"ddd" | "hha">(initialData?.program ?? "ddd");
  const [type, setType] = useState(initialData?.type ?? "");
  const [unitType, setUnitType] = useState(initialData?.unitType ?? "");
  const [defaultRate, setDefaultRate] = useState(initialData?.defaultRate ?? "");
  const [modifier, setModifier] = useState(initialData?.modifier ?? "");
  const [customType, setCustomType] = useState("");
  const [useCustomType, setUseCustomType] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setCode(initialData?.code ?? "");
      setProgram(initialData?.program ?? "ddd");
      setType(initialData?.type ?? "");
      setUnitType(initialData?.unitType ?? "");
      setDefaultRate(initialData?.defaultRate ?? "");
      setModifier(initialData?.modifier ?? "");
      setCustomType("");
      setUseCustomType(
        initialData?.type ? !existingTypes.includes(initialData.type) : false
      );
      setError("");
    }
  }, [open, initialData, existingTypes]);

  const effectiveType = useCustomType ? customType.trim() : type;

  const typeOptions = useMemo(
    () => existingTypes.filter(Boolean),
    [existingTypes]
  );
  const showCustomType =
    useCustomType || (typeOptions.length === 0 && !initialData?.type);

  const handleSave = useCallback(async () => {
    setError("");
    if (!name.trim()) {
      setError("Service name is required.");
      return;
    }
    if (!code.trim()) {
      setError("Service code is required. Use the format from your funding source (e.g. T2020).");
      return;
    }
    if (!effectiveType) {
      setError("Service type is required (e.g. Individual Supports).");
      return;
    }
    const codesExcludingCurrent =
      mode === "edit" && initialData
        ? existingCodes.filter((c) => c !== initialData.code)
        : existingCodes;
    if (codesExcludingCurrent.includes(code.trim())) {
      setError("A service with this code already exists. Use a different code.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim(),
        program,
        type: effectiveType,
        unitType: unitType.trim() || undefined,
        defaultRate: defaultRate.trim() || undefined,
        modifier: modifier.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to save service. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [name, code, program, unitType, defaultRate, modifier, effectiveType, mode, initialData, existingCodes, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(490px,95vw)] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[18px]"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full h-[44px] shrink-0">
          <DialogTitle className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
            {mode === "create" ? "Add service" : "Edit service"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="flex items-center justify-center p-[8px] rounded-[200px] bg-[#eff2f3] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[#e0e3e4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#10141a]" />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-[20px] w-full">
          {error && (
            <p className="text-[14px] text-[#d53411] bg-[#fff5f5] border border-[#fecaca] rounded-[12px] px-[16px] py-[12px]">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-[4px] w-full">
            <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Program
            </Label>
            <Select value={program} onValueChange={(v) => setProgram(v as "ddd" | "hha")}>
              <SelectTrigger className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black focus-visible:ring-1 focus-visible:ring-[#00b4b8]">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ddd">DDD</SelectItem>
                <SelectItem value="hha">HHA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-[4px] w-full">
            <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Service type
            </Label>
            {typeOptions.length > 0 && !useCustomType ? (
              <div className="flex gap-2">
                <Select
                  value={type}
                  onValueChange={(v) => {
                    setType(v);
                    setUseCustomType(false);
                  }}
                >
                  <SelectTrigger className="flex-1 h-[44px] min-w-0 rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black focus-visible:ring-1 focus-visible:ring-[#00b4b8]">
                    <SelectValue placeholder="Choose a type (e.g. Individual Supports)" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUseCustomType(true)}
                  disabled={isSaving}
                  className="h-[44px] px-[16px] rounded-[12px] border-[#cccccd] text-[14px] font-medium text-[#10141a] hover:bg-[#f5f5f5] shrink-0"
                >
                  Custom type
                </Button>
              </div>
            ) : (
              <Input
                value={useCustomType ? customType : type}
                onChange={(e) => {
                  if (useCustomType) {
                    setCustomType(e.target.value);
                  } else {
                    setType(e.target.value);
                  }
                }}
                placeholder="e.g. Individual Supports"
                disabled={isSaving}
                className={INPUT_CLASS}
              />
            )}
          </div>
          <div className="flex flex-col gap-[4px] w-full">
            <Label htmlFor="service-name" className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Service name
            </Label>
            <Input
              id="service-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Individual Supports – Self-Directed"
              disabled={isSaving}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-[4px] w-full">
            <Label htmlFor="service-code" className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Service code
            </Label>
            <Input
              id="service-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. T2020"
              disabled={isSaving}
              className={INPUT_CLASS}
            />
            <p className="text-[12px] font-normal text-[#808081]">
              Use the format from your funding source. Codes are used for billing and reporting.
            </p>
          </div>
          {program === "hha" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-[4px]">
                <Label htmlFor="service-unit-type" className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                  Unit type
                </Label>
                <Input
                  id="service-unit-type"
                  value={unitType ?? ""}
                  onChange={(e) => setUnitType(e.target.value)}
                  placeholder="15-min or daily"
                  disabled={isSaving}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col gap-[4px]">
                <Label htmlFor="service-default-rate" className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                  Default rate
                </Label>
                <Input
                  id="service-default-rate"
                  value={defaultRate ?? ""}
                  onChange={(e) => setDefaultRate(e.target.value)}
                  placeholder="e.g. 6.67"
                  disabled={isSaving}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col gap-[4px]">
                <Label htmlFor="service-modifier" className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                  Modifier
                </Label>
                <Input
                  id="service-modifier"
                  value={modifier ?? ""}
                  onChange={(e) => setModifier(e.target.value)}
                  placeholder="EP, UA, TT"
                  disabled={isSaving}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter className="flex gap-3 sm:justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="rounded-[60px] border-[#cccccd] text-[#10141a] hover:bg-[#f5f5f5]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-[60px] bg-[#00b4b8] text-white hover:bg-[#009da1]"
          >
            {isSaving ? "Saving..." : mode === "create" ? "Add service" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const ServiceModal = React.memo(ServiceModalInner);
