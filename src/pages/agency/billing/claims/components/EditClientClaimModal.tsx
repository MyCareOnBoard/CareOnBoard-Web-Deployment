import { useState } from "react";
import { format } from "date-fns";
import { Clock, Minus, Plus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CustomDatePicker from "@/components/ui/datePicker";
import TimePicker from "@/components/TimePicker";
import { getInitials } from "@/lib/utils/string-utils";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import {
  formStateToClaim,
  getInitialFormState,
  time24hToDisplay,
  type ClaimFormState,
} from "../utils/claimFormUtils";
import { FieldLabel, SectionLabel } from "./claimsModalShared";
import {
  CLAIMS_CORNER_MODAL_CLASS,
  CLAIMS_CORNER_MODAL_SHELL_CLASS,
  CLAIMS_FIELD_CLASS,
} from "./claimsModalStyles";

type EditClientClaimModalProps = {
  open: boolean;
  claim: RecentClaim;
  onClose: () => void;
  onSave: (updated: RecentClaim) => void;
};

const timeTriggerClassName = `${CLAIMS_FIELD_CLASS} relative flex cursor-pointer items-center pr-12 transition-colors hover:border-[#00b4b8]`;

type HoursStepperProps = {
  value: number;
  onChange: (value: number) => void;
};

function HoursStepper({ value, onChange }: HoursStepperProps) {
  const step = (delta: number) => {
    const next = Math.round((value + delta) * 2) / 2;
    onChange(Math.max(0, next));
  };

  return (
    <div className="flex h-[48px] items-center overflow-hidden rounded-[10px] border border-[#e5e5e6] bg-white">
      <input
        type="text"
        readOnly
        value={value}
        className="min-w-0 flex-1 border-0 bg-transparent px-4 text-[14px] text-[#10141a] outline-none"
        aria-label="Total hours"
      />
      <div className="flex h-full shrink-0 border-l border-[#e5e5e6]">
        <button
          type="button"
          aria-label="Decrease total hours"
          onClick={() => step(-0.5)}
          className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center text-[#808081] transition-colors hover:bg-[#eef4f5] active:bg-[#eef4f5]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#e5e5e6]">
            <Minus className="h-4 w-4" />
          </span>
        </button>
        <button
          type="button"
          aria-label="Increase total hours"
          onClick={() => step(0.5)}
          className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center border-l border-[#e5e5e6] text-[#808081] transition-colors hover:bg-[#eef4f5] active:bg-[#eef4f5]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#e5e5e6]">
            <Plus className="h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

export default function EditClientClaimModal({
  open,
  claim,
  onClose,
  onSave,
}: EditClientClaimModalProps) {
  const [form, setForm] = useState<ClaimFormState>(() => getInitialFormState(claim));

  const updateForm = (patch: Partial<ClaimFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    onSave(formStateToClaim(form, claim));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`${CLAIMS_CORNER_MODAL_CLASS} ${CLAIMS_CORNER_MODAL_SHELL_CLASS}`}
      >
        <DialogHeader className="w-full shrink-0 items-start space-y-0 px-6 pt-6 text-left">
          <div className="flex w-full items-start justify-between gap-4">
            <DialogTitle className="text-left text-[24px] font-bold text-[#10141a]">
              Edit client claim
            </DialogTitle>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center transition-colors"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e5e6] bg-[#f5f5f5] text-[#808081] hover:bg-[#eef4f5] active:bg-[#eef4f5]">
                <X className="h-4 w-4" />
              </span>
            </button>
          </div>
        </DialogHeader>

        <div key={claim.id} className="flex-1 overflow-y-auto px-6 pt-6">
          <SectionLabel>Client information</SectionLabel>
          <div className="flex items-center gap-4 pb-6">
            <Avatar className="h-14 w-14 shrink-0 rounded-full">
              {claim.clientAvatarUrl && (
                <AvatarImage
                  src={claim.clientAvatarUrl}
                  alt={claim.client}
                  className="h-full w-full rounded-full object-cover"
                />
              )}
              <AvatarFallback className="rounded-full bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-sm font-medium text-white">
                {getInitials(claim.client)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-[#10141a]">{claim.client}</p>
              <p className="mt-1 text-[14px] text-[#808081]">Service code: {claim.serviceCode}</p>
            </div>
          </div>

          <div className="border-t border-[#e5e5e6] pt-6">
            <SectionLabel>Staff details</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Staff ID</FieldLabel>
                <Input
                  value={`ID: ${form.staffId}`}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/^ID:\s*/i, "");
                    updateForm({ staffId: raw });
                  }}
                  className={CLAIMS_FIELD_CLASS}
                />
              </div>
              <div>
                <FieldLabel>PA Number</FieldLabel>
                <Input
                  value={form.paNumber}
                  onChange={(event) => updateForm({ paNumber: event.target.value })}
                  className={CLAIMS_FIELD_CLASS}
                />
              </div>
              <div>
                <FieldLabel>Total hours</FieldLabel>
                <HoursStepper
                  value={form.totalHours}
                  onChange={(totalHours) => updateForm({ totalHours })}
                />
              </div>
              <div>
                <FieldLabel>Rate</FieldLabel>
                <Input
                  value={form.rate}
                  onChange={(event) => updateForm({ rate: event.target.value })}
                  className={CLAIMS_FIELD_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-[#e5e5e6] pt-6">
            <SectionLabel>Service details</SectionLabel>
            <div className="space-y-4">
              <div>
                <FieldLabel>Service date</FieldLabel>
                <CustomDatePicker
                  key={`claim-service-date-${claim.id}`}
                  align="start"
                  date={form.serviceDateIso ? new Date(form.serviceDateIso) : null}
                  placeholder="Select service date"
                  setDate={(date) =>
                    updateForm({
                      serviceDateIso: date ? format(date, "yyyy-MM-dd") : "",
                    })
                  }
                  className={CLAIMS_FIELD_CLASS}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Start time</FieldLabel>
                  <TimePicker
                    value={form.durationStart24h}
                    onChange={(durationStart24h) => updateForm({ durationStart24h })}
                  >
                    <div className={timeTriggerClassName}>
                      <span className="truncate">
                        {form.durationStart24h
                          ? time24hToDisplay(form.durationStart24h)
                          : "Select time"}
                      </span>
                      <Clock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#808081]" />
                    </div>
                  </TimePicker>
                </div>
                <div>
                  <FieldLabel>End time</FieldLabel>
                  <TimePicker
                    value={form.durationEnd24h}
                    onChange={(durationEnd24h) => updateForm({ durationEnd24h })}
                  >
                    <div className={timeTriggerClassName}>
                      <span className="truncate">
                        {form.durationEnd24h ? time24hToDisplay(form.durationEnd24h) : "Select time"}
                      </span>
                      <Clock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#808081]" />
                    </div>
                  </TimePicker>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="mt-6 mb-8 flex h-[52px] w-full min-h-[44px] cursor-pointer items-center justify-center rounded-full bg-[#00b4b8] text-[16px] font-medium text-white transition-colors hover:bg-[#009da1] active:bg-[#009199]"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
