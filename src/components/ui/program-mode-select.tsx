export type ProgramMode = "ddd" | "hha" | null;

interface ProgramModeSelectProps {
  value: ProgramMode;
  onChange: (mode: ProgramMode) => void;
  id?: string;
}

const SELECT_CLASSNAME =
  "flex h-11 w-full min-w-0 rounded-xl border border-[#cccccd] bg-white px-4 py-0 text-sm font-normal leading-[1.4] text-[#10141a] outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25";

/** Lets staff explicitly assign or clear which DDD/HHA program view a task or reminder belongs to. */
export default function ProgramModeSelect({ value, onChange, id }: ProgramModeSelectProps) {
  return (
    <select
      id={id}
      className={SELECT_CLASSNAME}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : (e.target.value as "ddd" | "hha"))}
    >
      <option value="">Shared (both programs)</option>
      <option value="ddd">DDD program only</option>
      <option value="hha">HHA program only</option>
    </select>
  );
}
