import { FileText, Sparkles, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PocSaveGuardAction = "upload" | "generate" | "continue";

export function PocSaveGuardModal({
  open,
  onOpenChange,
  showGenerateOption,
  onAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showGenerateOption: boolean;
  onAction: (action: PocSaveGuardAction) => void;
}) {
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[min(96vw,480px)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 items-start gap-2 space-y-0 border-b border-[#e6e7e8] px-5 pb-2.5 pt-5 text-left">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e6fafa] text-[#00b4b8]">
                <FileText className="h-4 w-4" aria-hidden />
              </span>
              <DialogTitle className="text-left text-lg font-semibold text-[#10141a]">
                Add a Plan of Care?
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-[#808081] hover:bg-[#f5f5f6] hover:text-[#10141a]"
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-left text-[13px] leading-relaxed text-[#808081]">
            This client has an ISP and/or PCPT but no Plan of Care. Add one now or
            continue without it.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4">
          <div className="rounded-[12px] border border-[#cceeee] bg-[#f0fbfb] px-4 py-3">
            <p className="text-[12px] font-medium uppercase tracking-wide text-[#00b4b8]">
              Missing document
            </p>
            <p className="mt-1 text-[14px] font-medium text-[#10141a]">
              Plan of Care (POC)
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#808081]">
              {showGenerateOption
                ? "Upload an existing POC or generate one from the ISP/PCPT on file."
                : "Upload a POC file before saving, or continue without one."}
            </p>
          </div>
        </div>

        <DialogFooter className="flex w-full min-w-0 shrink-0 flex-col gap-3 border-t border-[#e6e7e8] px-5 py-4">
          <div
            className={
              showGenerateOption
                ? "grid w-full min-w-0 grid-cols-2 gap-2"
                : "w-full min-w-0"
            }
          >
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-0 w-full rounded-[12px] border-[#e5e5e6] px-3 text-[#10141a] hover:bg-[#f5f5f6]"
              onClick={() => onAction("upload")}
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span className="truncate">Upload POC</span>
            </Button>
            {showGenerateOption ? (
              <Button
                type="button"
                className="h-10 min-w-0 w-full rounded-[12px] bg-[#00b4b8] px-3 text-white hover:bg-[#009da1]"
                onClick={() => onAction("generate")}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="truncate">Generate POC</span>
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full min-w-0 text-[#808081] hover:bg-[#f5f5f6] hover:text-[#10141a]"
            onClick={() => onAction("continue")}
          >
            Continue without POC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
