import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AddClientFormData,
  EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS,
  type ClientMedication,
  type EmergencyBackupPlan,
  type EmergencyContactRelationship,
  type Stage6EmergencyContact,
} from "@/pages/shared/client-management/types/formData";

const AUTO_POPULATE_CHIPS = [
  "Service notes",
  "Goal progress",
  "AI notes review",
  "AI POC builder",
] as const;

function OptionalYesNoSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: "yes" | "no";
  onChange: (next: "yes" | "no" | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-normal text-[#10141a]">{label}</label>
      <Select
        value={value ?? "__unset__"}
        onValueChange={(v) => {
          if (v === "__unset__") onChange(undefined);
          else onChange(v as "yes" | "no");
        }}
      >
        <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unset__">Not specified</SelectItem>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function Stage6GoalsAndEmergency({
  footer,
  formData,
  setFormData,
  pageTitle = "Add client",
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  pageTitle?: string;
}) {
  const stage6 = formData.stage6;
  const updateStage6 = (patch: Partial<AddClientFormData["stage6"]>) =>
    setFormData((prev) => ({ ...prev, stage6: { ...prev.stage6, ...patch } }));

  const syncPrimaryEmergencyFromContacts = (contacts: Stage6EmergencyContact[]) => {
    const first = contacts[0];
    return {
      emergencyName: first?.name ?? "",
      emergencyRelationship: first?.relationship,
      primaryPhone: first?.primaryPhone ?? "",
      secondaryPhone: first?.secondaryPhone ?? "",
      hospitalPreference: first?.hospitalPreference ?? "",
      emergencyProtocol: first?.emergencyProtocol ?? "",
    };
  };

  const patchEmergencyContacts = (
    updater: (prev: Stage6EmergencyContact[]) => Stage6EmergencyContact[],
  ) => {
    setFormData((prev) => {
      const cur = prev.stage6.emergencyContacts ?? [];
      const next = updater(cur);
      return {
        ...prev,
        stage6: {
          ...prev.stage6,
          emergencyContacts: next,
          ...syncPrimaryEmergencyFromContacts(next),
        },
      };
    });
  };

  const backupPlan = stage6.emergencyBackupPlan ?? {};

  const patchEmergencyBackup = (patch: Partial<EmergencyBackupPlan>) => {
    updateStage6({
      emergencyBackupPlan: { ...backupPlan, ...patch },
    });
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          {pageTitle}
        </h1>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            9. Goals &amp; outcomes setup
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Goal summaries for notes and progress tracking. Outcome statements that belong to a specific
            authorized service are entered in step 4 (Service authorizations) for that service.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Client Goals (from ISP)
            </label>
            <Input
              value={stage6.clientGoals}
              onChange={(e) => updateStage6({ clientGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Community inclusion goals
            </label>
            <Input
              value={stage6.communityGoals}
              onChange={(e) => updateStage6({ communityGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1 xl:col-span-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Daily living goals
            </label>
            <Input
              value={stage6.dailyLivingGoals}
              onChange={(e) => updateStage6({ dailyLivingGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Behavioral goals
            </label>
            <Input
              value={stage6.behavioralGoals}
              onChange={(e) => updateStage6({ behavioralGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Skill-building goals
            </label>
            <Input
              value={stage6.skillBuildingGoals}
              onChange={(e) => updateStage6({ skillBuildingGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Target Behaviors (if applicable)
            </label>
            <Input
              value={stage6.targetBehaviors}
              onChange={(e) => updateStage6({ targetBehaviors: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Support Strategies
            </label>
            <Input
              value={stage6.supportStrategies}
              onChange={(e) => updateStage6({ supportStrategies: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            Employment &amp; voting
          </p>
          <p className="text-[13px] font-medium leading-[1.4] text-[#808081] mt-1">
            Document day services, employment goals, and voting preferences from the ISP.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1 xl:col-span-2">
              <label className="text-[12px] font-normal text-[#10141a]">Employment status</label>
              <Input
                value={stage6.employmentStatus ?? ""}
                onChange={(e) => updateStage6({ employmentStatus: e.target.value })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. Not employed, community employment"
              />
            </div>
            <div className="flex flex-col gap-1 xl:col-span-2">
              <label className="text-[12px] font-normal text-[#10141a]">Employment plan / goals</label>
              <Input
                value={stage6.employmentPlan ?? ""}
                onChange={(e) => updateStage6({ employmentPlan: e.target.value })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Short summary from ISP"
              />
            </div>
            <div className="flex flex-col gap-1 xl:col-span-2">
              <label className="text-[12px] font-normal text-[#10141a]">Voting plan</label>
              <Input
                value={stage6.votingPlan ?? ""}
                onChange={(e) => updateStage6({ votingPlan: e.target.value })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. Registered, needs support to vote"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[14px] font-normal text-[#10141a]">
            This data auto-populates:
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {AUTO_POPULATE_CHIPS.map((label) => (
              <div
                key={label}
                className="cursor-pointer rounded-[6px] border border-[#808081] bg-transparent px-[10px] py-[6px] text-[14px] font-medium leading-[1.4] text-[#10141a]"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            10. Emergency / critical information
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            This shows in DSP mobile app immediately.
          </p>
        </div>

        <div className="mb-8 rounded-[12px] border border-[#e5e5e6] bg-white/50 p-4">
          <p className="text-[14px] font-semibold text-[#10141a]">Emergency backup plan</p>
          <p className="text-[13px] text-[#808081] mt-1 mb-4">
            ISP questions about backup supports, settings, and medical decision-makers.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OptionalYesNoSelect
              label="Person-centered emergency response (PERS) ordered"
              value={backupPlan.pers === "yes" || backupPlan.pers === "no" ? backupPlan.pers : undefined}
              onChange={(v) => patchEmergencyBackup({ pers: v === undefined ? undefined : v })}
            />
            <OptionalYesNoSelect
              label="Provider managed setting"
              value={
                backupPlan.providerManagedSetting === "yes" || backupPlan.providerManagedSetting === "no"
                  ? backupPlan.providerManagedSetting
                  : undefined
              }
              onChange={(v) =>
                patchEmergencyBackup({
                  providerManagedSetting: v === undefined ? undefined : v,
                })
              }
            />
            <OptionalYesNoSelect
              label="Advance directive on file"
              value={
                backupPlan.advanceDirective === "yes" || backupPlan.advanceDirective === "no"
                  ? backupPlan.advanceDirective
                  : undefined
              }
              onChange={(v) =>
                patchEmergencyBackup({
                  advanceDirective: v === undefined ? undefined : v,
                })
              }
            />
            <OptionalYesNoSelect
              label="Proxy decision-maker identified"
              value={
                backupPlan.proxyDecisionMaker === "yes" || backupPlan.proxyDecisionMaker === "no"
                  ? backupPlan.proxyDecisionMaker
                  : undefined
              }
              onChange={(v) =>
                patchEmergencyBackup({
                  proxyDecisionMaker: v === undefined ? undefined : v,
                })
              }
            />
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Backup plan notes</label>
            <Textarea
              value={backupPlan.narrative ?? ""}
              onChange={(e) => patchEmergencyBackup({ narrative: e.target.value })}
              className="min-h-[96px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Summarize who to call, evacuation preferences, or other backup details"
            />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a] mb-2">Medications</p>
          <p className="text-[13px] text-[#808081] mb-3">
            List each medication the ISP authorizes you to track (when sharing is allowed).
          </p>
          {(stage6.medications ?? []).length === 0 ? (
            <p className="text-[14px] text-[#808081]">No medications added yet.</p>
          ) : null}
          <div className="space-y-4">
            {(stage6.medications ?? []).map((med: ClientMedication, idx: number) => (
              <div
                key={idx}
                className="flex flex-col gap-3 rounded-[12px] border border-[#e5e5e6] bg-white/60 p-4 lg:flex-row lg:flex-wrap lg:items-end"
              >
                <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Name</label>
                  <Input
                    value={med.name ?? ""}
                    onChange={(e) => {
                      const next = [...(stage6.medications ?? [])];
                      next[idx] = { ...next[idx], name: e.target.value };
                      updateStage6({ medications: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
                <div className="flex min-w-[100px] flex-1 flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Dosage</label>
                  <Input
                    value={med.dosage ?? ""}
                    onChange={(e) => {
                      const next = [...(stage6.medications ?? [])];
                      next[idx] = { ...next[idx], dosage: e.target.value };
                      updateStage6({ medications: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
                <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Frequency</label>
                  <Input
                    value={med.frequency ?? ""}
                    onChange={(e) => {
                      const next = [...(stage6.medications ?? [])];
                      next[idx] = { ...next[idx], frequency: e.target.value };
                      updateStage6({ medications: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
                <div className="flex min-w-[160px] flex-[2] flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Notes</label>
                  <Input
                    value={med.notes ?? ""}
                    onChange={(e) => {
                      const next = [...(stage6.medications ?? [])];
                      next[idx] = { ...next[idx], notes: e.target.value };
                      updateStage6({ medications: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
                <div className="flex h-[44px] items-center">
                  <Checkbox
                    checked={!!med.selfAdminister}
                    onChange={(e) => {
                      const next = [...(stage6.medications ?? [])];
                      next[idx] = { ...next[idx], selfAdminister: e.target.checked };
                      updateStage6({ medications: next });
                    }}
                    label="Self-administered"
                    labelClassName="text-[14px] font-normal text-[#10141a]"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-[44px] w-[44px] shrink-0 border-[#cccccd]"
                  aria-label="Remove medication"
                  onClick={() =>
                    updateStage6({
                      medications: (stage6.medications ?? []).filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
            onClick={() =>
              updateStage6({
                medications: [
                  ...(stage6.medications ?? []),
                  {
                    name: "",
                    dosage: "",
                    frequency: "",
                    notes: "",
                    selfAdminister: false,
                  },
                ],
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add medication
          </Button>

          <div className="mt-6 flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Medication list (free text, if allowed)
            </label>
            <Input
              value={stage6.medicationList}
              onChange={(e) => updateStage6({ medicationList: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Optional short list or pharmacy notes"
            />
          </div>
        </div>

        <div className="mt-10">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">Emergency contacts</p>
          <p className="text-[13px] text-[#808081] mt-1 mb-3">
            Add everyone the ISP lists who should be contacted in an emergency (including the primary contact).
          </p>
          {(stage6.emergencyContacts ?? []).length === 0 ? (
            <p className="text-[14px] text-[#808081] mb-3">No emergency contacts yet.</p>
          ) : null}
          <div className="space-y-0">
            {(stage6.emergencyContacts ?? []).map((contact: Stage6EmergencyContact, idx: number) => (
              <div key={idx}>
                {idx !== 0 && (
                  <div className="mb-6 mt-6">
                    <div className="h-px w-full bg-[#cccccd]/60" />
                  </div>
                )}
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                    Emergency contact {idx + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 shrink-0 px-2 text-[#10141a] sm:self-auto"
                    onClick={() =>
                      patchEmergencyContacts((rows) => rows.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">Name</label>
                    <Input
                      value={contact.name ?? ""}
                      onChange={(e) => {
                        patchEmergencyContacts((rows) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], name: e.target.value };
                          return next;
                        });
                      }}
                      className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                      placeholder="Enter name"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">
                      Relationship to client
                    </label>
                    <Select
                      value={contact.relationship ?? "__unset__"}
                      onValueChange={(v) => {
                        patchEmergencyContacts((rows) => {
                          const next = [...rows];
                          next[idx] = {
                            ...next[idx],
                            relationship:
                              v === "__unset__" ? undefined : (v as EmergencyContactRelationship),
                          };
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger className="h-[44px] w-full rounded-[12px] border-[#cccccd] bg-white">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unset__">Not specified</SelectItem>
                        {EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">
                      Primary Phone number
                    </label>
                    <Input
                      value={contact.primaryPhone ?? ""}
                      onChange={(e) => {
                        patchEmergencyContacts((rows) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], primaryPhone: e.target.value };
                          return next;
                        });
                      }}
                      className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">
                      Secondary Phone number
                    </label>
                    <Input
                      value={contact.secondaryPhone ?? ""}
                      onChange={(e) => {
                        patchEmergencyContacts((rows) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], secondaryPhone: e.target.value };
                          return next;
                        });
                      }}
                      className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">
                      Hospital Preference
                    </label>
                    <Input
                      value={contact.hospitalPreference ?? ""}
                      onChange={(e) => {
                        patchEmergencyContacts((rows) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], hospitalPreference: e.target.value };
                          return next;
                        });
                      }}
                      className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                      placeholder=""
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">
                      Emergency Protocol
                    </label>
                    <Input
                      value={contact.emergencyProtocol ?? ""}
                      onChange={(e) => {
                        patchEmergencyContacts((rows) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], emergencyProtocol: e.target.value };
                          return next;
                        });
                      }}
                      className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
            onClick={() =>
              patchEmergencyContacts((rows) => [
                ...rows,
                {
                  name: "",
                  primaryPhone: "",
                  secondaryPhone: "",
                  hospitalPreference: "",
                  emergencyProtocol: "",
                },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add emergency contact
          </Button>
        </div>
      </div>

      {footer}
    </div>
  );
}
