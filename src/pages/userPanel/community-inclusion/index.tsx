import React, { useState, useEffect } from "react";
import { Clock, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import TimePicker from "@/components/TimePicker";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { createCommunityInclusion, type Attendee } from "@/lib/api/community-inclusions";

interface AttendanceRow {
    id: string;
    name: string;
    signIn: string;
    signOut: string;
}

export default function UserCommunityInclusionPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([
        { id: "1", name: "", signIn: "", signOut: "" },
        { id: "2", name: "", signIn: "", signOut: "" },
        { id: "3", name: "", signIn: "", signOut: "" },
        { id: "4", name: "", signIn: "", signOut: "" },
        { id: "5", name: "", signIn: "", signOut: "" },
    ]);

    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (
        id: string,
        field: keyof AttendanceRow,
        value: string
    ) => {
        setAttendanceRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
        );
    };

    const validateForm = () => {
        const validAttendees = attendanceRows.filter(
            (row) => row.name.trim() && row.signIn && row.signOut
        );

        if (validAttendees.length === 0) {
            toast({
                title: "Validation Error",
                description: "Please add at least one attendee with complete information.",
                variant: "destructive",
            });
            return null;
        }
        return validAttendees;
    };

    const handleSave = async () => {
        const validAttendees = validateForm();
        if (!validAttendees) return;

        setIsSaving(true);
        try {
            const attendees: Attendee[] = validAttendees.map((row) => ({
                id: row.id,
                name: row.name,
                signIn: row.signIn,
                signOut: row.signOut,
            }));

            await createCommunityInclusion({
                attendees,
            });

            toast({
                title: "Saved Successfully",
                description: "Community inclusion attendees saved successfully!",
            });

            // Clear form? Or keep it? Usually clear or just show success.
            // Based on typical flow, we might want to clear or update the view.
            // For now, I'll reset to empty rows.
            setAttendanceRows([
                { id: "1", name: "", signIn: "", signOut: "" },
                { id: "2", name: "", signIn: "", signOut: "" },
                { id: "3", name: "", signIn: "", signOut: "" },
                { id: "4", name: "", signIn: "", signOut: "" },
                { id: "5", name: "", signIn: "", signOut: "" },
            ]);

        } catch (error: any) {
            console.error("Failed to save community inclusion:", error);
            toast({
                title: "Save Failed",
                description: error?.response?.data?.message || "Failed to save community inclusion.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddAttendee = () => {
        // Generate simple unique ID
        const newId = (Math.max(...attendanceRows.map(r => parseInt(r.id) || 0), 0) + 1).toString();
        setAttendanceRows((prev) => [
            ...prev,
            { id: newId, name: "", signIn: "", signOut: "" },
        ]);
    };

    const formatTimeDisplay = (time24h: string): string => {
        if (!time24h) return "";
        try {
            const [hoursStr, minutes] = time24h.split(":");
            let hours = parseInt(hoursStr);
            const period = hours >= 12 ? "PM" : "AM";

            if (hours === 0) hours = 12;
            else if (hours > 12) hours -= 12;

            return `${hours.toString().padStart(2, "0")}:${minutes} ${period}`;
        } catch {
            return time24h;
        }
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-[24px] sm:text-[32px] font-semibold text-[#10141a]">
                    Community Inclusion
                </h1>
            </div>

            {/* Card */}
            <div className="bg-[#f8f9fa] rounded-[30px] p-6 sm:p-8">
                <div className="mb-6">
                    <h2 className="text-[20px] font-medium text-[#10141a]">Attendance Sheet</h2>
                    <p className="text-[14px] text-[#808081] mt-1">List Of Attendances</p>
                </div>

                {/* Form Rows */}
                <div className="space-y-6">
                    {attendanceRows.map((row, index) => (
                        <div key={row.id}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-end">
                            <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-1">
                                <label className="text-[14px] text-[#10141a]">Name</label>
                                <Input
                                    value={row.name}
                                    onChange={(e) => handleInputChange(row.id, "name", e.target.value)}
                                    className="h-11 rounded-xl border border-[#cccccd] bg-white text-[14px]"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[14px] text-[#10141a]">Sign In</label>
                                <TimePicker
                                    value={row.signIn}
                                    onChange={(time24h) => handleInputChange(row.id, "signIn", time24h)}
                                >
                                    <div className="relative h-11 w-full rounded-xl border border-[#cccccd] bg-white px-4 flex items-center justify-between cursor-pointer hover:border-[#00b4b8] transition-colors">
                                        <span className="text-[14px] text-[#10141a]">{row.signIn ? formatTimeDisplay(row.signIn) : ""}</span>
                                        <Clock className="w-5 h-5 text-[#808081]" />
                                    </div>
                                </TimePicker>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[14px] text-[#10141a]">Sign Out</label>
                                <TimePicker
                                    value={row.signOut}
                                    onChange={(time24h) => handleInputChange(row.id, "signOut", time24h)}
                                >
                                    <div className="relative h-11 w-full rounded-xl border border-[#cccccd] bg-white px-4 flex items-center justify-between cursor-pointer hover:border-[#00b4b8] transition-colors">
                                        <span className="text-[14px] text-[#10141a]">{row.signOut ? formatTimeDisplay(row.signOut) : ""}</span>
                                        <Clock className="w-5 h-5 text-[#808081]" />
                                    </div>
                                </TimePicker>
                            </div>
                            </div>
                                {index < attendanceRows.length - 1 && (
                                    <div className="xl:hidden mt-6 border-t border-[rgba(204,204,205,0.3)]" />
                                )}
                        </div>
                    ))}
                </div>

                {/* Buttons */}
                <div className="mt-8 flex flex-wrap gap-4 items-center">
                    <button
                        onClick={handleAddAttendee}
                        type="button"
                        className="h-11 px-6 rounded-full border border-[#cccccd] bg-white text-[#808081] text-[14px] font-medium hover:bg-[#f0f0f1] transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-11 px-8 rounded-full bg-[#00b4b8] text-white text-[14px] font-semibold hover:bg-[#00a0a3] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 min-w-[120px]"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
