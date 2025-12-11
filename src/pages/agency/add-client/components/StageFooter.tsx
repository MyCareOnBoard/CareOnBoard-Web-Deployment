import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function StageFooter({
  declared,
  setDeclared,
  onCancel,
  onNext,
  requireDeclaration = true,
  cancelLabel = "Cancel",
  nextLabel = "Next",
}: {
  declared: boolean;
  setDeclared: (next: boolean) => void;
  onCancel: () => void;
  onNext: () => void;
  requireDeclaration?: boolean;
  cancelLabel?: string;
  nextLabel?: string;
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
        <Button
          type="button"
          variant="secondary"
          className="h-[44px] rounded-[60px] px-6 text-[14px] font-semibold"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          className="h-[44px] rounded-[60px] px-6 text-[14px] font-semibold"
          onClick={onNext}
          disabled={nextDisabled}
        >
          {nextLabel}
          <ArrowRight className="w-5 h-5 text-white" />
        </Button>
      </div>
    </div>
  );
}


