import React, { useState } from "react";
import { X, ChevronDown, Check } from "lucide-react";
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

interface UserAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: {
    name: string;
    email: string;
    password: string;
    accessList: string[];
  };
  onSave: (data: {
    name: string;
    email: string;
    password: string;
    accessList: string[];
  }) => void;
}

const ACCESS_OPTIONS = [
  "Agency directory",
  "User Access Control",
  "Compliance Monitor",
  "Global Notes Quality",
  "Agency Billing Monitor",
  "Corporate Support",
  "Oversight Center",
  "Client Directory",
  "Staff Directory",
];

export default function UserAccessModal({
  open,
  onOpenChange,
  mode,
  initialData,
  onSave,
}: UserAccessModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [password, setPassword] = useState(initialData?.password || "");
  const [accessList, setAccessList] = useState<string[]>(
    initialData?.accessList || []
  );
  const [isAccessOpen, setIsAccessOpen] = useState(false);

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

  const handleSave = () => {
    onSave({ name, email, password, accessList });
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  React.useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setPassword(initialData.password);
      setAccessList(initialData.accessList);
    } else if (open && !initialData) {
      setName("");
      setEmail("");
      setPassword("");
      setAccessList([]);
    }
  }, [open, initialData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(490px,95vw)] h-[min(993px,95vh)] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[18px] !left-1/2 !-translate-x-1/2 md:!left-auto md:!right-[26px] md:!translate-x-0"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full h-[44px] shrink-0">
          <DialogTitle className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
            {mode === "create" ? "Add new user" : "Edit user"}
          </DialogTitle>
          <button
            onClick={handleClose}
            className="flex items-center justify-center p-[8px] rounded-[200px] bg-[#eff2f3] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[#e0e3e4] transition-colors"
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
              className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
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
              disabled={mode === "edit"}
              className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-[4px] w-full">
            <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Password
            </Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-[16px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
            />
          </div>

          {/* Generate Password Button */}
          <div className="flex items-center justify-end w-full">
            <button
              onClick={handleGeneratePassword}
              className="flex items-center justify-center px-[10px] py-[6px] rounded-[6px] border-[0.5px] border-[#808081] hover:bg-[#f5f5f5] transition-colors w-fit cursor-pointer"
            >
              <span className="text-[14px] font-medium leading-[1.4] text-[#10141a]">
                Generate Password
              </span>
            </button>
          </div>

          {/* Access Field with Popover */}
          <div className="flex flex-col gap-[4px] w-full">
            <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
              Access
            </Label>
            <Popover open={isAccessOpen} onOpenChange={setIsAccessOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-between h-[44px] w-full rounded-[12px] border border-[#cccccd] bg-white px-[16px] hover:bg-[#fafafa] transition-colors">
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
                <div className="flex flex-col">
                  {/* Header */}
                  <div className="px-[20px] pt-[12px] pb-0">
                    <p className="text-[12px] font-medium leading-[normal] text-[#808081]">
                      Select access
                    </p>
                  </div>

                  {/* Options */}
                  <div className="flex flex-col mt-[8px]">
                    {ACCESS_OPTIONS.map((option) => {
                      const isSelected = accessList.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => toggleAccess(option)}
                          className={`flex items-center justify-between px-[20px] py-[12px] hover:bg-[#f5f5f5] transition-colors ${
                            isSelected ? "bg-[#e5effa]" : ""
                          }`}
                        >
                          <span
                            className={`text-[14px] leading-[1.4] ${
                              isSelected
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
            className="flex-1 flex items-center justify-center px-[16px] py-[12px] rounded-[60px] backdrop-blur-[22px] border border-[#525253] hover:bg-[#f5f5f5] transition-colors"
          >
            <span className="text-[14px] font-semibold leading-[1.4] text-[#525253]">
              Cancel
            </span>
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center px-[16px] py-[12px] rounded-[60px] bg-[#2b82ff] backdrop-blur-[22px] hover:bg-[#2775e5] transition-colors"
          >
            <span className="text-[14px] font-semibold leading-[1.4] text-white">
              {mode === "create" ? "Add User" : "Update User"}
            </span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
