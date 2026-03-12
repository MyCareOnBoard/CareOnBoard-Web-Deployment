import React, {useState, useMemo, useEffect} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Search, X, AlertTriangle, Loader2, ArrowLeft} from "lucide-react";
import CustomDatePicker from "@/components/ui/datePicker";
import {useAuth} from "@/utils/auth";
import {UserType} from "@/utils/auth/types";
import {useLocation, useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {
    useGetIncidentReportQuery,
    useGetSuperAdminIncidentReportQuery,
    IncidentReport as IncidentReportType,
    IncidentDetail
} from "@/lib/api/reports";

export default function IncidentReport() {
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
    const [selectedDSP, setSelectedDSP] = useState<IncidentReportType | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
    const [status, setStatus] = useState<"all" | "pending" | "under_review" | "resolved">("all");
    const [triggerRefetch, setTriggerRefetch] = useState<number>(0);
    const [incidentDetails, setIncidentDetails] = useState<IncidentDetail[]>([]);

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

    const { data: agencyData, isLoading: agencyLoading } = useGetIncidentReportQuery(filters, {
        skip: isSuperAdmin
    });
    
    const { data: superAdminData, isLoading: superAdminLoading } = useGetSuperAdminIncidentReportQuery(filters, {
        skip: !isSuperAdmin
    });

    const data = isSuperAdmin ? superAdminData : agencyData;
    const isLoading = isSuperAdmin ? superAdminLoading : agencyLoading;

    const filteredDSPs = useMemo(() => {
        if (!data?.data) return [];
        
        return data.data.filter(dsp => 
            dsp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dsp.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data?.data, searchQuery]);

    const handleDSPClick = (dsp: IncidentReportType) => {
        setSelectedDSP(dsp);
        setShowDetailsModal(true);
        
        // Use incidents from the initial response
        if (dsp.incidents && dsp.incidents.length > 0) {
            setIncidentDetails(dsp.incidents);
        } else {
            setIncidentDetails([]);
        }
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
                        <h4 className={"font-semibold text-lg"}>Incident Report</h4>
                        <p className={"text-[#808081]"}>Report For Incidents</p>
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
                                                Total Incidents
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {dsp.totalIncidents}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Resolved
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {dsp.resolvedIncidents}
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
                                                onClick={() => handleDSPClick(dsp)}
                                                className="bg-[#00b4b8] border border-[#00b4b8] text-white hover:bg-[#009ea1] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px]"
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-[16px] text-[#808081]">No incident records found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showDetailsModal && selectedDSP && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowDetailsModal(false)}
                    />
                    <div className="relative w-full max-w-[90%] sm:max-w-[600px] lg:max-w-[800px] bg-white rounded-[16px] sm:rounded-[20px] lg:rounded-[24px] shadow-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-4 sm:p-6 lg:p-8">
                            {incidentDetails.length === 0 ? (
                                <div className="text-center py-8">
                                    <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No incident records found</p>
                                </div>
                            ) : (
                                <>
                                    {incidentDetails.map((incident: IncidentDetail, index: number) => (
                                        <div key={incident.id}>
                                            {index > 0 && <div className="my-6 border-t border-gray-200" />}
                                            
                                            <div className="flex items-start justify-between mb-4 sm:mb-6">
                                                <div>
                                                    <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a]">
                                                        Incident Details
                                                    </h2>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2 sm:gap-4">
                                                        <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                                                            <span className="font-medium">Type:</span> {incident.incidentType}
                                                        </span>
                                                        <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                                                            <span className="font-medium">Date:</span> {new Date(incident.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                {index === 0 && (
                                                    <button
                                                        onClick={() => setShowDetailsModal(false)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
                                                    >
                                                        <X className="w-5 h-5 text-[#6b7280]" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:gap-6 sm:mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden bg-gradient-to-br from-[#6366f1] to-[#4f46e5] rounded-full sm:w-12 sm:h-12">
                                                        <span className="text-[14px] sm:text-[16px] font-semibold text-white">
                                                            {selectedDSP.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[14px] sm:text-[15px] lg:text-[16px] font-semibold text-[#10141a] truncate">
                                                            {selectedDSP.fullName}
                                                        </div>
                                                        <div className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                                                            DSP
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden bg-gradient-to-br from-[#00b8d4] to-[#0097b2] rounded-full sm:w-12 sm:h-12">
                                                        <span className="text-[14px] sm:text-[16px] font-semibold text-white">
                                                            {incident.clientName ? incident.clientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[14px] sm:text-[15px] lg:text-[16px] font-semibold text-[#10141a] truncate">
                                                            {incident.clientName || 'N/A'}
                                                        </div>
                                                        <div className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                                                            Client
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-4 sm:mb-6">
                                                <label className="block text-[13px] sm:text-[14px] font-semibold text-[#10141a] mb-2">
                                                    Description
                                                </label>
                                                <div className="p-3 sm:p-4 bg-[#d1fae5] rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] text-[#10141a] leading-relaxed whitespace-pre-wrap">
                                                    {incident.description || 'N/A'}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                        incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                        incident.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {incident.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                    {incident.severity && (
                                                        <span className={`text-xs font-medium ${
                                                            incident.severity === 'critical' ? 'text-red-600' :
                                                            incident.severity === 'high' ? 'text-orange-600' :
                                                            incident.severity === 'medium' ? 'text-yellow-600' :
                                                            'text-gray-600'
                                                        }`}>
                                                            Severity: {incident.severity.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#6b7280]">
                                                    Submitted: {new Date(incident.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-end mt-6">
                                        <Button
                                            onClick={() => setShowDetailsModal(false)}
                                            className="px-8 h-10 sm:h-11 bg-[#00b8d4] hover:bg-[#00a5c0] text-white rounded-xl text-[13px] sm:text-[14px] font-medium transition-colors shadow-none"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
