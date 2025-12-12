import React from "react";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function StageFooter({
  declared,
  setDeclared,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onSave,
  primaryLoading = false,
  requireDeclaration = true,
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
}) {
  const primaryDisabled = requireDeclaration ? !declared : false;

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
          className="h-[44px] rounded-[60px] px-6 text-[14px] font-semibold"
          onClick={isLast ? onSave : onNext}
          disabled={primaryDisabled || primaryLoading}
        >
          {isLast ? "Save Client" : "Next"}
          {isLast ? (
            <Save className="w-5 h-5 text-white" />
          ) : (
            <ArrowRight className="w-5 h-5 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
}


