import React, {useState, useMemo, useEffect} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Search, X, FileText, Loader2, ArrowLeft} from "lucide-react";
import {Skeleton} from "@/components/ui/skeleton";
import CustomDatePicker from "@/components/ui/datePicker";
import {cn} from "@/lib/utils";
import {useAuth} from "@/utils/auth";
import {UserType} from "@/utils/auth/types";
import {useLocation, useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {
    useGetShiftsReportQuery,
    useGetSuperAdminShiftsReportQuery,
    useGetClientApprovedNotesQuery,
    ShiftReport,
    ApprovedNote
} from "@/lib/api/reports";

export default function TimesheetReport() {
    const {user} = useAuth();
    const navigate = useNavigate();
    const isSuperAdmin = user?.userType === UserType.SUPER_ADMIN;

    const { state: locationState } = useLocation();

    const [dates, setDates] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: null,
        endDate: null
    });

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedClient, setSelectedClient] = useState<ShiftReport | null>(null);
    const [showNotesModal, setShowNotesModal] = useState<boolean>(false);
    const [status, setStatus] = useState<"all" | "ongoing" | "scheduled" | "finished">("all");
    const [triggerRefetch, setTriggerRefetch] = useState<number>(0);

    const handleDateSelect = (
        name: string,
        value: Date | null
    ) => {
        setDates((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleGenerateReport = () => {
        setTriggerRefetch(prev => prev + 1);
    };

    const filters = useMemo(() => ({
        status,
        startDate: dates.startDate?.toISOString().slice(0, 10),
        endDate: dates.endDate?.toISOString().slice(0, 10),
        isLifetime: false,
        _trigger: triggerRefetch
    }), [status, dates.startDate, dates.endDate, triggerRefetch]);

    const { data: agencyData, isLoading: agencyLoading } = useGetShiftsReportQuery(filters, {
        skip: isSuperAdmin
    });
    
    const { data: superAdminData, isLoading: superAdminLoading } = useGetSuperAdminShiftsReportQuery(filters, {
        skip: !isSuperAdmin
    });

    const data = isSuperAdmin ? superAdminData : agencyData;
    const isLoading = isSuperAdmin ? superAdminLoading : agencyLoading;

    const { data: notesData, isLoading: notesLoading } = useGetClientApprovedNotesQuery(
        selectedClient?.id || "",
        { skip: !selectedClient }
    );

    const filteredClients = useMemo(() => {
        if (!data?.data) return [];
        
        return data.data.filter(client => 
            client.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data?.data, searchQuery]);

    const handleClientClick = (client: ShiftReport) => {
        setSelectedClient(client);
        setShowNotesModal(true);
    };

    useEffect(() => {
        if (locationState) {
            if (!locationState.isLifetime) {
                setDates({
                    startDate: locationState.startDate ? new Date(locationState.startDate) : null,
                    endDate: locationState.endDate ? new Date(locationState.endDate) : null,
                })
            }
        }
    }, [locationState]);

    return (
        <div className="min-h-[calc(100vh-200px)] flex flex-col">
            <div className={"mb-8 flex items-center justify-between"}>
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => navigate(isSuperAdmin ? Routes.superAdmin.reports.index : Routes.agency.reports.index)}
                        variant="ghost"
                        className="h-10 w-10 p-0 hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
                        Report
                    </h1>
                </div>
                <div className={"flex gap-4"}>
                    <CustomDatePicker
                        placeholder={"Select start date"}
                        date={dates.startDate}
                        setDate={(e) => handleDateSelect("startDate", e)}
                    />
                    <CustomDatePicker
                        placeholder={"Select end date"}
                        date={dates.endDate}
                        setDate={(e) => handleDateSelect("endDate", e)}
                    />
                    <Button
                        onClick={handleGenerateReport}
                        className="h-[44px] rounded-[8px] bg-[#00b4b8] text-white hover:bg-[#009ea1]"
                    >
                        Generate
                    </Button>
                </div>
            </div>
            <div className={"mt-3 bg-[#FFFFFF4D] rounded-xl p-4 flex-1 flex flex-col"}>
                <div className={"flex items-center justify-between"}>
                    <div>
                        <h4 className={"font-semibold text-lg"}>Timesheet Report</h4>
                        <p className={"text-[#808081]"}>Report For Timesheet</p>
                    </div>
                    <div className={"flex items-center gap-4"}>
                        <div className="relative w-[240px] animate-in fade-in slide-in-from-right-2 duration-300">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081] pointer-events-none z-10"/>
                            <Input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 h-10 border-0 rounded-full bg-[#f8f9fa] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
                            />
                        </div>
                        <Button
                            className={cn("h-[44px] rounded-3xl w-[80px]",
                                status === "all"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("all")}
                        >
                            All
                        </Button>
                        <Button
                            className={cn(
                                "h-[44px] rounded-3xl w-[100px]",
                                status === "ongoing"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("ongoing")}
                        >
                            Ongoing
                        </Button>
                        <Button
                            className={cn(
                                "h-[44px] rounded-3xl w-[100px]",
                                status === "scheduled"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("scheduled")}
                        >
                            Scheduled
                        </Button>
                        <Button
                            className={cn(
                                "h-[44px] rounded-3xl w-[100px]",
                                status === "finished"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("finished")}
                        >
                            Finished
                        </Button>
                    </div>
                </div>

                <div className="flex-1 mt-6 overflow-auto">
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex justify-between rounded-lg p-4">
                                    <div className="flex gap-4">
                                        <Skeleton className="w-12 h-12 rounded-[8px] flex-shrink-0" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                    <Skeleton className="h-8 w-24 rounded-[60px]" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredClients.length > 0 ? (
                                filteredClients.map((client) => (
                                    <div
                                        key={client.id}
                                        className="flex justify-between gap-4 backdrop-blur-[20px] bg-white/50 rounded-[20px] items-center p-4 cursor-pointer hover:bg-white/70 transition-colors"
                                        onClick={() => handleClientClick(client)}
                                    >
                                        <div className={"flex gap-4 items-center"}>
                                            <div className="w-[52.5px] h-[60px] rounded-[8px] overflow-hidden flex-shrink-0">
                                                <div className="w-full h-full flex items-center justify-center bg-[#00b4b8] text-white rounded-[8px]">
                                                    {client.fullName.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[16px] font-semibold leading-[1.6] text-black">
                                                    {client.fullName}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Total DSPs
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {client.totalDSPs}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Approved Notes
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {client.totalApprovedNotes}
                                            </p>
                                        </div>

                                        {isSuperAdmin && (
                                            <div>
                                                <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                    Agency
                                                </p>
                                                <p className="text-[14px] font-medium text-black">
                                                    {(client as any).agencyName || "N/A"}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                                className="bg-[#00b4b8] border border-[#00b4b8] text-white hover:bg-[#009ea1] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px]"
                                            >
                                                View Notes
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-[16px] text-[#808081]">No shifts found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showNotesModal && selectedClient && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowNotesModal(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[80vh] overflow-hidden">
                        <div className="bg-white rounded-lg shadow-xl">
                            <div className="flex items-center justify-between p-6 border-b">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#10141a]">
                                        {selectedClient.fullName}
                                    </h2>
                                    <p className="text-sm text-[#808081] mt-1">
                                        Approved Notes ({notesData?.total || 0})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowNotesModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {notesLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-[#00b4b8]" />
                                    </div>
                                ) : notesData?.data.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No approved notes found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {notesData?.data.map((note: ApprovedNote) => (
                                            <div
                                                key={note.id}
                                                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-[#10141a]">
                                                            {note.employeeName}
                                                        </p>
                                                        <p className="text-sm text-[#808081] mt-1">
                                                            {note.activityType}
                                                        </p>
                                                        <p className="text-xs text-[#808081] mt-2">
                                                            Submitted: {new Date(note.submittedAt).toLocaleDateString()} • 
                                                            Approved: {new Date(note.approvedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                                        {note.noteCount} {note.noteCount === 1 ? 'Note' : 'Notes'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end p-6 border-t">
                                <Button
                                    onClick={() => setShowNotesModal(false)}
                                    className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}