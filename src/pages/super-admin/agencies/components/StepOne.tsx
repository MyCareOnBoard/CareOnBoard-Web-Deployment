import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import React, {useEffect, useRef} from "react";
import {cn} from "@/lib/utils";
import {useGooglePlacesAutocomplete} from "@/hooks/useGooglePlacesAutocomplete";

export default function Step1AgencyIdentity({formData, onChange, fieldsWithErrors}: any) {
    const addressInputRef = useRef<HTMLDivElement>(null);
    const {
        suggestions,
        isSearching,
        showSuggestions,
        setShowSuggestions,
        handleInputChange,
        selectSuggestion,
    } = useGooglePlacesAutocomplete();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setShowSuggestions]);

    const handleSelectAddressSuggestion = async (placeId: string) => {
        const details = await selectSuggestion(placeId);
        if (details) {
            const countyStateValue =
                details.county && details.state
                    ? `${details.county} / ${details.state}`
                    : details.county || details.state;
            onChange("primaryAddress", details.formattedAddress);
            onChange("county_or_state", countyStateValue);
            onChange("zipCode", details.zipCode);
        }
    };

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
                        className={cn(
                            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                            fieldsWithErrors.includes("agencyName") && "border-red-500"
                        )}
                    />
                    {fieldsWithErrors.includes("agencyName") && (
                        <p className="text-red-500 text-sm mt-1">
                            Agency name is required.
                        </p>
                    )}
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
                        <SelectTrigger className={cn(
                            "w-full h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                            fieldsWithErrors.includes("agencyType") && "border-red-500"
                        )}>
                            <SelectValue placeholder="Select agency type"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="provider">Provider Agency</SelectItem>
                            <SelectItem value="support_coordination">Support Coordination Agency</SelectItem>
                            <SelectItem value="others">Others</SelectItem>
                        </SelectContent>
                    </Select>
                    {fieldsWithErrors.includes("agencyType") && (
                        <p className="text-red-500 text-sm mt-1">
                            Agency type is required.
                        </p>
                    )}
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
                        className={cn(
                            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                            fieldsWithErrors.includes("ein") && "border-red-500"
                        )}
                    />
                    {fieldsWithErrors.includes("ein") && (
                        <p className="text-red-500 text-sm mt-1">
                            EIN is required.
                        </p>
                    )}
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
                        <div className="relative" ref={addressInputRef}>
                            <Input
                                id="primaryAddress"
                                value={formData.primaryAddress}
                                onChange={(e) => {
                                    onChange("primaryAddress", e.target.value);
                                    handleInputChange(e.target.value);
                                }}
                                onFocus={() => {
                                    if (suggestions.length > 0) {
                                        setShowSuggestions(true);
                                    }
                                }}
                                placeholder="Enter primary address"
                                className={cn(
                                    "h-[44px] rounded-[12px] border-[#cccccd] bg-white focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                    fieldsWithErrors.includes("primaryAddress") && "border-red-500"
                                )}
                            />
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                    {isSearching && (
                                        <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent" />
                                            Searching...
                                        </div>
                                    )}
                                    {!isSearching &&
                                        suggestions.map((suggestion) => (
                                            <div
                                                key={suggestion.placeId}
                                                onClick={() => handleSelectAddressSuggestion(suggestion.placeId)}
                                                className="px-4 py-3 text-sm text-[#10141a] hover:bg-[#f8f9fa] cursor-pointer border-b border-[#e5e5e6] last:border-b-0 transition-colors"
                                            >
                                                <span className="line-clamp-2">
                                                    {suggestion.description}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                        {fieldsWithErrors.includes("primaryAddress") && (
                            <p className="text-red-500 text-sm mt-1">
                                Primary address is required.
                            </p>
                        )}
                    </div>

                    {/* County / State */}
                    <div>
                        <Label htmlFor="county_or_state" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            County / State
                        </Label>
                        <Input
                            id="county_or_state"
                            value={formData.county_or_state}
                            onChange={(e) => onChange("county_or_state", e.target.value)}
                            placeholder="Enter County / State"
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                fieldsWithErrors.includes("county_or_state") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("county_or_state") && (
                            <p className="text-red-500 text-sm mt-1">
                                County/State is required.
                            </p>
                        )}
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
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                fieldsWithErrors.includes("zipCode") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("zipCode") && (
                            <p className="text-red-500 text-sm mt-1">
                                Zip code is required.
                            </p>
                        )}
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
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                fieldsWithErrors.includes("mainPhone") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("mainPhone") && (
                            <p className="text-red-500 text-sm mt-1">
                                Main phone number is required.
                            </p>
                        )}
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
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                fieldsWithErrors.includes("supportEmail") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("supportEmail") && (
                            <p className="text-red-500 text-sm mt-1">
                                Support email is required and must be valid.
                            </p>
                        )}
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
