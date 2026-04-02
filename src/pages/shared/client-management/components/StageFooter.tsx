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

      <div className="flex items-center gap-4">
        {!isFirst && (
          <Button
            type="button"
            variant="secondary"
            className="h-[44px] rounded-[60px] px-6 text-[14px] font-semibold"
            onClick={onPrev}
            disabled={primaryLoading}
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          className="h-[44px] rounded-[60px] px-6 text-[14px] font-semibold border-[#00b4b8] text-[#00b4b8] hover:bg-[#00b4b8]/10"
          onClick={onSave}
          disabled={nextDisabled || primaryLoading}
        >
          {primaryLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saveButtonText}
        </Button>

        {!isLast && (
          <Button
            type="button"
            className="h-[44px] rounded-[60px] px-6 text-[14px] font-semibold"
            onClick={onNext}
            disabled={nextDisabled || primaryLoading}
          >
            Next
            <ArrowRight className="w-5 h-5 text-white" />
          </Button>
        )}
      </div>
    </div>
  );
});
