import React from "react";
import { CalendarDays, Mail, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";

function DetailRow({
  icon,
  label,
  value,
  valueClassName,
  alignTop = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  alignTop?: boolean;
}) {
  return (
    <div className="bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] flex gap-[12px] items-center pl-[8px] pr-[16px] py-[8px] rounded-[20px] w-full">
      <div className="backdrop-blur-sm border border-[#808081] rounded-[200px] p-[10px] shrink-0 flex items-center justify-center">
        <div className="w-[16px] h-[16px] flex items-center justify-center text-[#808081]">
          {icon}
        </div>
      </div>

      <div
        className={[
          "flex flex-1 items-center justify-between min-w-0",
          alignTop ? "items-start" : "items-center",
        ].join(" ")}
      >
        <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
          {label}
        </p>
        <div
          className={[
            "text-[16px] font-semibold leading-[1.6] text-[#10141a] text-right",
            valueClassName ?? "",
          ].join(" ")}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function ProfileTab() {
  return (
    <>
      <div className="mt-4 backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-[8px] flex flex-col gap-[12px]">
        <DetailRow
          icon={<User className="w-4 h-4" />}
          label="Gender"
          value="Female"
        />
        <DetailRow
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          value="kathry.murp@example.com"
        />
        <DetailRow
          icon={<Phone className="w-4 h-4" />}
          label="Phone number"
          value="Update Number"
          valueClassName="text-[#b2b2b3]"
        />
        <DetailRow
          icon={<MapPin className="w-4 h-4" />}
          label="Address"
          value="6391 Elgin St. Celina, Delaware 10299"
        />
        <DetailRow
          icon={<CalendarDays className="w-4 h-4" />}
          label="Joining date"
          value="March 15, 2020"
        />
        <div className="bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] flex gap-[12px] items-start pl-[8px] pr-[16px] py-[8px] rounded-[20px] w-full">
          <div className="backdrop-blur-sm border border-[#808081] rounded-[200px] p-[10px] shrink-0 flex items-center justify-center">
            <div className="w-[16px] h-[16px] flex items-center justify-center text-[#808081]">
              <User className="w-4 h-4" />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-[2px] min-w-0">
            <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
              Professional summary
            </p>
            <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
              I am a highly dedicated receptionist with 4+ years of experience
              ensuring smooth front-desk operations, patient scheduling.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-[8px]">
        <Button
          variant="outline"
          className="h-[36px] w-[80px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium border-[#808081] text-[#808081] bg-transparent"
        >
          Report
        </Button>
        <Button
          variant="destructive"
          className="h-[36px] w-[80px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium bg-[#d53411] hover:bg-[#c02e0f]"
        >
          Ban User
        </Button>
      </div>
    </>
  );
}


