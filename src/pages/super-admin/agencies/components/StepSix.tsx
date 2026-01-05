import {Label} from "@/components/ui/label";
import React from "react";
import {Input} from "@/components/ui/input";


export default function Step9Billing({formData, onChange}: any) {
    return (
        <div className="space-y-6">
            {/* Billing Format, DDD format, HHA eXchange Format */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <Label htmlFor="billingFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        Billing Format
                    </Label>
                    <Input
                        id="billingFormat"
                        value={formData.billingFormat}
                        onChange={(e) => onChange("billingFormat", e.target.value)}
                        placeholder="Enter Billing Format"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>

                <div>
                    <Label htmlFor="dddFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        DDD format
                    </Label>
                    <Input
                        id="dddFormat"
                        value={formData.dddFormat}
                        onChange={(e) => onChange("dddFormat", e.target.value)}
                        placeholder="Enter DDD format"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>

                <div>
                    <Label htmlFor="hhaExchangeFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">
                        HHA eXchange Format
                    </Label>
                    <Input
                        id="hhaExchangeFormat"
                        value={formData.hhaExchangeFormat}
                        onChange={(e) => onChange("hhaExchangeFormat", e.target.value)}
                        placeholder="Enter HHA eXchange format"
                        className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                </div>
            </div>

            {/* Allow custom report? */}
            <div>
                <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
                    Allow custom report?
                </Label>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="allowCustomReport"
                            checked={formData.allowCustomReport === true}
                            onChange={() => onChange("allowCustomReport", true)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="allowCustomReport"
                            checked={formData.allowCustomReport === false}
                            onChange={() => onChange("allowCustomReport", false)}
                            className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
                        />
                        <span className="text-[14px] text-[#10141a]">No</span>
                    </label>
                </div>
            </div>

            {/* Invoice Contact */}
            <div>
                <h3 className="text-[16px] font-semibold text-[#10141a] mb-4">Invoice Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Name */}
                    <div>
                        <Label htmlFor="invoiceName" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Name
                        </Label>
                        <Input
                            id="invoiceName"
                            value={formData.invoiceName}
                            onChange={(e) => onChange("invoiceName", e.target.value)}
                            placeholder="Enter name"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
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
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* Fax */}
                    <div>
                        <Label htmlFor="invoiceFax" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Fax (some still use fax)
                        </Label>
                        <Input
                            id="invoiceFax"
                            value={formData.invoiceFax}
                            onChange={(e) => onChange("invoiceFax", e.target.value)}
                            placeholder="Enter fax"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* Payroll System Integration */}
                    <div>
                        <Label htmlFor="payrollSystemIntegration"
                               className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Payroll System Integration (optional)
                        </Label>
                        <Input
                            id="payrollSystemIntegration"
                            value={formData.payrollSystemIntegration}
                            onChange={(e) => onChange("payrollSystemIntegration", e.target.value)}
                            placeholder="Enter Payroll System Integration"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* Quick Books */}
                    <div>
                        <Label htmlFor="quickBooks" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Quick Books
                        </Label>
                        <Input
                            id="quickBooks"
                            value={formData.quickBooks}
                            onChange={(e) => onChange("quickBooks", e.target.value)}
                            placeholder="Enter QuickBooks"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* ADP */}
                    <div>
                        <Label htmlFor="adp" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            ADP
                        </Label>
                        <Input
                            id="adp"
                            value={formData.adp}
                            onChange={(e) => onChange("adp", e.target.value)}
                            placeholder="Enter ADP"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>

                    {/* Paycheck */}
                    <div>
                        <Label htmlFor="paycheck" className="mb-2 text-[14px] font-medium text-[#10141a]">
                            Paycheck
                        </Label>
                        <Input
                            id="paycheck"
                            value={formData.paycheck}
                            onChange={(e) => onChange("paycheck", e.target.value)}
                            placeholder="Enter paycheck"
                            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
