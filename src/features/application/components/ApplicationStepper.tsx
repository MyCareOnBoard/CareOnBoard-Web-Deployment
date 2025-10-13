import { useMemo } from "react";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import UserIcon from "@/assets/icons/user.svg?react";

import type { Step } from "../types";

interface ApplicationStepperProps {
  steps: Step[];
}

export default function ApplicationStepper({ steps }: ApplicationStepperProps) {
  const progressValue = useMemo(() => {
    const firstPendingIndex = steps.findIndex((step) => step.status !== "complete");

    if (firstPendingIndex === -1) return 100;
    if (firstPendingIndex === 0) return 5;

    return Math.max(5, (firstPendingIndex / steps.length) * 100);
  }, [steps]);

  return (
    <div className="mb-[44px] min-w-[1161px]">
      <div className="mb-5 flex items-center justify-between text-sm leading-[1.4]">
        {steps.map((step) => (
          <span
            key={step.title}
            className={cn(
              "text-center",
              step.status === "complete" ? "font-medium text-[#10141a]" : "font-normal text-[#808081]"
            )}
            style={{ width: "auto" }}
          >
            {step.title}
          </span>
        ))}
      </div>
      <Slider value={[5]} max={100} icon={<UserIcon className="h-4 w-4 text-[#00b4b8]" />} />
    </div>
  );
}

