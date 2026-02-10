import React, {useState, useMemo} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Search, X, FileText, ExternalLink, Loader2, ArrowLeft} from "lucide-react";
import CustomDatePicker from "@/components/ui/datePicker";
import {cn} from "@/lib/utils";
import {useAuth} from "@/utils/auth";
import {UserType} from "@/utils/auth/types";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {
    useGetDSPsReportQuery,
    useGetSuperAdminDSPsReportQuery,
    useGetDSPDocumentsQuery,
    DSPReport as DSPReportType,
    DSPDocument
} from "@/lib/api/reports";

export default function DSPReport() {
    const {user} = useAuth();
    const navigate = useNavigate();
    const isSuperAdmin = user?.userType === UserType.SUPER_ADMIN;

    const [dates, setDates] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: null,
        endDate: null
    });

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedDSP, setSelectedDSP] = useState<DSPReportType | null>(null);
    const [showDocumentsModal, setShowDocumentsModal] = useState<boolean>(false);
    const [status, setStatus] = useState<"active" | "inactive" | "all">("all");

    const handleDateSelect = (
        name: string,
        value: Date | null
    ) => {
        setDates((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const filters = useMemo(() => ({
        status,
        startDate: dates.startDate?.toISOString().slice(0, 10),
        endDate: dates.endDate?.toISOString().slice(0, 10),
        isLifetime: false
    }), [status, dates.startDate, dates.endDate]);

    const { data: agencyData, isLoading: agencyLoading } = useGetDSPsReportQuery(filters, {
        skip: isSuperAdmin
    });
    
    const { data: superAdminData, isLoading: superAdminLoading } = useGetSuperAdminDSPsReportQuery(filters, {
        skip: !isSuperAdmin
    });

    const data = isSuperAdmin ? superAdminData : agencyData;
    const isLoading = isSuperAdmin ? superAdminLoading : agencyLoading;

    const { data: documentsData, isLoading: documentsLoading } = useGetDSPDocumentsQuery(
        selectedDSP?.id || "",
        { skip: !selectedDSP }
    );

    const filteredDSPs = useMemo(() => {
        if (!data?.data) return [];
        
        return data.data.filter(dsp => 
            dsp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dsp.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data?.data, searchQuery]);

    const handleDSPClick = (dsp: DSPReportType) => {
        setSelectedDSP(dsp);
        setShowDocumentsModal(true);
    };

    const handleDocumentClick = (fileUrl: string) => {
        window.open(fileUrl, "_blank");
    };

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
                        className="h-[44px] rounded-[8px] bg-[#00b4b8] text-white"
                    >
                        Generate
                    </Button>
                </div>
            </div>
            <div className={"mt-3 bg-[#FFFFFF4D] rounded-xl p-4 flex-1 flex flex-col"}>
                <div className={"flex items-center justify-between"}>
                    <div>
                        <h4 className={"font-semibold text-lg"}>DSPs Report</h4>
                        <p className={"text-[#808081]"}>Report For DSPs</p>
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
                                "h-[44px] rounded-3xl w-[80px]",
                                status === "active"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("active")}
                        >
                            Active
                        </Button>
                        <Button
                            className={cn(
                                "h-[44px] rounded-3xl w-[80px]",
                                status === "inactive"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("inactive")}
                        >
                            Inactive
                        </Button>
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

                                        <div className={cn(
                                            "rounded-[60px] px-4 py-2",
                                            dsp.status === "active" 
                                                ? "bg-[#0EAF520D] border border-[#0EAF52]"
                                                : "bg-[#FF00000D] border border-[#FF0000]"
                                        )}>
                                            <p className={cn(
                                                "text-[12px] font-semibold",
                                                dsp.status === "active" ? "text-[#0EAF52]" : "text-[#FF0000]"
                                            )}>
                                                {dsp.status === "active" ? "Active" : "Inactive"}
                                            </p>
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
                                                Documents
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {dsp.documentCount}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[14px] font-medium text-[#808081] mb-0">
                                                Account Created
                                            </p>
                                            <p className="text-[14px] font-medium text-black">
                                                {dsp.createdAt ? new Date(dsp.createdAt).toLocaleDateString() : "N/A"}
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
                                                View Documents
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-[16px] text-[#808081]">No DSPs found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showDocumentsModal && selectedDSP && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowDocumentsModal(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[80vh] overflow-hidden">
                        <div className="bg-white rounded-lg shadow-xl">
                            <div className="flex items-center justify-between p-6 border-b">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#10141a]">
                                        {selectedDSP.fullName}
                                    </h2>
                                    <p className="text-sm text-[#808081] mt-1">
                                        Documents ({documentsData?.total || 0})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDocumentsModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {documentsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-[#00b4b8]" />
                                    </div>
                                ) : documentsData?.data.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No documents found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {documentsData?.data.map((doc: DSPDocument) => (
                                            <div
                                                key={doc.id}
                                                onClick={() => handleDocumentClick(doc.fileUrl)}
                                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <FileText className="h-8 w-8 text-[#00b4b8]" />
                                                    <div>
                                                        <p className="font-medium text-[#10141a] group-hover:text-[#00b4b8] transition-colors">
                                                            {doc.documentType}
                                                        </p>
                                                        <p className="text-sm text-[#808081]">
                                                            {doc.status} • Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                                                            {doc.expiryDate && ` • Expires ${new Date(doc.expiryDate).toLocaleDateString()}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-[#00b4b8] transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end p-6 border-t">
                                <Button
                                    onClick={() => setShowDocumentsModal(false)}
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