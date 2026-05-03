import {Button} from "@/components/ui/button";
import type {Audience} from "../types";

export function AudiencePills({
  value,
  onChange,
}: {
  value: Audience;
  onChange: (next: Audience) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/60 p-1">
      <Button
        type="button"
        size="sm"
        variant={value === "agencies" ? "default" : "ghost"}
        className="h-9"
        onClick={() => onChange("agencies")}
      >
        Agencies
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "users" ? "default" : "ghost"}
        className="h-9"
        onClick={() => onChange("users")}
      >
        Users
      </Button>
    </div>
  );
}
