import React, {useState} from "react";
import {useToast} from "@/hooks/use-toast";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Eye, EyeOff, RefreshCw, ChevronDown, Check, X} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

interface Step3LeadershipProps {
  formData: any;
  onChange: (key: any, value: any) => void;
  services: {name: string; code: string}[];
  fieldsWithErrors: string[];
}

export default function Step3Leadership({formData, onChange, services = [], fieldsWithErrors = []}: Step3LeadershipProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isServicesOpen, setIsServicesOpen] = useState(false);
    const {toast} = useToast();

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

    const toggleService = (serviceName: string) => {
        const currentServices = formData.services || [];
        const newServices = currentServices.includes(serviceName)
            ? currentServices.filter((s: string) => s !== serviceName)
            : [...currentServices, serviceName];
        onChange("services", newServices);
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
                <div className="space-y-6 mt-6">
                    <div className="flex flex-col gap-[4px] w-full max-w-[350px]">
                        <Label className="text-[14px] font-medium text-[#10141a]">
                            Select Services
                        </Label>
                        
                        <Popover open={isServicesOpen} onOpenChange={setIsServicesOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    className={cn(
                                        "flex items-center justify-between h-[44px] w-full rounded-[12px] border border-[#cccccd] bg-white px-[16px] hover:bg-[#fafafa] transition-colors",
                                        fieldsWithErrors.includes("services") && "border-red-500"
                                    )}
                                >
                                    <span className="text-[14px] font-normal text-[#525253]">
                                        {formData.services && formData.services.length > 0
                                            ? `${formData.services.length} selected`
                                            : "Select Services"}
                                    </span>
                                    <ChevronDown className="w-5 h-5 text-[#10141a]" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-[var(--radix-popover-trigger-width)] bg-white border border-[#cccccd] rounded-[12px] p-0 shadow-lg"
                                align="start"
                            >
                                <div className="flex flex-col max-h-[300px]">
                                    {/* Header */}
                                    <div className="px-[20px] pt-[12px] pb-0 shrink-0">
                                        <p className="text-[12px] font-medium leading-[normal] text-[#808081]">
                                            Select services
                                        </p>
                                    </div>

                                    {/* Options - Scrollable */}
                                    <div className="flex flex-col mt-[8px] overflow-y-auto">
                                        {services.map((service) => {
                                            const isSelected = formData.services?.includes(service.name) || false;
                                            return (
                                                <button
                                                    key={service.code}
                                                    onClick={() => toggleService(service.name)}
                                                    className={`flex items-center justify-between px-[20px] py-[12px] hover:bg-[#f5f5f5] transition-colors ${
                                                        isSelected ? "bg-[#e5effa]" : ""
                                                    }`}
                                                >
                                                    <span
                                                        className={`text-[14px] leading-[1.4] ${
                                                            isSelected
                                                                ? "font-semibold text-[#00b4b8]"
                                                                : "font-normal text-[#808081]"
                                                        }`}
                                                    >
                                                        {service.name}
                                                    </span>
                                                    {isSelected && (
                                                        <Check className="w-5 h-5 text-[#00b4b8]" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        {fieldsWithErrors.includes("services") && (
                            <p className="text-red-500 mt-1 text-[12px]">
                                Services are required.
                            </p>
                        )}

                    </div>
                    {/* Selected Services Badges */}
                    {formData.services && formData.services.length > 0 && (
                        <div className="flex flex-wrap gap-[8px] w-full">
                            {formData.services.map((serviceName: string) => (
                                <div
                                    key={serviceName}
                                    className="group flex items-center gap-[6px] px-[10px] py-[6px] rounded-[6px] bg-[#00b4b8] border-[0.5px] border-[#808081] hover:bg-[#00a0a3] transition-colors"
                                >
                                    <span className="text-[14px] font-medium leading-[1.4] text-white">
                                        {serviceName}
                                    </span>
                                    <button
                                        onClick={() => toggleService(serviceName)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-white/20 rounded-full p-0.5"
                                        aria-label={`Remove ${serviceName}`}
                                    >
                                        <X className="w-3.5 h-3.5 text-white" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}