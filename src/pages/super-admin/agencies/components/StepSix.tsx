import {Label} from "@/components/ui/label";
import React from "react";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils"
// import YesNoRadio from "@/components/ui/yesNoRadioInput";


export default function Step9Billing({formData, onChange, fieldsWithErrors}: any) {
    return (
        <div className="space-y-6">
            {/* Billing Format, DDD format, HHA eXchange Format */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <Label htmlFor="billingFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Preferred Billing Agency
                    </Label>
                    <Input
                        id="billingFormat"
                        value={formData.billingFormat}
                        onChange={(e) => onChange("billingFormat", e.target.value)}
                        placeholder="Enter preferred billing agency"
                        className={cn(
                            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                            fieldsWithErrors.includes("billingFormat") && "border-red-500"
                        )}
                    />
                    {fieldsWithErrors.includes("billingFormat") && (
                        <p className="text-red-500 mt-1 text-[12px]">
                            Preferred Billing Agency is required.
                        </p>
                    )}
                </div>

                {/*<div>*/}
                {/*    <Label htmlFor="dddFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">*/}
                {/*        DDD format*/}
                {/*    </Label>*/}
                {/*    <Input*/}
                {/*        id="dddFormat"*/}
                {/*        value={formData.dddFormat}*/}
                {/*        onChange={(e) => onChange("dddFormat", e.target.value)}*/}
                {/*        placeholder="Enter DDD format"*/}
                {/*        className={cn(*/}
                {/*            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",*/}
                {/*            fieldsWithErrors.includes("dddFormat") && "border-red-500"*/}
                {/*        )}*/}
                {/*    />*/}
                {/*    {fieldsWithErrors.includes("dddFormat") && (*/}
                {/*        <p className="text-red-500 mt-1 text-[12px]">*/}
                {/*            DDD format is required.*/}
                {/*        </p>*/}
                {/*    )}*/}
                {/*</div>*/}

                {/*<div>*/}
                {/*    <Label htmlFor="hhaExchangeFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">*/}
                {/*        HHA eXchange Format*/}
                {/*    </Label>*/}
                {/*    <Input*/}
                {/*        id="hhaExchangeFormat"*/}
                {/*        value={formData.hhaExchangeFormat}*/}
                {/*        onChange={(e) => onChange("hhaExchangeFormat", e.target.value)}*/}
                {/*        placeholder="Enter HHA eXchange format"*/}
                {/*        className={cn(*/}
                {/*            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",*/}
                {/*            fieldsWithErrors.includes("hhaExchangeFormat") && "border-red-500"*/}
                {/*        )}*/}
                {/*    />*/}
                {/*    {fieldsWithErrors.includes("hhaExchangeFormat") && (*/}
                {/*        <p className="text-red-500 mt-1 text-[12px]">*/}
                {/*            HHA eXchange format is required.*/}
                {/*        </p>*/}
                {/*    )}*/}
                {/*</div>*/}
            </div>

            {/* Allow custom report? */}
            {/*<div>*/}
            {/*    <YesNoRadio*/}
            {/*        label="Allow custom report?"*/}
            {/*        value={formData.allowCustomReport ? "yes" : "no"}*/}
            {/*        onChange={(v) => onChange("allowCustomReport", v === "yes")}*/}
            {/*    />*/}
            {/*</div>*/}

            {/* Invoice Contact */}
            <div>
                <h3 className="text-[16px] font-semibold text-[#10141a] mb-4">Invoice Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Name */}
                    <div>
                        <Label htmlFor="invoiceName" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Name of Agency Contact Person
                        </Label>
                        <Input
                            id="invoiceName"
                            value={formData.invoiceName}
                            onChange={(e) => onChange("invoiceName", e.target.value)}
                            placeholder="Enter name"
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                fieldsWithErrors.includes("invoiceName") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("invoiceName") && (
                            <p className="text-red-500 mt-1 text-[12px]">
                                Name of agency contact person is required.
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <Label htmlFor="invoiceEmail" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Email
                        </Label>
                        <Input
                            id="invoiceEmail"
                            type="email"
                            value={formData.invoiceEmail}
                            onChange={(e) => onChange("invoiceEmail", e.target.value)}
                            placeholder="Enter email"
                            className={cn(
                                "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                                fieldsWithErrors.includes("invoiceEmail") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("invoiceEmail") && (
                            <p className="text-red-500 mt-1 text-[12px]">
                                Invoice email is required.
                            </p>
                        )}
                    </div>

                    {/* Fax */}
                    {/*<div>*/}
                    {/*    <Label htmlFor="invoiceFax" className="mb-2 text-[14px] font-medium text-[#10141a]">*/}
                    {/*        Fax (some still use fax)*/}
                    {/*    </Label>*/}
                    {/*    <Input*/}
                    {/*        id="invoiceFax"*/}
                    {/*        value={formData.invoiceFax}*/}
                    {/*        onChange={(e) => onChange("invoiceFax", e.target.value)}*/}
                    {/*        placeholder="Enter fax"*/}
                    {/*        className={cn(*/}
                    {/*            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",*/}
                    {/*            fieldsWithErrors.includes("invoiceFax") && "border-red-500"*/}
                    {/*        )}*/}
                    {/*    />*/}
                    {/*</div>*/}

                    {/* Payroll System Integration */}
                    {/*<div>*/}
                    {/*    <Label htmlFor="payrollSystemIntegration"*/}
                    {/*           className="mb-2 text-[14px] font-medium text-[#10141a]">*/}
                    {/*        Payroll System Integration (optional)*/}
                    {/*    </Label>*/}
                    {/*    <Input*/}
                    {/*        id="payrollSystemIntegration"*/}
                    {/*        value={formData.payrollSystemIntegration}*/}
                    {/*        onChange={(e) => onChange("payrollSystemIntegration", e.target.value)}*/}
                    {/*        placeholder="Enter Payroll System Integration"*/}
                    {/*        className={cn(*/}
                    {/*            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",*/}
                    {/*            fieldsWithErrors.includes("payrollSystemIntegration") && "border-red-500"*/}
                    {/*        )}*/}
                    {/*    />*/}
                    {/*    {fieldsWithErrors.includes("payrollSystemIntegration") && (*/}
                    {/*        <p className="text-red-500 mt-1 text-[12px]">*/}
                    {/*            Payroll System Integration is required.*/}
                    {/*        </p>*/}
                    {/*    )}*/}
                    {/*</div>*/}

                    {/* Quick Books */}
                    {/*<div>*/}
                    {/*    <Label htmlFor="quickBooks" className="mb-2 text-[14px] font-medium text-[#10141a]">*/}
                    {/*        Quick Books*/}
                    {/*    </Label>*/}
                    {/*    <Input*/}
                    {/*        id="quickBooks"*/}
                    {/*        value={formData.quickBooks}*/}
                    {/*        onChange={(e) => onChange("quickBooks", e.target.value)}*/}
                    {/*        placeholder="Enter QuickBooks"*/}
                    {/*        className={cn(*/}
                    {/*            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",*/}
                    {/*            fieldsWithErrors.includes("quickBooks") && "border-red-500"*/}
                    {/*        )}*/}
                    {/*    />*/}
                    {/*    {fieldsWithErrors.includes("quickBooks") && (*/}
                    {/*        <p className="text-red-500 mt-1 text-[12px]">*/}
                    {/*            QuickBooks is required.*/}
                    {/*        </p>*/}
                    {/*    )}*/}
                    {/*</div>*/}

                    {/* ADP */}
                    {/*<div>*/}
                    {/*    <Label htmlFor="adp" className="mb-2 text-[14px] font-medium text-[#10141a]">*/}
                    {/*        ADP*/}
                    {/*    </Label>*/}
                    {/*    <Input*/}
                    {/*        id="adp"*/}
                    {/*        value={formData.adp}*/}
                    {/*        onChange={(e) => onChange("adp", e.target.value)}*/}
                    {/*        placeholder="Enter ADP"*/}
                    {/*        className={cn(*/}
                    {/*            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",*/}
                    {/*            fieldsWithErrors.includes("adp") && "border-red-500"*/}
                    {/*        )}*/}
                    {/*    />*/}
                    {/*    {fieldsWithErrors.includes("adp") && (*/}
                    {/*        <p className="text-red-500 mt-1 text-[12px]">*/}
                    {/*            ADP is required.*/}
                    {/*        </p>*/}
                    {/*    )}*/}
                    {/*</div>*/}

                    {/* Paycheck */}
                    {/*<div>*/}
                    {/*    <Label htmlFor="paycheck" className="mb-2 text-[14px] font-medium text-[#10141a]">*/}
                    {/*        Paycheck*/}
                    {/*    </Label>*/}
                    {/*    <Input*/}
                    {/*        id="paycheck"*/}
                    {/*        value={formData.paycheck}*/}
                    {/*        onChange={(e) => onChange("paycheck", e.target.value)}*/}
                    {/*        placeholder="Enter paycheck"*/}
                    {/*        className={cn(*/}
                    {/*            "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",*/}
                    {/*            fieldsWithErrors.includes("paycheck") && "border-red-500"*/}
                    {/*        )}*/}
                    {/*    />*/}
                    {/*    {fieldsWithErrors.includes("paycheck") && (*/}
                    {/*        <p className="text-red-500 mt-1 text-[12px]">*/}
                    {/*            Paycheck is required.*/}
                    {/*        </p>*/}
                    {/*    )}*/}
                    {/*</div>*/}
                </div>
            </div>
        </div>
    );
}
