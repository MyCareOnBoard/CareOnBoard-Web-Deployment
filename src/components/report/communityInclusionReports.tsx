import React, {useState, useMemo, useEffect} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Search, X, Users, Loader2, ArrowLeft} from "lucide-react";
import CustomDatePicker from "@/components/ui/datePicker";
import {useAuth} from "@/utils/auth";
import {UserType} from "@/utils/auth/types";
import {useLocation, useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {
    useGetCommunityInclusionReportQuery,
    useGetSuperAdminCommunityInclusionReportQuery,
    useGetClientCommunityInclusionDetailsQuery,
    CommunityInclusionReport as CommunityInclusionReportType,
    CommunityInclusionDetail
} from "@/lib/api/reports";

export default function CommunityInclusionReport() {
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
    const [selectedClient, setSelectedClient] = useState<CommunityInclusionReportType | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
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
        startDate: dates.startDate?.toISOString().slice(0, 10),
        endDate: dates.endDate?.toISOString().slice(0, 10),
        isLifetime: false,
        _trigger: triggerRefetch
    }), [dates.startDate, dates.endDate, triggerRefetch]);

    const { data: agencyData, isLoading: agencyLoading } = useGetCommunityInclusionReportQuery(filters, {
        skip: isSuperAdmin
    });
    
    const { data: superAdminData, isLoading: superAdminLoading } = useGetSuperAdminCommunityInclusionReportQuery(filters, {
        skip: !isSuperAdmin
    });

    const data = isSuperAdmin ? superAdminData : agencyData;
    const isLoading = isSuperAdmin ? superAdminLoading : agencyLoading;

    const { data: detailsData, isLoading: detailsLoading } = useGetClientCommunityInclusionDetailsQuery(
        selectedClient?.id || "",
        { skip: !selectedClient }
    );

    const filteredClients = useMemo(() => {
        if (!data?.data) return [];
        
        return data.data.filter(client => 
            client.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data?.data, searchQuery]);

    const handleClientClick = (client: CommunityInclusionReportType) => {
        setSelectedClient(client);
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
                        <h4 className={"font-semibold text-lg"}>Community Inclusion Report</h4>
                        <p className={"text-[#808081]"}>Report For Community Inclusion Activities</p>
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
                    </div>
                </div>

                <div className="flex-1 mt-6 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-[#00b4b8]" />
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
                                                Total Activities
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {client.totalActivities}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Total Attendees
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {client.totalAttendees}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Total Hours
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {client.totalHours.toFixed(1)} hrs
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
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-[16px] text-[#808081]">No community inclusion records found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showDetailsModal && selectedClient && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowDetailsModal(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[80vh] overflow-hidden">
                        <div className="bg-white rounded-lg shadow-xl">
                            <div className="flex items-center justify-between p-6 border-b">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#10141a]">
                                        {selectedClient.fullName}
                                    </h2>
                                    <p className="text-sm text-[#808081] mt-1">
                                        Community Inclusion Details ({detailsData?.total || 0} activities)
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
                                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No community inclusion records found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {detailsData?.data.map((activity: CommunityInclusionDetail) => (
                                            <div
                                                key={activity.id}
                                                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-semibold text-[16px] text-[#10141a]">
                                                                Activity Date: {new Date(activity.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                            </p>
                                                            <p className="text-xs text-[#808081] mt-1">
                                                                Created: {new Date(activity.createdAt).toLocaleString('en-US', { 
                                                                    day: 'numeric', 
                                                                    month: 'long', 
                                                                    year: 'numeric',
                                                                    hour: 'numeric',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })}
                                                            </p>
                                                        </div>
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                                            {activity.attendees.length} Attendees
                                                        </span>
                                                    </div>

                                                    {/* Attendees Cards */}
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-semibold text-[#10141a]">Attendees:</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {activity.attendees.map((attendee: any, idx: number) => (
                                                                <div 
                                                                    key={idx} 
                                                                    className="p-3 bg-gradient-to-br from-[#f0f9ff] to-[#e0f2fe] border border-[#bae6fd] rounded-lg"
                                                                >
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00b4b8] to-[#0097b2] flex items-center justify-center">
                                                                            <span className="text-white text-xs font-semibold">
                                                                                {attendee.name?.charAt(0)?.toUpperCase() || '?'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="font-semibold text-[14px] text-[#10141a]">
                                                                            {attendee.name || 'Unknown'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-1 text-xs text-[#475569]">
                                                                        <div className="flex justify-between">
                                                                            <span className="font-medium">Sign In:</span>
                                                                            <span className="font-semibold text-[#0ea5e9]">{attendee.signIn || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="font-medium">Sign Out:</span>
                                                                            <span className="font-semibold text-[#f97316]">{attendee.signOut || 'N/A'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
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
