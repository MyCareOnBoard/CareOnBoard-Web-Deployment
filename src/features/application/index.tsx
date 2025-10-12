import { useState } from "react";

import { SuccessDialog, SuccessDialogContent } from "@/components/ui/success-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import BellIcon from "@/assets/icons/bell.svg?react";
import CogIcon from "@/assets/icons/cog.svg?react";
import UserIcon from "@/assets/icons/user.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import QuestionIcon from "@/assets/icons/question-mark-circle.svg?react";
import FileIcon from "@/assets/icons/file.svg?react";
import LogoNameIcon from "@/assets/icons/logo-name.svg?react";
import { X } from "lucide-react";

import ProfilePreScreeningStep from "./components/ProfilePreScreeningStep";
import type { Step } from "./types";

const steps: Step[] = [
  { title: "Profile & Pre-Screening", status: "complete" },
  { title: "Document Upload & Eligibility Verification", status: "pending" },
  { title: "Conditional Hire & Compliance", status: "pending" },
  { title: "Final Agency Review", status: "pending" },
  { title: "Official Hire & Orientation", status: "pending" },
];

const navItems = [
  { icon: HomeIcon, label: "Dashboard", active: false },
  { icon: UserIcon, label: "Application", active: true },
  { icon: FileIcon, label: "Documents", active: false },
  { icon: QuestionIcon, label: "Help Center", active: false },
];

export default function ApplicationDashboard() {
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleNext = () => {
    setShowSuccessDialog(true);
  };

  return (
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="fixed left-0 right-0 top-0 z-50 h-[98px] bg-background">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <LogoNameIcon className="w-[226px]"/>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-[10px]">
            <CircleAction icon={CogIcon} ariaLabel="Settings" />
            <div className="relative">
              <CircleAction icon={BellIcon} ariaLabel="Notifications" />
              <span className="absolute right-[9px] top-[9px] block h-[10px] w-[10px] rounded-full bg-[#d53411]" />
            </div>
            <div className="flex items-center gap-3 rounded-[60px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] px-[5px] py-[5px] backdrop-blur-[22px]">
              <div className="h-[34px] w-[34px] rounded-full bg-[#e0e0e0]" />
              <p className="pr-[12px] text-sm font-medium leading-[1.4] text-[#10141a]">Nola Hawkins</p>
              <svg className="h-4 w-4 text-[#808081]" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* Left Sidebar */}
      <aside className="fixed left-[42.5px] top-[130px] z-40 w-[156px] space-y-0 bg-background">
        <nav className="space-y-0">
          {navItems.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              type="button"
              className={cn(
                "mb-0 flex h-[52px] w-full items-center gap-3 rounded-[60px] px-4 text-sm font-semibold backdrop-blur-[22px] transition",
                active
                  ? "bg-[#00b4b8] font-medium text-white"
                  : "font-medium text-[#808081] hover:bg-white/40"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-white" : "text-[#808081]")} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-[240px] pt-[130px]">
        <div className="px-8">
          {/* Page Title and Cancel Button */}
          <div className="mb-[24px] flex items-center justify-between">
            <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Application</h1>
            <Button
              type="button"
              variant="destructive"
              className="gap-[13px] px-4"
            >
              <X className="h-5 w-5" />
              <span>Cancel Application Form</span>
            </Button>
          </div>

          <ProfilePreScreeningStep steps={steps} onNext={handleNext} />
        </div>
      </main>

      {/* Success Dialog */}
      <SuccessDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <SuccessDialogContent
          title="Title"
          description="You have successfully completed Profile & Pre-Screening. Click 'next' to go to the next phase."
          buttonText="Appointment"
          onButtonClick={() => setShowSuccessDialog(false)}
        />
      </SuccessDialog>
    </div>
  );
}
function CircleAction({
  icon: Icon,
  ariaLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="grid h-[42px] w-[42px] place-items-center rounded-[50px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] text-[#808081] backdrop-blur-[22px]"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
