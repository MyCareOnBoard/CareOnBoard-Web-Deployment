import React, { memo } from "react";
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const StageFooter = memo(function StageFooter({
  declared,
  setDeclared,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onSave,
  primaryLoading = false,
  requireDeclaration = true,
  saveButtonText = "Save Progress",
  saveDisabled = false,
  nextBlocked = false,
}: {
  declared: boolean;
  setDeclared: (next: boolean) => void;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSave: () => void;
  primaryLoading?: boolean;
  requireDeclaration?: boolean;
  saveButtonText?: string;
  saveDisabled?: boolean;
  nextBlocked?: boolean;
}) {
  const nextDisabled = requireDeclaration ? !declared : false;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {requireDeclaration && (
        <Checkbox
          checked={declared}
          onChange={(e) => setDeclared(e.target.checked)}
          className="size-[20px]"
          label="I hereby declared that all the information are correct"
          labelClassName="text-[14px] font-normal text-[#808081]"
        />
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {!isFirst && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={primaryLoading}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Previous
          </Button>
        )}

        <Button
          type="button"
          variant={isLast ? "default" : "outline"}
          onClick={onSave}
          disabled={nextDisabled || primaryLoading || saveDisabled}
        >
          {primaryLoading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {saveButtonText}
        </Button>

        {!isLast && (
          <Button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || primaryLoading || nextBlocked}
          >
            Next
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
