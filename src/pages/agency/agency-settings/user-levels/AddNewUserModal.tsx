import React, { useState } from "react";
import { X, ChevronDown, Check, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/utils/auth";

interface AddNewUserModalProps {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialData?: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    accessList: string[];
    agencyModes?: ("ddd" | "hha")[];
  };
  onSave?: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    accessList: string[];
    agencyModes: ("ddd" | "hha")[];
  }) => Promise<void>;
}

function normalizeAgencyAccessListForUi(list: string[]): string[] {
  return list.map((item) => (item === "Scheduling" ? "Shift Management" : item));
}

// Agency-specific access options
const ACCESS_OPTIONS = [
  "DSP Management",
  "Client Management",
  "Shift Management",
  "Notes",
  "Billing & Management",
  "AI Automation",
  "Support",
  "Analytics",
  "Goals & Documents",
  "Applicant Directory",
  "Reports",
  "Community Inclusion",
  "Trainings",
  "User Levels",
  "Mileage",
  "Incident",
];

const CREATE_DEFAULTS = ["Mileage"];

// Program modes, mirroring the agency's supportedClientTypes (StepTwo pattern).
const MODE_OPTIONS: { value: "ddd" | "hha"; label: string }[] = [
  { value: "ddd", label: "DDD" },
  { value: "hha", label: "HHA" },
];

export default function AddNewUserModal({
  open,
  onClose,
  mode = "create",
  initialData,
  onSave,
}: AddNewUserModalProps) {
  const { user } = useAuth();
  const agencyModeOptions: ("ddd" | "hha")[] = user?.agency?.supportedClientTypes ?? [];
  // Only make the admin pick when there's an actual choice (dual-program agency).
  const showModePicker = agencyModeOptions.length > 1;

  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [password, setPassword] = useState(initialData?.password || "");
  const [accessList, setAccessList] = useState<string[]>(
    initialData?.accessList || (mode === "create" ? CREATE_DEFAULTS : [])
  );
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [agencyModes, setAgencyModes] = useState<("ddd" | "hha")[]>(
    initialData?.agencyModes?.length
      ? initialData.agencyModes
      : mode === "create" ? [] : agencyModeOptions
  );
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetLinkMessage, setShowResetLinkMessage] = useState(false);

  const handleGeneratePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
  };

  const toggleAccess = (access: string) => {
    setAccessList((prev) =>
      prev.includes(access)
        ? prev.filter((item) => item !== access)
        : [...prev, access]
    );
  };

  const toggleMode = (m: "ddd" | "hha") => {
    setAgencyModes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const handleSendResetLink = async () => {
    // TODO: Implement actual reset link functionality
    setShowResetLinkMessage(true);
    setTimeout(() => setShowResetLinkMessage(false), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({
          name,
          email,
          password,
          accessList,
          // Single-mode agency: nothing to pick, grant the agency's only mode.
          // Agency with no configured modes falls back to ddd (the system default).
          agencyModes: showModePicker
            ? agencyModes
            : agencyModeOptions.length ? agencyModeOptions : ["ddd"],
        });
      } else {
        // Default mock save if no onSave provided
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      onClose();
    } catch (error) {
      console.error("Error saving user:", error);
      // Modal stays open on error so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Use a ref to track if we're currently in a save operation
  const isSavingRef = React.useRef(false);

  // Keep the ref in sync with state
  React.useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  // Track the previous open state to detect modal opening
  const prevOpenRef = React.useRef(false);

  React.useEffect(() => {
    // Only reset form when modal transitions from closed to open
    // Don't reset if we're currently saving (prevents re-renders from resetting state)
    const justOpened = open && !prevOpenRef.current;

    if (justOpened && !isSavingRef.current) {
      if (initialData) {
        setName(initialData.name);
        setEmail(initialData.email);
        setPassword(initialData.password);
        setAccessList(normalizeAgencyAccessListForUi(initialData.accessList));
        // Legacy staff (no modes) default to all agency modes so an edit isn't forced.
        setAgencyModes(initialData.agencyModes?.length ? initialData.agencyModes : agencyModeOptions);
      } else {
        setName("");
        setEmail("");
        setPassword("");
        setAccessList(mode === "create" ? CREATE_DEFAULTS : []);
        setAgencyModes(mode === "create" ? [] : agencyModeOptions);
      }
      setIsSaving(false);
      setShowPassword(false);
      setShowResetLinkMessage(false);
    }

    prevOpenRef.current = open;
  }, [open, initialData]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-[min(490px,95vw)] h-[min(993px,95vh)] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[18px] !left-1/2 !-translate-x-1/2 md:!left-auto md:!right-[26px] md:!translate-x-0"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full h-[44px] shrink-0">
          <DialogTitle className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
            {mode === "create" ? "Add team member" : "Edit team member"}
          </DialogTitle>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex items-center justify-center p-[8px] rounded-[200px] bg-[#eff2f3] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[#e0e3e4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-[#10141a]" />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-[20px] w-full flex-1 min-h-0 overflow-y-auto">
          {/* Name Field */}
          <div className="flex flex-col gap-[4px] w-full">
            <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              disabled={isSaving}
              className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-[4px] w-full">
            <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              disabled={mode === "edit" || isSaving}
              className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-[4px] w-full">
            <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Password
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "edit"
                    ? "Leave blank to keep current password"
                    : "Enter password"
                }
                disabled={isSaving}
                className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white pl-[16px] pr-[44px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSaving}
                className="absolute right-[12px] top-1/2 -translate-y-1/2 flex items-center justify-center text-[#808081] hover:text-[#10141a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Generate Password Button - Only show in create mode */}
          {mode === "create" && (
            <div className="flex items-center justify-end w-full">
              <button
                onClick={handleGeneratePassword}
                disabled={isSaving}
                className="flex items-center justify-center px-[10px] py-[6px] rounded-[6px] border-[0.5px] border-[#808081] hover:bg-[#f5f5f5] transition-colors w-fit cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-[14px] font-medium leading-[1.4] text-[#10141a]">
                  Generate Password
                </span>
              </button>
            </div>
          )}

          {/* Send Reset Link */}
          {mode === "edit" && email && (
            <div className="flex flex-col gap-[4px] w-full">
              <button
                onClick={handleSendResetLink}
                disabled={isSaving}
                className="text-[12px] text-[#00B4B8] hover:underline text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send a reset password link
              </button>
              {showResetLinkMessage && (
                <p className="text-[11px] text-[#22c55e]">
                  ✓ Reset link sent to {email}
                </p>
              )}
            </div>
          )}

          {/* Program access (agency modes) — only shown when the agency supports both */}
          {showModePicker && (
            <div className="flex flex-col gap-[4px] w-full">
              <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                Program Access
              </Label>
              <Popover open={isModeOpen && !isSaving} onOpenChange={setIsModeOpen}>
                <PopoverTrigger asChild>
                  <button
                    disabled={isSaving}
                    aria-invalid={agencyModes.length === 0}
                    aria-describedby={agencyModes.length === 0 ? "program-access-error" : undefined}
                    className="flex items-center justify-between h-[44px] w-full rounded-[12px] border border-[#cccccd] bg-white px-[16px] hover:bg-[#fafafa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    <span className="text-[14px] font-normal text-[#525253]">
                      {agencyModes.length > 0
                        ? MODE_OPTIONS.filter((o) => agencyModes.includes(o.value)).map((o) => o.label).join(", ")
                        : "Select program access"}
                    </span>
                    <ChevronDown className="w-5 h-5 text-[#10141a]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] bg-white border border-[#cccccd] rounded-[12px] p-0 shadow-lg"
                  align="start"
                >
                  <div className="flex flex-col">
                    <div className="px-[20px] pt-[12px] pb-0 shrink-0">
                      <p className="text-[12px] font-medium leading-[normal] text-[#808081]">
                        Choose which program views this person can access
                      </p>
                    </div>
                    <div className="flex flex-col mt-[8px]">
                      {MODE_OPTIONS.filter((o) => agencyModeOptions.includes(o.value) || agencyModes.includes(o.value)).map((option) => {
                        const isSelected = agencyModes.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            onClick={() => toggleMode(option.value)}
                            className={`flex items-center justify-between px-[20px] py-[12px] hover:bg-[#f5f5f5] transition-colors ${isSelected ? "bg-[#e5effa]" : ""}`}
                          >
                            <span className={`text-[14px] leading-[1.4] ${isSelected ? "font-semibold text-[#00b4b8]" : "font-normal text-[#808081]"}`}>
                              {option.label}
                            </span>
                            {isSelected && <Check className="w-5 h-5 text-[#00b4b8]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {agencyModes.length === 0 ? (
                <p id="program-access-error" className="text-[11px] text-[#ef4444]">Select at least one program.</p>
              ) : (
                <div className="flex flex-wrap gap-[8px] w-full mt-[4px]">
                  {MODE_OPTIONS.filter((o) => agencyModes.includes(o.value)).map((option) => (
                    <div
                      key={option.value}
                      className="group flex items-center gap-[6px] px-[10px] py-[6px] rounded-[6px] bg-[#00b4b8] border-[0.5px] border-[#808081] hover:bg-[#00a0a3] transition-colors"
                    >
                      <span className="text-[14px] font-medium leading-[1.4] text-white">{option.label}</span>
                      <button
                        onClick={() => toggleMode(option.value)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-white/20 rounded-full p-0.5"
                        aria-label={`Remove ${option.label}`}
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Access Field with Popover */}
          <div className="flex flex-col gap-[4px] w-full">
            <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Access List
            </Label>
            <Popover open={isAccessOpen && !isSaving} onOpenChange={setIsAccessOpen}>
              <PopoverTrigger asChild>
                <button
                  disabled={isSaving}
                  className="flex items-center justify-between h-[44px] w-full rounded-[12px] border border-[#cccccd] bg-white px-[16px] hover:bg-[#fafafa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <span className="text-[14px] font-normal text-[#525253]">
                    {accessList.length > 0
                      ? `${accessList.length} selected`
                      : "Select Access"}
                  </span>
                  <ChevronDown className="w-5 h-5 text-[#10141a]" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] bg-white border border-[#cccccd] rounded-[12px] p-0 shadow-lg"
                align="start"
              >
                <div className="flex flex-col max-h-[300px]">
                  {/* Header */}
                  <div className="px-[20px] pt-[12px] pb-0 shrink-0">
                    <p className="text-[12px] font-medium leading-[normal] text-[#808081]">
                      Choose which areas of the dashboard this person can access
                    </p>
                  </div>

                  {/* Options - Scrollable */}
                  <div className="flex flex-col mt-[8px] overflow-y-auto">
                    {ACCESS_OPTIONS.map((option) => {
                      const isSelected = accessList.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => toggleAccess(option)}
                          className={`flex items-center justify-between px-[20px] py-[12px] hover:bg-[#f5f5f5] transition-colors ${isSelected ? "bg-[#e5effa]" : ""
                            }`}
                        >
                          <span
                            className={`text-[14px] leading-[1.4] ${isSelected
                              ? "font-semibold text-[#00b4b8]"
                              : "font-normal text-[#808081]"
                              }`}
                          >
                            {option}
                          </span>
                          {isSelected && (
                            <Check className="w-5 h-5 text-[#00b4b8]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected Access Badges */}
          {accessList.length > 0 && (
            <div className="flex flex-wrap gap-[8px] w-full">
              {accessList.map((access) => (
                <div
                  key={access}
                  className="group flex items-center gap-[6px] px-[10px] py-[6px] rounded-[6px] bg-[#00b4b8] border-[0.5px] border-[#808081] hover:bg-[#00a0a3] transition-colors"
                >
                  <span className="text-[14px] font-medium leading-[1.4] text-white">
                    {access}
                  </span>
                  <button
                    onClick={() => toggleAccess(access)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-white/20 rounded-full p-0.5"
                    aria-label={`Remove ${access}`}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <DialogFooter className="flex flex-row gap-[12px] items-center justify-center pt-[40px] pb-0 w-full shrink-0 mt-auto">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center px-[16px] py-[12px] rounded-[60px] backdrop-blur-[22px] border border-[#525253] hover:bg-[#f5f5f5] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[14px] font-semibold leading-[1.4] text-[#525253]">
              Cancel
            </span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (showModePicker && agencyModes.length === 0)}
            className="flex-1 flex items-center justify-center gap-2 px-[16px] py-[12px] rounded-[60px] bg-[#2b82ff] backdrop-blur-[22px] hover:bg-[#2775e5] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
            )}
            <span className="text-[14px] font-semibold leading-[1.4] text-white">
              {isSaving
                ? mode === "create"
                  ? "Adding..."
                  : "Saving..."
                : mode === "create"
                  ? "Add team member"
                  : "Save changes"}
            </span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
