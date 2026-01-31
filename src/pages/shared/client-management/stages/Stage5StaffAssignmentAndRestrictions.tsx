import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { searchEmployees, Employee } from "@/lib/api/employees";
import { useAuth } from "@/utils/auth";
import { AddClientFormData, AutoCheckKey, YesNo } from "@/pages/shared/client-management/types/formData";

function YesNoRadio({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNo;
  onChange: (next: "yes" | "no") => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-normal text-[#10141a]">{label}</p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as "yes" | "no")}
        className="gap-4"
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <RadioGroupItem value="yes" />
          <span className="text-[14px] font-medium text-[#10141a]">Yes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <RadioGroupItem value="no" />
          <span className="text-[14px] font-medium text-[#10141a]">No</span>
        </label>
      </RadioGroup>
    </div>
  );
}

export function Stage5StaffAssignmentAndRestrictions({
  footer,
  formData,
  setFormData,
  pageTitle = "Add client",
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  pageTitle?: string;
}) {
  const { user } = useAuth();

  const stage5 = formData.stage5;
  const updateStage5 = (patch: Partial<AddClientFormData["stage5"]>) =>
    setFormData((prev) => ({ ...prev, stage5: { ...prev.stage5, ...patch } }));

  const [primarySearchResults, setPrimarySearchResults] = useState<Employee[]>([]);
  const [secondarySearchResults, setSecondarySearchResults] = useState<Employee[]>([]);
  const [isPrimaryPopoverOpen, setIsPrimaryPopoverOpen] = useState(false);
  const [isSecondaryPopoverOpen, setIsSecondaryPopoverOpen] = useState(false);
  const [isSearchingPrimary, setIsSearchingPrimary] = useState(false);
  const [isSearchingSecondary, setIsSearchingSecondary] = useState(false);
  const [primaryInputValue, setPrimaryInputValue] = useState("");
  const [secondaryInputValue, setSecondaryInputValue] = useState("");
  const primarySearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const secondarySearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const primaryInputRef = useRef<HTMLDivElement>(null);
  const secondaryInputRef = useRef<HTMLDivElement>(null);

  const handlePrimarySearch = useCallback(
    async (query: string) => {
      if (primarySearchTimeoutRef.current) {
        clearTimeout(primarySearchTimeoutRef.current);
      }

      if (query.trim().length < 2) {
        setPrimarySearchResults([]);
        setIsPrimaryPopoverOpen(false);
        return;
      }

      const agencyId = user?.agencyId || user?.uid;

      primarySearchTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSearchingPrimary(true);
          const results = await searchEmployees(query, agencyId);
          setPrimarySearchResults(results);
          setIsPrimaryPopoverOpen(results.length > 0);
        } catch (error) {
          console.error("Failed to search employees (primary):", error);
          setPrimarySearchResults([]);
          setIsPrimaryPopoverOpen(false);
        } finally {
          setIsSearchingPrimary(false);
        }
      }, 300);
    },
    [user?.agencyId, user?.uid]
  );

  const handleSecondarySearch = useCallback(
    async (query: string) => {
      if (secondarySearchTimeoutRef.current) {
        clearTimeout(secondarySearchTimeoutRef.current);
      }

      if (query.trim().length < 2) {
        setSecondarySearchResults([]);
        setIsSecondaryPopoverOpen(false);
        return;
      }

      const agencyId = user?.agencyId || user?.uid;

      secondarySearchTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSearchingSecondary(true);
          const results = await searchEmployees(query, agencyId);
          const selectedIds = new Set([
            stage5.primaryDsp?.id,
            ...stage5.secondaryDsps.map(dsp => dsp.id)
          ].filter(Boolean));
          const filteredResults = results.filter(emp => !selectedIds.has(emp.id));
          setSecondarySearchResults(filteredResults);
          setIsSecondaryPopoverOpen(filteredResults.length > 0);
        } catch (error) {
          console.error("Failed to search employees (secondary):", error);
          setSecondarySearchResults([]);
          setIsSecondaryPopoverOpen(false);
        } finally {
          setIsSearchingSecondary(false);
        }
      }, 300);
    },
    [user?.agencyId, user?.uid, stage5.primaryDsp?.id, stage5.secondaryDsps]
  );

  const handlePrimarySelect = (employee: Employee) => {
    updateStage5({ primaryDsp: { id: employee.id, name: employee.fullName } });
    setPrimaryInputValue(employee.fullName);
    setIsPrimaryPopoverOpen(false);
    setPrimarySearchResults([]);
  };

  const handleSecondarySelect = (employee: Employee) => {
    const isAlreadySelected = stage5.secondaryDsps.some(dsp => dsp.id === employee.id);
    if (!isAlreadySelected) {
      updateStage5({
        secondaryDsps: [...stage5.secondaryDsps, { id: employee.id, name: employee.fullName }]
      });
    }
    setSecondaryInputValue("");
    setIsSecondaryPopoverOpen(false);
    setSecondarySearchResults([]);
  };

  const handleRemoveSecondaryDsp = (dspId: string) => {
    updateStage5({
      secondaryDsps: stage5.secondaryDsps.filter(dsp => dsp.id !== dspId)
    });
  };

  useEffect(() => {
    if (stage5.primaryDsp?.name) {
      setPrimaryInputValue(stage5.primaryDsp.name);
    } else if (!stage5.primaryDsp) {
      setPrimaryInputValue("");
    }
  }, [stage5.primaryDsp]);

  const autoCheckOptions = useMemo(
    () =>
      [
        { key: "compliance" as const, label: "Compliance" },
        { key: "training" as const, label: "Training" },
        { key: "background" as const, label: "Background status" },
        { key: "expired" as const, label: "Expired documents" },
      ] as const,
    []
  );

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          {pageTitle}
        </h1>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            8. Staff Assignment &amp; Restrictions
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Determines which DSPs are eligible to work with the client.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1 relative" ref={primaryInputRef}>
            <label className="text-[12px] font-normal text-[#10141a]">
              Primary DSP Assigned
            </label>
            <Popover open={isPrimaryPopoverOpen} onOpenChange={setIsPrimaryPopoverOpen}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Input
                    value={primaryInputValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPrimaryInputValue(value);
                      if (stage5.primaryDsp) {
                        updateStage5({ primaryDsp: undefined });
                      }
                      handlePrimarySearch(value);
                    }}
                    onFocus={() => {
                      if (primarySearchResults.length > 0) setIsPrimaryPopoverOpen(true);
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white pr-10"
                    placeholder="Search DSP name..."
                  />
                  {isSearchingPrimary && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-[#808081] animate-spin" />
                    </div>
                  )}
                </div>
              </PopoverAnchor>
              {primarySearchResults.length > 0 && (
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] mt-1 p-0 border border-[#cccccd] rounded-xl shadow-lg max-h-[200px] overflow-y-auto bg-white"
                >
                  {primarySearchResults.map((employee) => (
                    <button
                      key={employee.uid || employee.id}
                      type="button"
                      onClick={() => handlePrimarySelect(employee)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl cursor-pointer border-b border-[#f0f0f0] last:border-b-0 transition-colors"
                    >
                      <p className="text-[14px] font-normal text-black">
                        {employee.fullName}
                      </p>
                      <p className="text-[12px] font-normal text-[#808081]">
                        {employee.email}
                      </p>
                    </button>
                  ))}
                </PopoverContent>
              )}
            </Popover>
          </div>

          <div className="flex flex-col gap-1 relative" ref={secondaryInputRef}>
            <label className="text-[12px] font-normal text-[#10141a]">
              Secondary / Backup DSPs
            </label>
            <Popover open={isSecondaryPopoverOpen} onOpenChange={setIsSecondaryPopoverOpen}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Input
                    value={secondaryInputValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSecondaryInputValue(value);
                      handleSecondarySearch(value);
                    }}
                    onFocus={() => {
                      if (secondarySearchResults.length > 0) setIsSecondaryPopoverOpen(true);
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white pr-10"
                    placeholder="Search DSP name..."
                  />
                  {isSearchingSecondary && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-[#808081] animate-spin" />
                    </div>
                  )}
                </div>
              </PopoverAnchor>
              {secondarySearchResults.length > 0 && (
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] mt-1 p-0 border border-[#cccccd] rounded-xl shadow-lg max-h-[200px] overflow-y-auto bg-white"
                >
                  {secondarySearchResults.map((employee) => (
                    <button
                      key={employee.uid || employee.id}
                      type="button"
                      onClick={() => handleSecondarySelect(employee)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl cursor-pointer border-b border-[#f0f0f0] last:border-b-0 transition-colors"
                    >
                      <p className="text-[14px] font-normal text-black">
                        {employee.fullName}
                      </p>
                      <p className="text-[12px] font-normal text-[#808081]">
                        {employee.email}
                      </p>
                    </button>
                  ))}
                </PopoverContent>
              )}
            </Popover>
            {stage5.secondaryDsps.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {stage5.secondaryDsps.map((dsp) => (
                  <div
                    key={dsp.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f0f0f0] rounded-lg text-[14px] font-medium text-[#10141a]"
                  >
                    <span>{dsp.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSecondaryDsp(dsp.id)}
                      className="hover:bg-[#d0d0d0] rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${dsp.name}`}
                    >
                      <X className="w-3 h-3 text-[#808081]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Gender Preference (if any)
            </label>
            <Select
              value={stage5.genderPreference}
              onValueChange={(v) => updateStage5({ genderPreference: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="no-preference">No preference</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              DSP Required Certifications
            </label>
            <Input
              value={stage5.requiredCertifications}
              onChange={(e) => updateStage5({ requiredCertifications: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1 xl:col-span-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Special Conditions
            </label>
            <Input
              value={stage5.specialConditions}
              onChange={(e) => updateStage5({ specialConditions: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>
        </div>

        <div className="mt-8 max-w-[720px] space-y-6">
          <YesNoRadio
            label="Client prefers familiar DSP?"
            value={stage5.prefersFamiliar}
            onChange={(v) => updateStage5({ prefersFamiliar: v })}
          />
          {/* <YesNoRadio
            label="No male/female staff?"
            value={stage5.noMaleFemaleStaff}
            onChange={(v) => updateStage5({ noMaleFemaleStaff: v })}
          /> */}
          <YesNoRadio
            label="Medical restrictions requiring trained DSP?"
            value={stage5.medicalRestrictionsTrained}
            onChange={(v) => updateStage5({ medicalRestrictionsTrained: v })}
          />

          <div className="pt-2">
            <p className="text-[14px] font-normal text-[#10141a]">
              Assignments auto-check DSP:
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {autoCheckOptions.map((opt) => {
                const active = stage5.autoChecks[opt.key];
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      updateStage5({
                        autoChecks: { ...stage5.autoChecks, [opt.key]: !stage5.autoChecks[opt.key] },
                      })
                    }
                    className={[
                      "cursor-pointer rounded-[6px] border border-[#808081] px-[10px] py-[6px] text-[14px] font-medium leading-[1.4] transition-colors",
                      active ? "bg-[#00b4b8] text-white border-[#00b4b8]" : "bg-transparent text-[#10141a]",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {footer}
    </div>
  );
}
