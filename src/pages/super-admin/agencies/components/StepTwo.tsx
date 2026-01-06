import React, {useState} from "react";
import {useToast} from "@/hooks/use-toast";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Eye, EyeOff, RefreshCw} from "lucide-react";
import {MultiSelect, MultiSelectItem} from "@/components/ui/multi-select";

import { cn } from "@/lib/utils";

export default function Step3Leadership({formData, onChange, fieldsWithErrors = []}: any) {
    const [showPassword, setShowPassword] = useState(false);
    const {toast} = useToast();

    const services = [
        "Community Based Supports (CBS)",
        "Individual Supports (IS)",
        "Respite",
        "Community Inclusion",
        "Transportation",
        "Employment Services",
    ];

    const generatePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        onChange("userPassword", password);
        setShowPassword(true);
        toast({
            title: "Password Generated",
            description: "A secure password has been generated",
        });
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Name */}
                <div>
                    <Label htmlFor="userName" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        User Name
                    </Label>
                    <Input
                        id="userName"
                        value={formData.userName}
                        onChange={(e) => onChange("userName", e.target.value)}
                        placeholder="Enter user name"
                        className={cn(
                            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                            fieldsWithErrors.includes("userName") && "border-red-500"
                        )}
                    />
                    {fieldsWithErrors.includes("userName") && (
                        <p className="text-red-500 mt-1 text-[12px]">
                            User name is required.
                        </p>
                    )}
                </div>

                {/* Phone Number */}
                <div>
                    <Label htmlFor="userPhone" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Phone Number
                    </Label>
                    <Input
                        id="userPhone"
                        value={formData.userPhone}
                        onChange={(e) => onChange("userPhone", e.target.value)}
                        placeholder="Enter Phone Number"
                        className={cn(
                            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                            fieldsWithErrors.includes("userPhone") && "border-red-500"
                        )}
                    />
                    {fieldsWithErrors.includes("userPhone") && (
                        <p className="text-red-500 mt-1 text-[12px]">
                            Phone number is required.
                        </p>
                    )}
                </div>

                {/* Email Address */}
                <div>
                    <Label htmlFor="userEmail" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Email Address
                    </Label>
                    <Input
                        id="userEmail"
                        type="email"
                        value={formData.userEmail}
                        onChange={(e) => onChange("userEmail", e.target.value)}
                        placeholder="Enter email"
                        className={cn(
                            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                            fieldsWithErrors.includes("userEmail") && "border-red-500"
                        )}
                    />
                    {fieldsWithErrors.includes("userEmail") && (
                        <p className="text-red-500 mt-1 text-[12px]">
                            Email is required.
                        </p>
                    )}
                </div>

                {/* Generate Password */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="userPassword" className="text-[14px] font-medium text-[#10141a]">
                            Generate password
                        </Label>
                        <button
                            type="button"
                            onClick={generatePassword}
                            className="flex items-center gap-2 text-[#00b4b8] hover:text-[#009da1] transition-colors"
                        >
                            <RefreshCw className="w-4 h-4"/>
                        </button>
                    </div>
                    <div className="relative">
                        <Input
                            id="userPassword"
                            type={showPassword ? "text" : "password"}
                            value={formData.userPassword}
                            onChange={(e) => onChange("userPassword", e.target.value)}
                            placeholder="Generated password"
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8] pr-10",
                                fieldsWithErrors.includes("userPassword") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("userPassword") && (
                            <p className="text-red-500 text-sm mt-1">
                                Password is required.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#808081] hover:text-[#10141a]"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-8">
                <div className="mt-2">
                    <p className="text-[16px] font-semibold text-[#10141a]">
                        4. Service Configuration
                    </p>
                    <p className="text-[14px] text-[#808081] mt-1">
                        Used to auto-populate billing, scheduling, and EVV rules.
                    </p>
                </div>
                <div className="space-y-6 mt-6 grid grid-cols-3 gap-6">
                    <div>
                        <Label htmlFor="services" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Select Services
                        </Label>
                        <MultiSelect
                            value={formData.services}
                            onValueChange={(value) => onChange("services", value)}
                            placeholder="Select multiple services"
                            buttonClassName={cn(
                                fieldsWithErrors.includes("services") && "border-red-500"
                            )}
                        >
                            {services.map((service) => (
                                <MultiSelectItem key={service} value={service}>
                                    {service}
                                </MultiSelectItem>
                            ))}
                        </MultiSelect>
                        {fieldsWithErrors.includes("services") && (
                            <p className="text-red-500 mt-1 text-[12px]">
                                Services are required.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}