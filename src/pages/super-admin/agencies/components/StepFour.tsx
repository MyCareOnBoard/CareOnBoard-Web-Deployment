import {Toggle} from "@/components/ui/toggle";
import {Label} from "@/components/ui/label";
import React from "react";


export default function Step6AISettings({formData, onChange, fieldsWithErrors}: any) {
    const ToggleSwitch = ({checked, onChange}: { checked: boolean; onChange: () => void }) => (
        <Toggle
            className={"h-8 w-14"}
            pressed={checked}
            onPressedChange={onChange}
        />
    );

    return (
        <div>
            <div className="space-y-6 grid grid-cols-3 gap-6">
                <div className="space-y-4">
                    {/* AI Notes Review */}
                    <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                        <Label className="text-[14px] font-medium text-[#10141a]">AI Notes Review</Label>
                        <ToggleSwitch
                            checked={formData.aiNotesReview}
                            onChange={() => onChange("aiNotesReview", !formData.aiNotesReview)}
                        />
                    </div>

                    {/* AI Plan of Care Builder */}
                    <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                        <Label className="text-[14px] font-medium text-[#10141a]">AI Plan of Care Builder</Label>
                        <ToggleSwitch
                            checked={formData.aiPlanOfCareBuilder}
                            onChange={() => onChange("aiPlanOfCareBuilder", !formData.aiPlanOfCareBuilder)}
                        />
                    </div>

                    {/* AI Schedule Optimizer */}
                    <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                        <Label className="text-[14px] font-medium text-[#10141a]">AI Schedule Optimizer</Label>
                        <ToggleSwitch
                            checked={formData.aiScheduleOptimizer}
                            onChange={() => onChange("aiScheduleOptimizer", !formData.aiScheduleOptimizer)}
                        />
                    </div>

                    {/* AI Data Cleaner & Compliance Alerts */}
                    <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                        <Label className="text-[14px] font-medium text-[#10141a]">
                            AI Data Cleaner & Compliance Alerts
                        </Label>
                        <ToggleSwitch
                            checked={formData.aiDataCleaner}
                            onChange={() => onChange("aiDataCleaner", !formData.aiDataCleaner)}
                        />
                    </div>

                    {/* AI Billing Validator */}
                    <div className="flex items-center justify-between py-3">
                        <Label className="text-[14px] font-medium text-[#10141a]">AI Billing Validator</Label>
                        <ToggleSwitch
                            checked={formData.aiBillingValidator}
                            onChange={() => onChange("aiBillingValidator", !formData.aiBillingValidator)}
                        />
                    </div>
                </div>
            </div>
            <div className={"mt-8"}>
                <div className="mt-2">
                    <p className="text-[16px] font-semibold text-[#10141a]">
                        7. Document Requirements
                    </p>
                    <p className="text-[14px] text-[#808081] mt-1">
                        What documents DSPs must upload before being cleared.
                    </p>
                </div>
                <div className="space-y-6 w-[70%]">
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* IDs */}
                            <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                                <Label className="text-[14px] font-medium text-[#10141a]">IDs</Label>
                                <ToggleSwitch
                                    checked={formData.requireIds}
                                    onChange={() => onChange("requireIds", !formData.requireIds)}
                                />
                            </div>

                            {/* Clearances */}
                            <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                                <Label className="text-[14px] font-medium text-[#10141a]">
                                    Clearances (background, drug test, fingerprint, etc.)
                                </Label>
                                <ToggleSwitch
                                    checked={formData.requireClearances}
                                    onChange={() => onChange("requireClearances", !formData.requireClearances)}
                                />
                            </div>

                            {/* SSN */}
                            <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                                <Label className="text-[14px] font-medium text-[#10141a]">SSN</Label>
                                <ToggleSwitch
                                    checked={formData.requireSsn}
                                    onChange={() => onChange("requireSsn", !formData.requireSsn)}
                                />
                            </div>

                            {/* Expiry rules */}
                            <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                                <Label className="text-[14px] font-medium text-[#10141a]">
                                    Expiry rules (e.g., training expires annually)
                                </Label>
                                <ToggleSwitch
                                    checked={formData.expiryRules}
                                    onChange={() => onChange("expiryRules", !formData.expiryRules)}
                                />
                            </div>

                            {/* Resume */}
                            <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                                <Label className="text-[14px] font-medium text-[#10141a]">Resume</Label>
                                <ToggleSwitch
                                    checked={formData.requireResume}
                                    onChange={() => onChange("requireResume", !formData.requireResume)}
                                />
                            </div>

                            {/* Auto-reminder settings */}
                            <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                                <Label className="text-[14px] font-medium text-[#10141a]">Auto-reminder settings</Label>
                                <ToggleSwitch
                                    checked={formData.autoReminders}
                                    onChange={() => onChange("autoReminders", !formData.autoReminders)}
                                />
                            </div>

                            {/* Certificates */}
                            <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                                <Label className="text-[14px] font-medium text-[#10141a]">Certificates</Label>
                                <ToggleSwitch
                                    checked={formData.requireCertificates}
                                    onChange={() => onChange("requireCertificates", !formData.requireCertificates)}
                                />
                            </div>

                            {/* Reminder frequency */}
                            <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
                                <Label className="text-[14px] font-medium text-[#10141a]">Reminder frequency</Label>
                                <ToggleSwitch
                                    checked={formData.reminderFrequency !== ""}
                                    onChange={() => onChange("reminderFrequency", formData.reminderFrequency ? "" : "monthly")}
                                />
                            </div>

                            {/* Trainings */}
                            <div className="flex items-center justify-between py-3">
                                <Label className="text-[14px] font-medium text-[#10141a]">Trainings</Label>
                                <ToggleSwitch
                                    checked={formData.requireTrainings}
                                    onChange={() => onChange("requireTrainings", !formData.requireTrainings)}
                                />
                            </div>

                            {/* Who receives them */}
                            <div className="flex items-center justify-between py-3">
                                <Label className="text-[14px] font-medium text-[#10141a]">Who receives them</Label>
                                <ToggleSwitch
                                    checked={formData.whoReceivesReminders !== ""}
                                    onChange={() => onChange("whoReceivesReminders", formData.whoReceivesReminders ? "" : "admin")}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
