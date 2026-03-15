import React, {useState, useEffect, useCallback} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ChevronLeft, ChevronRight, ArrowLeft, Search} from "lucide-react";
import CustomDatePicker from "@/components/ui/datePicker";
import {useAuth} from "@/utils/auth";
import {useLocation, useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {useGetBillingRecordsQuery} from "@/pages/agency/billing-and-approvals/api";
import {formatCurrency, buildServiceByCodeMap, getClientRate} from "@/pages/agency/billing-and-approvals/billingUtils";

export default function BillingReport() {
    const {user} = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"client" | "dsp">("client");
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [dates, setDates] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: null,
        endDate: null
    });
    const itemsPerPage = 10;

    const {state: locationState} = useLocation();

    const handleDateSelect = (
        name: string,
        value: Date | null
    ) => {
        setDates((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const {data: billingData, isLoading, isFetching} = useGetBillingRecordsQuery(
        {
            agencyId: user?.agencyId || '',
            billingStatus: "all",
            date: "all",
            serviceType: "all",
            limit: itemsPerPage,
            page: currentPage,
            groupBy: activeTab === "client" ? "client" : "dsp",
        },
        {
            skip: !user?.agencyId,
            refetchOnMountOrArgChange: true,
        }
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const handleGenerateReport = async (
        data: { client?: string; } | { employee: string },
    ) => {
        if (Object.keys(data).length === 0) return;

        if (activeTab === "client" && "client" in data) {
            navigate(Routes.agency.clientClaims.replace(
                ':clientId', data.client ?? ""
            ));
        } else if (activeTab === "dsp" && "employee" in data) {
            navigate(Routes.agency.dspClaims.replace(':dsp', data.employee ?? ""));
        }
    };

    const totalRecords = billingData?.total || 0;
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    const loading = isLoading || isFetching;

    const handlePreviousPage = useCallback(() => {
        setCurrentPage((p) => (p > 1 ? p - 1 : p));
    }, []);

    const handleNextPage = useCallback(() => {
        setCurrentPage((p) => (p < totalPages ? p + 1 : p));
    }, [totalPages]);

    const servicesGroupedByRole = billingData?.records || [];

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
        <div className="min-h-[calc(100vh-200px)]">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => navigate(Routes.agency.reports.index)}
                        variant="ghost"
                        className="h-10 w-10 p-0 hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-5 w-5"/>
                    </Button>
                    <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
                        Report
                    </h1>
                </div>
                <div className="flex gap-4 items-center">
                    <CustomDatePicker
                        placeholder="Start date"
                        date={dates.startDate}
                        setDate={(e) => handleDateSelect("startDate", e)}
                    />
                    <CustomDatePicker
                        placeholder="End date"
                        date={dates.endDate}
                        setDate={(e) => handleDateSelect("endDate", e)}
                    />
                    <Button
                        className="h-[44px] rounded-[8px] bg-[#00b4b8] text-white hover:bg-[#009ea1] px-6"
                    >
                        Generate
                    </Button>
                </div>
            </div>

            {/* Billing Section */}
            <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-[#e5e5e6]">
                <div className={"flex items-center justify-between mb-6"}>
                    <div>
                        <h2 className="text-[20px] font-medium text-[#10141a] mb-1">Billing Report</h2>
                        <p className="text-[14px] text-[#808081]">
                            Billing overview by client or staff
                        </p>
                    </div>

                    {/* Search and Client/DSP Filters */}
                    <div className="flex gap-2 items-center">
                        <div className="relative w-[320px]">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081] pointer-events-none z-10"/>
                            <Input
                                type="text"
                                placeholder="Search by name or ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 h-[36px] border-0 rounded-[60px] bg-[rgba(255,255,255,0.5)] backdrop-blur-[8px] border border-[rgba(255,255,255,0.3)] focus-visible:ring-1 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-0 text-[12px]"
                            />
                        </div>
                        <Button
                            onClick={() => setActiveTab("dsp")}
                            className={`${
                                activeTab === "dsp"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#525253] text-[#525253]"
                            } rounded-[60px] px-4 py-2 h-[36px] font-semibold text-[12px] hover:bg-[#00b4b8] hover:text-white transition-all duration-200`}
                        >
                            DSPs
                        </Button>
                        <Button
                            onClick={() => setActiveTab("client")}
                            className={`${
                                activeTab === "client"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#525253] text-[#525253]"
                            } rounded-[60px] px-4 py-2 h-[36px] font-medium text-[12px] hover:bg-[#00b4b8] hover:text-white transition-all duration-200`}
                        >
                            Clients
                        </Button>
                    </div>
                </div>

                {/* Billing Records */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div
                                className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
                            <p className="text-sm text-[#808081]">Loading billing records…</p>
                        </div>
                    </div>
                ) : servicesGroupedByRole.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-[16px] font-medium text-[#808081]">
                            No billing records for this period
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {servicesGroupedByRole.map((record) => {
                            const clientName = record.client
                                ? `${record.client.firstName || ''} ${record.client.lastName || ''}`.trim() || 'Unknown Client'
                                : 'Unknown Client';

                            const dspName = record.employee?.fullName || 'Unknown DSP';

                            const serviceByCode = buildServiceByCodeMap(record.client?.services);

                            return (
                                <div
                                    key={record.id}
                                    className="flex justify-between rounded-lg hover:bg-[#f9fafb] transition-colors"
                                >
                                    {activeTab === "client" ? (
                                        <>
                                            {/* Client Info */}
                                            <div className="flex gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-lg font-bold">
                                                    {clientName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[16px] font-semibold text-[#10141a]">
                                                        {clientName}
                                                    </p>
                                                    <p className="text-[14px] text-[#808081]">Client</p>
                                                </div>
                                            </div>

                                            {/* DSP Info - Multiple rows */}
                                            <div className="flex flex-col gap-4">
                                                {record.employees?.map((employee) => (
                                                    <div className="flex items-center gap-4 h-[60px]" key={employee.id}>
                                                        <div
                                                            className="w-12 h-12 rounded-[8px] bg-linear-to-br from-[#808081] to-[#6a6a6b] flex items-center justify-center text-white text-lg font-bold">
                                                            {employee.fullName?.charAt(0) || 'D'}
                                                        </div>
                                                        <div>
                                                            <p className="text-[16px] font-semibold text-[#10141a]">
                                                                {employee.fullName || 'Unknown DSP'}
                                                            </p>
                                                            <p className="text-[14px] text-[#808081]">Staff</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* DSP Info (First in DSP tab) */}
                                            <div className="flex gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-[8px] bg-linear-to-br from-[#808081] to-[#6a6a6b] flex items-center justify-center text-white text-lg font-bold">
                                                    {dspName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[16px] font-semibold text-[#10141a]">
                                                        {dspName}
                                                    </p>
                                                    <p className="text-[14px] text-[#808081]">Staff</p>
                                                </div>
                                            </div>

                                            {/* Client Info - Multiple rows */}
                                            <div className="flex flex-col gap-4">
                                                {record.clients?.map((client) => {
                                                    const clientDisplayName = client
                                                        ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown Client'
                                                        : 'Unknown Client';

                                                    return (
                                                        <div className="flex items-center gap-4 h-[60px]"
                                                             key={client.id}>
                                                            <div
                                                                className="w-12 h-12 rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-lg font-bold">
                                                                {clientDisplayName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-[16px] font-semibold text-[#10141a]">
                                                                    {clientDisplayName}
                                                                </p>
                                                                <p className="text-[14px] text-[#808081]">Client</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}

                                    {/* Service Code - Multiple rows */}
                                    <div className="flex flex-col gap-4">
                                        {(activeTab === "client" ? record.employees : record.clients)?.map((item) => {
                                            const serviceCode = activeTab === "client"
                                                ? (item as any).serviceCode
                                                : (item as any).serviceCode || (item as any).services?.[0]?.code;
                                            return (
                                                <div key={item.id} className="flex flex-col justify-center h-[60px]">
                                                    <p className="text-[14px] text-[#808081] mb-1">Service Code</p>
                                                    <p className="text-[16px] font-medium text-[#10141a]">
                                                        {serviceCode || '—'}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Total Hours - Multiple rows */}
                                    <div className="flex flex-col gap-4">
                                        {(activeTab === "client" ? record.employees : record.clients)?.map((item) => (
                                            <div key={item.id} className="flex flex-col justify-center h-[60px]">
                                                <p className="text-[14px] text-[#808081] mb-1">Hours</p>
                                                <p className="text-[16px] font-medium text-[#10141a]">{item.totalHours || 0}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pay Rate - Multiple rows (client rate on clients tab, staff rate on DSP tab) */}
                                    <div className="flex flex-col gap-4">
                                        {record.shifts?.map((item) => {
                                            const serviceCode = item.serviceCode;
                                            let rateToShow = item.payRate;
                                            if (activeTab === "client" && serviceCode) {
                                                const service = serviceByCode.get(String(serviceCode));
                                                rateToShow = service ? getClientRate(service).rate || item.payRate : item.payRate;
                                            }
                                            return (
                                                <div key={item.id} className="flex flex-col justify-center h-[60px]">
                                                    <p className="text-[14px] text-[#808081] mb-1">Rate</p>
                                                    <p className="text-[16px] font-medium text-[#10141a]">
                                                        {formatCurrency(rateToShow)}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Generate Report Button */}
                                    <div className={"flex flex-col gap-4"}>
                                        <div className="flex items-center h-[60px]">
                                            <Button
                                                onClick={() => handleGenerateReport(
                                                    activeTab === "client"
                                                        ? {client: record.client?.id}
                                                        : {employee: record.employee?.id}
                                                )}
                                                className="bg-[#B2B2B3] hover:bg-[#B2B2B3] text-white rounded-full px-6 py-2 h-auto font-medium transition-all duration-200"
                                            >
                                                View claims
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {!loading && servicesGroupedByRole.length > 0 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-[#f0f0f0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-[#10141a]"/>
                        </button>

                        <span className="text-[14px] font-medium text-[#10141a]">
              {currentPage}
            </span>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages}
                            className="p-2 rounded-lg hover:bg-[#f0f0f0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-[#10141a]"/>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
