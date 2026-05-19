import React from "react";
import {
  CalendarDays,
  ShieldCheck,
  CreditCard,
  Users,
  FolderClosed,
  MessageCircleMore,
  ChevronDown,
  CircleHelp,
  BriefcaseBusiness,
} from "lucide-react";

const AREAS = [
  {
    label: "Schedule",
    description: "Manage shifts and staff assignments",
    icon: CalendarDays,
  },
  {
    label: "Compliance",
    description: "Track requirements and resolve risks",
    icon: ShieldCheck,
  },
  {
    label: "Billing",
    description: "Review invoices and payment issues",
    icon: CreditCard,
  },
  {
    label: "People",
    description: "Monitor staff performance and activity",
    icon: Users,
  },
  {
    label: "Clients",
    description: "View client care and documents",
    icon: FolderClosed,
  },
  {
    label: "Communication",
    description: "Manage messages and updates",
    icon: MessageCircleMore,
  },
];

type SelectAreaDropdownProps = {
  selected: string;
  onSelect: (area: string) => void;
};

export default function SelectAreaDropdown({
  selected,
  onSelect,
}: SelectAreaDropdownProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="
          inline-flex items-center gap-2
          rounded-full border border-[#E7E7E7]
          bg-white px-4 py-2
          cursor-pointer
          text-[14px] font-medium text-[#111827]
          transition hover:border-[#D5D5D5]
        "
      >
        <div className="flex h-7 w-7 items-center justify-center">
          <BriefcaseBusiness className="h-4 w-4 text-[#111827]" />
        </div>

        <span>{selected || "Select area"}</span>

        <ChevronDown className="h-4 w-4 text-[#111827]" />
      </button>

      {open && (
        <div
          className="
            absolute right-0 z-20 mt-3
            w-[330px]
            rounded-[24px]
            border border-[#ECECEC]
            bg-white p-2
            shadow-[0_10px_40px_rgba(0,0,0,0.08)]
          "
        >
          <div className="space-y-1">
            {AREAS.map((area) => {
              const Icon = area.icon;

              return (
                <button
                  key={area.label}
                  type="button"
                  onClick={() => {
                    onSelect(area.label);
                    setOpen(false);
                  }}
                  className="
                    flex w-full items-start justify-between
                    rounded-2xl px-4 py-3
                    transition hover:bg-[#e0f7f7]
                  "
                >
                  <div className="flex gap-3">
                    <div
                      className="
                        m-auto flex h-9 w-9 items-center justify-center
                      "
                    >
                      <Icon className="h-4.5 w-4.5 text-[#111827]" />
                    </div>

                    <div className="flex flex-col items-start text-left">
                      <span className="text-[14px] font-semibold text-[#111827]">
                        {area.label}
                      </span>

                      <span className="mt-1 text-[12px] leading-[20px] text-[#6B7280]">
                        {area.description}
                      </span>
                    </div>
                  </div>

                  <CircleHelp className="mt-1 h-4.5 w-4.5 text-[#111827]" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}