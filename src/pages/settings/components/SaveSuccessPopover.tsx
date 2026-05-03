import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2 } from "lucide-react";

export function SaveSuccessPopover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    setOpen(true);
    // Auto-close after 2 seconds
    setTimeout(() => setOpen(false), 2000);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children /* this wraps your Save button */}
      </PopoverTrigger>
      <PopoverContent className="flex flex-col items-center justify-center w-56 space-y-2 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
        <p className="text-sm font-medium text-gray-700">Changes saved successfully!</p>
      </PopoverContent>
    </Popover>
  );
}
