import {Label} from "@/components/ui/label";
import React from "react";
import { Input } from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {MultiSelect, MultiSelectItem} from "@/components/ui/multi-select";
import {cn} from "@/lib/utils"


export default function Step5Operational({formData, onChange, fieldsWithErrors}: any) {
    const allowedTypes = [
        {value: "pdf", label: "pdf"},
        {value: "jpg", label: "jpg"},
        {value: "png", label: "png"},
        {value: "all", label: "All of the above"},
    ]
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scheduling rules */}
            <div>
                <Label htmlFor="schedulingRules" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Scheduling rules
                </Label>
                <Input
                    id="schedulingRules"
                    value={formData.schedulingRules}
                    onChange={(e) => onChange("schedulingRules", e.target.value)}
                    placeholder="Enter scheduling rules"
                    className={cn(
                        "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                        fieldsWithErrors.includes("schedulingRules") && "border-red-500"
                    )}
                />
                {fieldsWithErrors.includes("schedulingRules") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Scheduling rules is required.
                    </p>
                )}
            </div>

            {/* Max shift per day */}
            <div>
                <Label htmlFor="maxShiftPerDay" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Max shift per day
                </Label>
                <Select
                    value={formData.maxShiftPerDay}
                    onValueChange={(value) => onChange("maxShiftPerDay", value)}
                >
                    <SelectTrigger className={cn(
                        "w-full",
                        fieldsWithErrors.includes("maxShiftPerDay") && "border-red-500"
                    )}>
                        <SelectValue placeholder="Select number of shift"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                    </SelectContent>
                </Select>
                {fieldsWithErrors.includes("maxShiftPerDay") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Max shift per day is required.
                    </p>
                )}
            </div>

            {/* Travel time rules */}
            <div>
                <Label htmlFor="travelTimeRules" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Travel time rules
                </Label>
                <Input
                    id="travelTimeRules"
                    value={formData.travelTimeRules}
                    onChange={(e) => onChange("travelTimeRules", e.target.value)}
                    placeholder="Enter Travel time rules"
                    className={cn(
                        "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                        fieldsWithErrors.includes("travelTimeRules") && "border-red-500"
                    )}
                />
                {fieldsWithErrors.includes("travelTimeRules") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Travel time rules is required.
                    </p>
                )}
            </div>

            {/* Mileage Settings */}
            <div>
                <Label htmlFor="mileageSettings" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Mileage Settings
                </Label>
                <Input
                    id="mileageSettings"
                    value={formData.mileageSettings}
                    onChange={(e) => onChange("mileageSettings", e.target.value)}
                    placeholder="Enter Mileage Settings"
                    className={cn(
                        "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                        fieldsWithErrors.includes("mileageSettings") && "border-red-500"
                    )}
                />
                {fieldsWithErrors.includes("mileageSettings") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Mileage settings is required.
                    </p>
                )}
            </div>

            {/* Mileage rate */}
            <div>
                <Label htmlFor="mileageRate" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Mileage rate
                </Label>
                <Input
                    id="mileageRate"
                    type="number"
                    step="0.01"
                    value={formData.mileageRate}
                    onChange={(e) => onChange("mileageRate", parseFloat(e.target.value))}
                    placeholder="Enter Mileage rate"
                    className={cn(
                        "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                        fieldsWithErrors.includes("mileageRate") && "border-red-500"
                    )}
                />
                {fieldsWithErrors.includes("mileageRate") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Mileage rate is required.
                    </p>
                )}
            </div>

            {/* Incident Reporting Settings */}
            <div>
                <Label htmlFor="incidentReportingSettings" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Incident Reporting Settings
                </Label>
                <Input
                    id="incidentReportingSettings"
                    value={formData.incidentReportingSettings}
                    onChange={(e) => onChange("incidentReportingSettings", e.target.value)}
                    placeholder="Enter Incident Reporting Settings"
                    className={cn(
                        "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                        fieldsWithErrors.includes("incidentReportingSettings") && "border-red-500"
                    )}
                />
                {fieldsWithErrors.includes("incidentReportingSettings") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Incident reporting settings are required.
                    </p>
                )}
            </div>

            {/* Who receives notifications */}
            <div>
                <Label htmlFor="whoReceivesNotifications" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Who receives notifications
                </Label>
                <Select
                    value={formData.whoReceivesNotifications}
                    onValueChange={(value) => onChange("whoReceivesNotifications", value)}
                >
                    <SelectTrigger className={cn(
                        "w-full",
                        fieldsWithErrors.includes("whoReceivesNotifications") && "border-red-500"
                    )}>
                        <SelectValue placeholder="Select role"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                </Select>
                {fieldsWithErrors.includes("whoReceivesNotifications") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Who receives notifications are required.
                    </p>
                )}
            </div>

            {/* Expense Report Settings */}
            <div>
                <Label htmlFor="expenseReportSettings" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Expense Report Settings
                </Label>
                <Input
                    id="expenseReportSettings"
                    value={formData.expenseReportSettings}
                    onChange={(e) => onChange("expenseReportSettings", e.target.value)}
                    placeholder="Enter Expense Report Settings"
                    className={cn(
                        "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                        fieldsWithErrors.includes("expenseReportSettings") && "border-red-500"
                    )}
                />
                {fieldsWithErrors.includes("expenseReportSettings") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Expense report settings are required.
                    </p>
                )}
            </div>

            {/* Allowed file types */}
            <div>
                <Label htmlFor="allowedFileTypes" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Allowed file types
                </Label>
                <MultiSelect
                    value={formData.allowedFileTypes}
                    onValueChange={(value) => onChange("allowedFileTypes", value)}
                    placeholder={"Select file types"}
                    buttonClassName={cn(
                        fieldsWithErrors.includes("allowedFileTypes") && "border-red-500"
                    )}
                >
                    {allowedTypes.map((type) => (
                        <MultiSelectItem key={type.value} value={type.value}>
                            {type.label}
                        </MultiSelectItem>
                    ))}
                </MultiSelect>
                {fieldsWithErrors.includes("allowedFileTypes") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        At least one file type must be selected.
                    </p>
                )}
            </div>

            {/* Allow recurring schedules? */}
            <div className="md:col-span-2">
                <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
                    Allow recurring schedules?
                </Label>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="allowRecurringSchedules"
                            checked={formData.allowRecurringSchedules === true}
                            onChange={() => onChange("allowRecurringSchedules", true)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="allowRecurringSchedules"
                            checked={formData.allowRecurringSchedules === false}
                            onChange={() => onChange("allowRecurringSchedules", false)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">No</span>
                    </label>
                </div>
            </div>

            {/* Allow overlapping visits? */}
            <div className="md:col-span-2">
                <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
                    Allow overlapping visits?
                </Label>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="allowOverlappingVisits"
                            checked={formData.allowOverlappingVisits === true}
                            onChange={() => onChange("allowOverlappingVisits", true)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="allowOverlappingVisits"
                            checked={formData.allowOverlappingVisits === false}
                            onChange={() => onChange("allowOverlappingVisits", false)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">No</span>
                    </label>
                </div>
            </div>

            {/* Do they offer mileage reimbursements? */}
            <div className="md:col-span-2">
                <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
                    Do they offer mileage reimbursements?
                </Label>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="offerMileageReimbursements"
                            checked={formData.offerMileageReimbursements === true}
                            onChange={() => onChange("offerMileageReimbursements", true)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="offerMileageReimbursements"
                            checked={formData.offerMileageReimbursements === false}
                            onChange={() => onChange("offerMileageReimbursements", false)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">No</span>
                    </label>
                </div>
            </div>

            {/* Real-time GPS tracking */}
            <div className="md:col-span-2">
                <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
                    Real-time GPS tracking
                </Label>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="realtimeGpsTracking"
                            checked={formData.realtimeGpsTracking === true}
                            onChange={() => onChange("realtimeGpsTracking", true)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">Enable</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="realtimeGpsTracking"
                            checked={formData.realtimeGpsTracking === false}
                            onChange={() => onChange("realtimeGpsTracking", false)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">Disable</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
