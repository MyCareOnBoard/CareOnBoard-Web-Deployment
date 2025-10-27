import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  id: string
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (stepIndex: number) => void
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isClickable = onStepClick && (isCompleted || isCurrent)

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    isCompleted && "bg-[#17a2b8] text-white",
                    isCurrent && "bg-[#17a2b8] text-white ring-4 ring-[#17a2b8]/20",
                    !isCompleted && !isCurrent && "bg-gray-200 text-gray-500",
                    isClickable && "cursor-pointer hover:scale-110",
                  )}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {/* Show checkmark for completed steps, number otherwise */}
                  {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                </button>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p className={cn("text-sm font-medium", isCurrent ? "text-[#17a2b8]" : "text-gray-500")}>
                    {step.title}
                  </p>
                  {step.description && <p className="text-xs text-gray-400 mt-1">{step.description}</p>}
                </div>
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn("flex-1 h-1 mx-4 rounded transition-all", isCompleted ? "bg-[#17a2b8]" : "bg-gray-200")}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
