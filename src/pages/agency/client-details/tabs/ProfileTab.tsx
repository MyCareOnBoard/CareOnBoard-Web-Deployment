import React from "react";
import { CalendarDays, Mail, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Client } from "@/lib/api/clients";

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

export function ProfileTab({
  client,
  formatDate,
}: {
  client: Client;
  formatDate: (dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date) => string;
}) {
  // Format gender display
  const formatGender = (gender?: string): string => {
    if (!gender) return "Not specified";
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace(/-/g, " ");
  };

  // Format address
  const formatAddress = (): string => {
    const parts = [
      client.address,
      client.city,
      client.state,
      client.zipCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Address not provided";
  };

  return (
    <>
      <div className="mt-4 backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-[8px] flex flex-col gap-[12px]">
        <DetailRow
          icon={<User className="w-4 h-4" />}
          label="Gender"
          value={formatGender(client.gender)}
        />
        <DetailRow
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          value={client.email || "Email not provided"}
          valueClassName={!client.email ? "text-[#b2b2b3]" : ""}
        />
        <DetailRow
          icon={<Phone className="w-4 h-4" />}
          label="Phone number"
          value={client.phone || "Phone not provided"}
          valueClassName={!client.phone ? "text-[#b2b2b3]" : ""}
        />
        <DetailRow
          icon={<MapPin className="w-4 h-4" />}
          label="Address"
          value={formatAddress()}
        />
        <DetailRow
          icon={<CalendarDays className="w-4 h-4" />}
          label="Account Created"
          value={formatDate(client.createdAt)}
        />
        {(client.medicaidId || client.dddId || client.ssn) && (
          <div className="bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] flex gap-[12px] items-start pl-[8px] pr-[16px] py-[8px] rounded-[20px] w-full">
            <div className="backdrop-blur-sm border border-[#808081] rounded-[200px] p-[10px] shrink-0 flex items-center justify-center">
              <div className="w-[16px] h-[16px] flex items-center justify-center text-[#808081]">
                <User className="w-4 h-4" />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-[8px] min-w-0">
              {client.medicaidId && (
                <div>
                  <p className="text-[14px] font-medium leading-[1.6] text-[#808081]">
                    Medicaid ID
                  </p>
                  <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
                    {client.medicaidId}
                  </p>
                </div>
              )}
              {client.dddId && (
                <div>
                  <p className="text-[14px] font-medium leading-[1.6] text-[#808081]">
                    DDD ID
                  </p>
                  <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
                    {client.dddId}
                  </p>
                </div>
              )}
              {client.ssn && (
                <div>
                  <p className="text-[14px] font-medium leading-[1.6] text-[#808081]">
                    SSN
                  </p>
                  <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
                    {client.ssn}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
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


