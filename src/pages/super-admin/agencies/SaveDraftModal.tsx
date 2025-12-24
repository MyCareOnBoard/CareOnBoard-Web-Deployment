import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SaveDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}

export function SaveDraftModal({ open, onOpenChange, onSave }: SaveDraftModalProps) {
  const [saveName, setSaveName] = useState("");

  const handleSave = () => {
    if (saveName.trim()) {
      onSave(saveName);
      setSaveName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] p-[19px] max-w-[426px]">
        <div className="flex flex-col gap-[19px]">
          <DialogHeader>
            <DialogTitle className="text-[32px] font-semibold text-[#10141a] text-center">
              Save this for later
            </DialogTitle>
          </DialogHeader>
          
          <p className="text-[16px] font-medium text-[#808081] text-center leading-[1.6] px-[47px]">
            Do you want to save this application for later? Save this with a name
          </p>

          <div className="flex flex-col gap-[4px] mx-6 px-[20.5px]">
            <Label htmlFor="saveName" className="text-[12px] font-normal text-[#10141a]">
              Save Name
            </Label>
            <Input
              id="saveName"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter a name"
              className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-[16px] text-[14px] text-[#10141a] placeholder:text-[#b2b2b3]"
            />
          </div>

          <div className="flex items-center justify-center gap-[20px] px-[37px]">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-[#808081] hover:bg-[#6a6a6b] text-white px-[16px] py-[16px] rounded-[60px] font-semibold text-[14px] h-[52px] w-[154px]"
            >
              Go back
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="bg-[#00b4b8] hover:bg-[#009da1] text-white px-[16px] py-[16px] rounded-[60px] font-semibold text-[14px] h-[52px] w-[154px] disabled:opacity-50"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
