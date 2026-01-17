import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import CustomDatePicker from "@/components/ui/datePicker";
import { useAuth } from "@/utils/auth";
import { getCommunityInclusions, type CommunityInclusion, type Attendee } from "@/lib/api/community-inclusions";
import { useToast } from "@/hooks/use-toast";

// Flattened interface for table display
interface HistoryRow {
    id: string; // attendee id or composite
    submissionId: string;
    name: string;
    signIn: string;
    signOut: string;
}

export default function CommunityInclusionHistoryPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [inclusions, setInclusions] = useState<CommunityInclusion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedDate) return;

            setIsLoading(true);
            try {
                // Fetch inclusions filtered by date
                // Note: The API needs to handle the date filtering parameter we added
                const dateStr = format(selectedDate, "yyyy-MM-dd");
                const response = await getCommunityInclusions({
                    date: dateStr,
                    limit: 100 // Fetching reasonable amount, assuming pagination is client side for the flattened list or backend supports better filtering
                });
                setInclusions(response.data || []);
            } catch (error) {
                console.error("Failed to fetch history:", error);
                toast({
                    title: "Error",
                    description: "Failed to load community inclusion history.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedDate]);

    // Flatten attendees for the table
    const tableData = useMemo(() => {
        const rows: HistoryRow[] = [];
        inclusions.forEach(inc => {
            if (inc.attendees && Array.isArray(inc.attendees)) {
                inc.attendees.forEach((attendee: Attendee) => {
                    rows.push({
                        id: attendee.id || `${inc.id}-${Math.random()}`,
                        submissionId: inc.id,
                        name: attendee.name,
                        signIn: attendee.signIn,
                        signOut: attendee.signOut
                    });
                });
            }
        });
        return rows;
    }, [inclusions]);

    // Pagination logic
    const totalPages = Math.max(1, Math.ceil(tableData.length / itemsPerPage));
    const paginatedRows = tableData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [tableData.length]);

    const formatTimeDisplay = (time24h: string): string => {
        if (!time24h) return "-";
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
        <div className="min-h-[calc(100vh-200px)] px-3 sm:px-4 md:px-6 lg:px-0">
            {/* Header */}
            <div className="mb-4 sm:mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-6 h-6 text-[#10141a]" />
                </button>
                <h1 className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[40px] font-semibold leading-[1.4] sm:leading-[1.6] text-[#10141a]">
                    Client Management
                </h1>
            </div>

            {/* History Card */}
            <div className="relative overflow-hidden rounded-[16px] sm:rounded-[20px] lg:rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)] min-h-[600px]">
                <div className="relative p-3 sm:p-4 md:p-[24px]">
                    {/* Section Header & Filter */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                        <div>
                            <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-medium leading-[1.4] sm:leading-[1.6] text-[#10141a]">
                                Community Inclusions History
                            </h2>
                            <p className="text-[14px] text-[#808081] font-normal mt-1">
                                List Of Attendances Of {selectedDate ? format(selectedDate, "d MMMM") : "Selected Date"}
                            </p>
                        </div>

                        <div className="w-full md:w-[240px] cursor-pointer">
                            <CustomDatePicker
                                date={selectedDate}
                                setDate={setSelectedDate}
                                placeholder="Select date"
                                className="w-full cursor-pointer"
                                align="end"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white/50 rounded-[20px] border border-white/60 overflow-hidden backdrop-blur-sm">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-[#E5E5E6] bg-black/5">
                                        <th className="px-6 py-4 text-left text-[14px] font-medium text-[#808081]">Name</th>
                                        <th className="px-6 py-4 text-left text-[14px] font-medium text-[#808081]">Sign In</th>
                                        <th className="px-6 py-4 text-left text-[14px] font-medium text-[#808081]">Sign Out</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Loader2 className="w-6 h-6 animate-spin text-[#00b4b8]" />
                                                    <span className="text-[14px] text-[#808081]">Loading history...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-[14px] text-[#808081]">
                                                No attendances found for this date.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedRows.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-[#E5E5E6] last:border-0 hover:bg-white/40 transition-colors"
                                            >
                                                <td className="px-6 py-4 text-[14px] text-[#10141a] font-medium">
                                                    {row.name}
                                                </td>
                                                <td className="px-6 py-4 text-[14px] text-[#10141a]">
                                                    <span className="bg-[#F0F0F1] px-3 py-1 rounded-full text-[13px]">
                                                        {formatTimeDisplay(row.signIn)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[14px] text-[#10141a]">
                                                    <span className="bg-[#F0F0F1] px-3 py-1 rounded-full text-[13px]">
                                                        {formatTimeDisplay(row.signOut)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {tableData.length > 0 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <span className="text-[14px] font-medium text-[#10141a]">
                                {currentPage} <span className="text-[#808081]">/ {totalPages}</span>
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded-full border border-[#cccccd] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-[#10141a]" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-full border border-[#cccccd] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-[#10141a]" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
