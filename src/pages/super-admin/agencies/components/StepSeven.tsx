import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import React from "react";
import {Toggle} from "@/components/ui/toggle";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils"
import CustomDatePicker from "@/components/ui/datePicker";


export default function Step10Subscription({formData, onChange, fieldsWithErrors}: any) {
    const tiers = [
        {id: "basic", label: "Basic (50DSPs)"},
        {id: "professional", label: "Professional (90DSPs)"},
        {id: "enterprise", label: "Enterprise (Unlimited)"},
    ];

    const addOns = ["All features", "EVV", "Payroll sync"];

    const toggleAddOn = (addOn: string) => {
        const currentAddOns = formData.addOns || [];
        if (currentAddOns.includes(addOn)) {
            onChange("addOns", currentAddOns.filter((a: string) => a !== addOn));
        } else {
            onChange("addOns", [...currentAddOns, addOn]);
        }
    };

    const ToggleSwitch = ({checked, onChange}: { checked: boolean; onChange: () => void }) => (
        <Toggle
            className={"h-8 w-14"}
            pressed={checked}
            onPressedChange={onChange}
        />
    );

    return (
        <div>
            <div className="space-y-6">
                {/* Subscription Tier */}
                <div>
                    <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
                        Subscription Tier
                    </Label>
                    <div className="flex items-center gap-3">
                        {tiers.map((tier) => (
                            <button
                                key={tier.id}
                                type="button"
                                onClick={() => onChange("subscriptionTier", tier.id)}
                                className={`px-6 py-2 rounded text-[14px] font-medium transition-colors ${
                                    formData.subscriptionTier === tier.id
                                        ? "bg-[#00b4b8] text-white"
                                        : "bg-transparent border border-[#808081] text-[#10141a] hover:bg-[#d0d0d0]"
                                }`}
                            >
                                {tier.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={"flex space-x-6 max-w-[50%]"}>
                    <div>
                        <Label htmlFor="planStartDate" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Plan start date
                        </Label>
                        <CustomDatePicker
                            date={formData.planStartDate}
                            setDate={(e) => onChange("planStartDate", e)}
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                fieldsWithErrors.includes("planStartDate") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("planStartDate") && (
                            <p className="text-red-500 text-sm mt-1">
                                Plan start date is required.
                            </p>
                        )}
                    </div>
                    {formData.subscriptionTier !== "basic" && <div>
                        <Label htmlFor="planEndDate" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Plan End Date
                        </Label>
                        <CustomDatePicker
                            date={formData.planEndDate}
                            setDate={(e) => onChange("planEndDate", e?.toISOString()?.slice(0,10))}
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                fieldsWithErrors.includes("planEndDate") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("planEndDate") && (
                            <p className="text-red-500 text-sm mt-1">
                                Plan end date is required.
                            </p>
                        )}
                    </div>}
                </div>

                {/* Select Add-ons */}
                <div>
                    <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">Select Add-ons</Label>
                    <div className="flex items-center gap-3">
                        {addOns.map((addOn) => (
                            <button
                                key={addOn}
                                type="button"
                                onClick={() => toggleAddOn(addOn)}
                                className={`px-6 py-2 rounded text-[14px] font-medium transition-colors ${
                                    (formData.addOns || []).includes(addOn)
                                        ? "bg-[#00b4b8] text-white"
                                        : "bg-transparent border border-[#808081] text-[#10141a] hover:bg-[#d0d0d0]"
                                }`}
                            >
                                {addOn}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className={"mt-10"}>
                <div className="mt-2">
                    <p className="text-[16px] font-semibold text-[#10141a]">
                        11. Security & Compliance Settings
                    </p>
                    <p className="text-[14px] text-[#808081] mt-1">
                        Define user management and access levels.
                    </p>
                </div>
                <div className="space-y-6">
                    {/* Permission Templates */}
                    <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6] max-w-sm">
                        <Label className="text-[14px] font-medium text-[#10141a]">Permission Templates</Label>
                        <ToggleSwitch
                            checked={formData.permissionTemplates}
                            onChange={() => onChange("permissionTemplates", !formData.permissionTemplates)}
                        />
                    </div>

                    <div className={"flex space-x-10 max-w-4xl"}>
                        {/* Audit retention period */}
                        <div className={"w-full"}>
                            <Label htmlFor="auditRetentionPeriod"
                                   className="mb-2 text-[14px] font-medium text-[#10141a]">
                                Audit retention period
                            </Label>
                            <Select
                                value={formData.auditRetentionPeriod}
                                onValueChange={(value) => onChange("auditRetentionPeriod", value)}
                            >
                                <SelectTrigger
                                    className={cn("w-full", fieldsWithErrors.includes("auditRetentionPeriod") && "border-red-500")}
                                >
                                    <SelectValue placeholder="Select time"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={"monthly"}>Monthly</SelectItem>
                                    <SelectItem value={"yearly"}>Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                            {fieldsWithErrors.includes("auditRetentionPeriod") && (
                                <p className="text-red-500 mt-1 text-[12px]">
                                    Please select an audit retention period.
                                </p>
                            )}
                        </div>
                        {/* Audit retention period */}
                        <div className={"w-full"}>
                            <Label htmlFor="auditRetentionPeriodNumber"
                                   className="mb-2 text-[14px] font-medium text-[#10141a]">
                                Audit retention period Number
                            </Label>
                            <Input
                                id="auditRetentionPeriodNumber"
                                type="number"
                                value={formData.auditRetentionPeriodNumber}
                                onChange={(e) => onChange("auditRetentionPeriodNumber", e.target.value)}
                                placeholder="Enter retention period number"
                                className={cn(
                                    "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                    fieldsWithErrors.includes("auditRetentionPeriodNumber") && "border-red-500"
                                )}
                            />
                            {fieldsWithErrors.includes("auditRetentionPeriodNumber") && (
                                <p className="text-red-500 mt-1 text-[12px]">
                                    Please enter an audit retention period number.
                                </p>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
