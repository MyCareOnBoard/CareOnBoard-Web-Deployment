import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Service } from "@/lib/api/services";
import type { HhaAuthorization } from "@/pages/shared/client-management/types/formData";
import { RatePayTypeField } from "@/pages/shared/client-management/components/RatePayTypeField";
import { ServiceAssignedDspsSection } from "@/pages/shared/client-management/components/ServiceAssignedDspsSection";
import { payTypeToLabel } from "@/pages/shared/client-management/utils/applyHhaCatalogService";

const READONLY_INPUT_CLASS =
  "h-[44px] rounded-[12px] border-[#cccccd] bg-[#fafbfc] text-[#10141a]";

const CALENDAR_TO_YEAR = new Date().getFullYear() + 10;

function HhaCalendarDateField({
  label,
  value,
  onSelectDate,
  placeholder = "Select date",
}: {
  label: string;
  value: Date | undefined;
  onSelectDate: (d: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-normal text-[#10141a]">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="w-full focus:outline-none">
            <InputGroup className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white px-4">
              <InputGroupInput
                value={value ? format(value, "MMM d, yyyy") : ""}
                placeholder={placeholder}
                readOnly
                className="text-[#10141a]"
              />
              <InputGroupAddon align="inline-end">
                <CalendarDays className="h-5 w-5 text-[#10141a]" />
              </InputGroupAddon>
            </InputGroup>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value ?? new Date()}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={CALENDAR_TO_YEAR}
            formatters={{
              formatMonthDropdown: (date) => date.toLocaleString("default", { month: "long" }),
            }}
            classNames={{
              dropdown_root:
                "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
            }}
            onSelect={(d) => {
              onSelectDate(d);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type HhaAuthorizationFieldsProps = {
  row: HhaAuthorization;
  hhaServices: Service[];
  onChange: (patch: Partial<HhaAuthorization>) => void;
  onSelectServiceId: (serviceId: string | undefined) => void;
};

export const HhaAuthorizationFields = React.memo(function HhaAuthorizationFields({
  row,
  hhaServices,
  onChange,
  onSelectServiceId,
}: HhaAuthorizationFieldsProps) {
  const hasService = Boolean(row.serviceId || row.serviceCode);
  const payTypeLabel = payTypeToLabel(row.clientPayType);
  // The backend requires staff rate + pay type once a row has a service (incl.
  // imported/matched rows, which the catalog can't supply). Flag it so the user
  // isn't surprised by a save-time validation error.
  const staffPayIncomplete = hasService && (!(row.staffRate ?? "").trim() || !row.payType);

  return (
    <div className="space-y-6">
      <div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[12px] font-normal text-[#10141a]">Approved service</label>
            <Select
              value={row.serviceId || undefined}
              onValueChange={(value) => onSelectServiceId(value || undefined)}
            >
              <SelectTrigger className="h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select HHA service" />
              </SelectTrigger>
              <SelectContent>
                {hhaServices.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    {svc.name} ({svc.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!hasService ? (
            <p className="col-span-full text-[13px] font-medium text-[#808081]">
              Select a service to load code, rate, and unit type.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Service code</label>
                <Input readOnly value={row.serviceCode ?? ""} className={READONLY_INPUT_CLASS} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Service Name</label>
                <Input readOnly value={row.serviceName ?? ""} className={READONLY_INPUT_CLASS} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Unit type</label>
                <Input readOnly value={row.unitType ?? ""} className={READONLY_INPUT_CLASS} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Client rate</label>
                <Input readOnly value={row.rate ?? ""} className={READONLY_INPUT_CLASS} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Pay type</label>
                <Input readOnly value={payTypeLabel} className={READONLY_INPUT_CLASS} />
              </div>
              {row.serviceType ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Service category</label>
                  <Input readOnly value={row.serviceType} className={READONLY_INPUT_CLASS} />
                </div>
              ) : null}
              {row.modifier ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Modifier</label>
                  <Input readOnly value={row.modifier} className={READONLY_INPUT_CLASS} />
                </div>
              ) : null}
            </>
          )}
        </div>
        {hasService ? (
          <p className="mt-3 text-[13px] font-medium text-[#808081]">
            Billing details are loaded from the service catalog and can&apos;t be edited here.
          </p>
        ) : null}
        {hasService ? (
          <div className="mt-6 flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Service goal</label>
            <textarea
              value={row.goal ?? ""}
              onChange={(e) => onChange({ goal: e.target.value })}
              rows={3}
              className="rounded-[12px] border border-[#cccccd] bg-white p-3 text-[14px] text-[#10141a] focus:outline-none focus:ring-2 focus:ring-[#00b4b8]"
              placeholder="Goal for this service (shown on the HHA Service Activity Log)"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-[12px] border border-[#e1e3e8] bg-[#fafbfc]/50 p-4">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081]">
          Payer authorization
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Authorization number</label>
            <Input
              value={row.authorizationNumber ?? ""}
              onChange={(e) => onChange({ authorizationNumber: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Payer authorization or PA number"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Authorized hours per week
            </label>
            <Input
              value={row.approvedHours ?? ""}
              onChange={(e) => onChange({ approvedHours: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Weekly hours"
            />
          </div>
          <HhaCalendarDateField
            label="Start date"
            value={row.startDate}
            onSelectDate={(d) => onChange({ startDate: d })}
          />
          <HhaCalendarDateField
            label="End date"
            value={row.endDate}
            onSelectDate={(d) => onChange({ endDate: d })}
          />
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Payer</label>
            <Input
              value={row.payerSource ?? ""}
              onChange={(e) => onChange({ payerSource: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="e.g. Medicaid, UnitedHealthcare"
            />
          </div>
          <RatePayTypeField
            label="Staff rate"
            rate={row.staffRate ?? ""}
            payType={row.payType}
            onRateChange={(v) => onChange({ staffRate: v })}
            onPayTypeChange={(v) => onChange({ payType: v })}
          />
        </div>
        {staffPayIncomplete ? (
          <p className="mt-3 text-[13px] font-medium text-red-600" role="alert">
            Staff rate and pay type are required before this client can be saved.
          </p>
        ) : null}
      </div>

      <ServiceAssignedDspsSection
        isEditing
        assignedDsps={row.assignedDsps ?? []}
        onChange={(assignedDsps) => onChange({ assignedDsps })}
      />
    </div>
  );
});
