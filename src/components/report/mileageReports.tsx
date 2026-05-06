import React, {useState, useMemo, useEffect} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Search, X, MapPin, ArrowLeft, Loader2} from "lucide-react";
import {Skeleton} from "@/components/ui/skeleton";
import CustomDatePicker from "@/components/ui/datePicker";
import {cn} from "@/lib/utils";
import {useAuth} from "@/utils/auth";
import {UserType} from "@/utils/auth/types";
import {useLocation, useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {
    useGetMileageReportQuery,
    useGetSuperAdminMileageReportQuery,
    useGetDSPMileageDetailsQuery,
    MileageReport as MileageReportType,
    MileageDetail
} from "@/lib/api/reports";

export default function MileageReport() {
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
    const [selectedDSP, setSelectedDSP] = useState<MileageReportType | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
    const [status, setStatus] = useState<"all" | "scheduled" | "in_progress" | "completed" | "cancelled">("all");
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

    const { data: agencyData, isLoading: agencyLoading } = useGetMileageReportQuery(filters, {
        skip: isSuperAdmin
    });
    
    const { data: superAdminData, isLoading: superAdminLoading } = useGetSuperAdminMileageReportQuery(filters, {
        skip: !isSuperAdmin
    });

    const data = isSuperAdmin ? superAdminData : agencyData;
    const isLoading = isSuperAdmin ? superAdminLoading : agencyLoading;

    const { data: detailsData, isLoading: detailsLoading } = useGetDSPMileageDetailsQuery(
        { employeeId: selectedDSP?.id || "", status },
        { skip: !selectedDSP }
    );

    const filteredDSPs = useMemo(() => {
        if (!data?.data) return [];
        
        return data.data.filter(dsp => 
            dsp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dsp.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data?.data, searchQuery]);

    const handleDSPClick = (dsp: MileageReportType) => {
        setSelectedDSP(dsp);
        setShowDetailsModal(true);
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
                        <h4 className={"font-semibold text-lg"}>Mileage Report</h4>
                        <p className={"text-[#808081]"}>Report For Mileage & Rides</p>
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
                                "h-[44px] rounded-3xl w-[120px]",
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
                                "h-[44px] rounded-3xl w-[120px]",
                                status === "completed"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("completed")}
                        >
                            Completed
                        </Button>
                    </div>
                </div>

                <div className="flex-1 mt-6 overflow-auto">
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex justify-between gap-4 bg-white/50 rounded-[20px] items-center p-4">
                                    <div className="flex gap-4 items-center">
                                        <Skeleton className="w-[52.5px] h-[60px] rounded-[8px] flex-shrink-0" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-40" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                    <Skeleton className="h-8 w-24 rounded-[60px]" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredDSPs.length > 0 ? (
                                filteredDSPs.map((dsp) => (
                                    <div
                                        key={dsp.id}
                                        className="flex justify-between gap-4 backdrop-blur-[20px] bg-white/50 rounded-[20px] items-center p-4 cursor-pointer hover:bg-white/70 transition-colors"
                                        onClick={() => handleDSPClick(dsp)}
                                    >
                                        <div className={"flex gap-4 items-center"}>
                                            <div className="w-[52.5px] h-[60px] rounded-[8px] overflow-hidden flex-shrink-0">
                                                <div className="w-full h-full flex items-center justify-center bg-[#00b4b8] text-white rounded-[8px]">
                                                    {dsp.fullName.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[16px] font-semibold leading-[1.6] text-black">
                                                    {dsp.fullName}
                                                </p>
                                                <p className="text-[12px] text-[#808081]">
                                                    {dsp.email}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Role
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {dsp.role}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Total Rides
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {dsp.totalRides}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Total Miles
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {dsp.totalMiles.toFixed(1)} mi
                                            </p>
                                        </div>

                                        {isSuperAdmin && (
                                            <div>
                                                <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                    Agency
                                                </p>
                                                <p className="text-[14px] font-medium text-black">
                                                    {(dsp as any).agencyName || "N/A"}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                                className="bg-[#00b4b8] border border-[#00b4b8] text-white hover:bg-[#009ea1] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px]"
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-[16px] text-[#808081]">No mileage records found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showDetailsModal && selectedDSP && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowDetailsModal(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[80vh] overflow-hidden">
                        <div className="bg-white rounded-lg shadow-xl">
                            <div className="flex items-center justify-between p-6 border-b">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#10141a]">
                                        {selectedDSP.fullName}
                                    </h2>
                                    <p className="text-sm text-[#808081] mt-1">
                                        Mileage Details ({detailsData?.total || 0} rides)
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {detailsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-[#00b4b8]" />
                                    </div>
                                ) : detailsData?.data.length === 0 ? (
                                    <div className="text-center py-8">
                                        <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No mileage records found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {detailsData?.data.map((ride: MileageDetail) => (
                                            <div
                                                key={ride.id}
                                                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-[#10141a]">
                                                            {ride.clientName}
                                                        </p>
                                                        <div className="text-sm text-[#808081] mt-2 space-y-1">
                                                            <p>Scheduled: {new Date(ride.scheduledStartTime).toLocaleString()}</p>
                                                            <p>Segments: {ride.segmentCount ?? "—"}</p>
                                                            <p>Distance: {ride.actualDistance != null ? `${ride.actualDistance.toFixed(2)} mi` : "—"}</p>
                                                            {ride.notes && <p className="text-xs italic">{ride.notes}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 text-right">
                                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                            ride.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            ride.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                            ride.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {ride.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                        <p className="text-sm font-semibold text-[#10141a] mt-2">
                                                            {ride.actualDistance != null ? `${ride.actualDistance.toFixed(2)} mi` : "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end p-6 border-t">
                                <Button
                                    onClick={() => setShowDetailsModal(false)}
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
