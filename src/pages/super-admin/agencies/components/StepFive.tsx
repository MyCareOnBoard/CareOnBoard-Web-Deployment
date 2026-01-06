import React, {useEffect, useState} from "react";
import {Label} from "@/components/ui/label";
import {Upload} from "lucide-react";
import {cn} from "@/lib/utils"


export default function Step8Branding(
    {formData, onChange, fieldsWithErrors, imagesPreview}: any
) {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);

    const predefinedColors = [
        "#D53411",
        "#D5B111",
        "#0EAF52",
        "#115CD5",
        "#11CBD5",
    ];

    const handleFileUpload = (field: "logo" | "letterhead", file: File | null) => {
        onChange(field, file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === "logo") {
                    setLogoPreview(reader.result as string);
                } else {
                    setLetterheadPreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        } else {
            if (field === "logo") {
                setLogoPreview(null);
            } else {
                setLetterheadPreview(null);
            }
        }
    };

    useEffect(() => {
        if (imagesPreview) {
            setLogoPreview(imagesPreview.logo);
            setLetterheadPreview(imagesPreview.letterHead);
        }
    }, [imagesPreview]);

    return (
        <div className="space-y-6 w-[50%]">
            {/* Upload Logo */}
            <div>
                <Label className="mb-2 text-[14px] font-medium text-[#10141a] block">Upload Logo</Label>
                <div
                    className={cn(
                        "border-2 bg-white border-[#e5e5e6] rounded-[12px] h-[71px] flex items-center justify-center hover:border-[#00b4b8] transition-colors cursor-pointer",
                        fieldsWithErrors.includes("logo") && "border-red-500"
                    )}>
                    <label htmlFor="logo-upload" className="flex items-center gap-2 cursor-pointer">
                        <Upload className="w-5 h-5 text-[#808081]"/>
                        <span className="text-[14px] text-[#808081]">
              {logoPreview ? "Change logo" : "Upload logo here"}
            </span>
                        <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload("logo", e.target.files?.[0] || null)}
                            className="hidden"
                        />
                    </label>
                </div>
                {logoPreview && (
                    <div className="mt-3">
                        <img src={logoPreview} alt="Logo preview" className="h-16 object-contain"/>
                    </div>
                )}
                {fieldsWithErrors.includes("logo") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Logo is required.
                    </p>
                )}
            </div>

            {/* Theme */}
            <div>
                <Label className="mb-2 text-[14px] font-medium text-[#10141a] block">Theme</Label>
                <div className="flex items-center gap-3">
                    {predefinedColors.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onChange("themeColor", color)}
                            className={`w-6 h-6 rounded-full transition-all ${
                                formData.themeColor === color ? "ring-2 ring-offset-2 ring-[#00b4b8]" : ""
                            }`}
                            style={{backgroundColor: color}}
                        />
                    ))}
                    <div className="flex items-center gap-2 ml-2">
                        <span className="text-[14px] text-[#808081]">Custom</span>
                        <div>
                            <input
                                type="color"
                                value={formData.themeColor}
                                onChange={(e) => onChange("themeColor", e.target.value)}
                                className="w-6 h-6 rounded-full cursor-pointer"
                            />
                        </div>
                        <input
                            type="text"
                            value={formData.themeColor}
                            onChange={(e) => onChange("themeColor", e.target.value)}
                            placeholder="#000000"
                            className={cn(
                                "text-[14px] font-mono text-[#10141a] bg-white py-1 px-4 border border-[#e5e5e6] rounded focus:border-[#00b4b8] focus:ring-1 focus:ring-[#00b4b8] outline-none w-28",
                                fieldsWithErrors.includes("themeColor") && "border-red-500"
                            )}
                        />
                        {fieldsWithErrors.includes("themeColor") && (
                            <p className="text-red-500 mt-1 text-[12px]">
                                Theme color is required.
                            </p>
                        )}
                    </div>
                </div>
                <p className="text-[14px] text-[#808081] mt-2">Choose preferred theme for the app.</p>
            </div>

            {/* Letterhead / Footer for Reports */}
            <div>
                <Label className="mb-2 text-[14px] font-medium text-[#10141a] block">
                    Letterhead / Footer for Reports
                </Label>
                <div
                    className={cn(
                        "border-2 bg-white border-[#e5e5e6] rounded-[12px] h-[71px] flex items-center justify-center hover:border-[#00b4b8] transition-colors cursor-pointer",
                        fieldsWithErrors.includes("letterhead") && "border-red-500"
                    )}
                >
                    <label htmlFor="letterhead-upload" className="flex items-center gap-2 cursor-pointer">
                        <Upload className="w-5 h-5 text-[#808081]"/>
                        <span className="text-[14px] text-[#808081]">
              {letterheadPreview ? "Change letterhead" : "Upload here"}
            </span>
                        <input
                            id="letterhead-upload"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload("letterhead", e.target.files?.[0] || null)}
                            className="hidden"
                        />
                    </label>
                </div>
                {letterheadPreview && (
                    <div className="mt-3">
                        <img src={letterheadPreview} alt="Letterhead preview" className="h-16 object-contain"/>
                    </div>
                )}
                {fieldsWithErrors.includes("letterhead") && (
                    <p className="text-red-500 mt-1 text-[12px]">
                        Letterhead is required.
                    </p>
                )}
            </div>
        </div>
    );
}