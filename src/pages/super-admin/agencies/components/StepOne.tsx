import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import React from "react";

export default function Step1AgencyIdentity({formData, onChange}: any) {
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Agency Name */}
                <div>
                    <Label htmlFor="agencyName" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Agency Name
                    </Label>
                    <Input
                        id="agencyName"
                        value={formData.agencyName}
                        onChange={(e) => onChange("agencyName", e.target.value)}
                        placeholder="Enter agency name"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>

                {/* Legal Business Name */}
                <div>
                    <Label htmlFor="legalBusinessName" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Legal Business Name (if different)
                    </Label>
                    <Input
                        id="legalBusinessName"
                        value={formData.legalBusinessName}
                        onChange={(e) => onChange("legalBusinessName", e.target.value)}
                        placeholder="Enter legal business name"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>

                {/* DBA */}
                <div>
                    <Label htmlFor="dba" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        DBA (Doing Business As)
                    </Label>
                    <Input
                        id="dba"
                        value={formData.dba}
                        onChange={(e) => onChange("dba", e.target.value)}
                        placeholder="Enter DBA"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>

                {/* Agency Type */}
                <div>
                    <Label htmlFor="agencyType" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Agency Type
                    </Label>
                    <Select
                        required
                        value={formData.agencyType}
                        onValueChange={(value) => onChange("agencyType", value)}
                    >
                        <SelectTrigger className={"w-full"}>
                            <SelectValue placeholder="Select agency type"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="provider">Provider Agency</SelectItem>
                            <SelectItem value="support_coordination">Support Coordination Agency</SelectItem>
                            <SelectItem value="others">Others</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Agency EIN */}
                <div>
                    <Label htmlFor="ein" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Agency EIN (Employer Identification Number)
                    </Label>
                    <Input
                        id="ein"
                        value={formData.ein}
                        onChange={(e) => onChange("ein", e.target.value)}
                        placeholder="Enter EIN"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>

                {/* NPI Number */}
                <div>
                    <Label htmlFor="npi" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        NPI Number (if applicable)
                    </Label>
                    <Input
                        id="npi"
                        value={formData.npi}
                        onChange={(e) => onChange("npi", e.target.value)}
                        placeholder="Enter NPI"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>

                {/* Medicaid/CDD Provider ID */}
                <div>
                    <Label htmlFor="medicaidProviderId" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Medicaid/CDD Provider ID
                    </Label>
                    <Input
                        id="medicaidProviderId"
                        value={formData.medicaidProviderId}
                        onChange={(e) => onChange("medicaidProviderId", e.target.value)}
                        placeholder="Enter DDD ID"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>
            </div>
            <div className={"mt-10"}>
                <div className="mt-2 mb-6">
                    <p className="text-[16px] font-semibold text-[#10141a]">
                        2. Contact Information
                    </p>
                    <p className="text-[14px] text-[#808081] mt-1">
                        Used for communication, verification, and notifications.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Primary Agency Address */}
                    <div>
                        <Label htmlFor="primaryAddress" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Primary Agency Address
                        </Label>
                        <Input
                            id="primaryAddress"
                            value={formData.primaryAddress}
                            onChange={(e) => onChange("primaryAddress", e.target.value)}
                            placeholder="Enter primary address"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* County / State */}
                    <div>
                        <Label htmlFor="county" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            County / State
                        </Label>
                        <Input
                            id="county"
                            value={formData.county}
                            onChange={(e) => onChange("county", e.target.value)}
                            placeholder="Enter County / State"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* Zip Code */}
                    <div>
                        <Label htmlFor="zipCode" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Zip Code
                        </Label>
                        <Input
                            id="zipCode"
                            value={formData.zipCode}
                            onChange={(e) => onChange("zipCode", e.target.value)}
                            placeholder="Enter Zip Code"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* Main Phone Number */}
                    <div>
                        <Label htmlFor="mainPhone" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Main Phone Number
                        </Label>
                        <Input
                            id="mainPhone"
                            value={formData.mainPhone}
                            onChange={(e) => onChange("mainPhone", e.target.value)}
                            placeholder="Enter Main Phone Number"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* Support/Office Email */}
                    <div>
                        <Label htmlFor="supportEmail" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Support/Office Email
                        </Label>
                        <Input
                            id="supportEmail"
                            type="email"
                            value={formData.supportEmail}
                            onChange={(e) => onChange("supportEmail", e.target.value)}
                            placeholder="Enter Support/Office Email"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* Website URL (optional) */}
                    <div>
                        <Label htmlFor="websiteUrl" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Website URL (optional)
                        </Label>
                        <Input
                            id="websiteUrl"
                            value={formData.websiteUrl}
                            onChange={(e) => onChange("websiteUrl", e.target.value)}
                            placeholder="Enter Website URL"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
