import React, {useState, useEffect, useCallback} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {useSelector} from "react-redux";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/utils/auth";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {useGetBillingRecordsQuery} from "./api";
import {formatCurrency, buildServiceByCodeMap, getClientRate} from "./billingUtils";
import type {ClientServiceDefinition} from "./api";
import {staffLabels} from "@/lib/roleLabel";
import {useEffectiveAgencyMode} from "@/hooks/useEffectiveAgencyMode";
import type {RootState} from "@/store/redux/store";

interface BillingStatusFilter {
  value: string;
  label: string;
}

interface ServiceTypeFilter {
  value: string;
  label: string;
}

export default function BillingAndApprovalsPage() {
  const {user} = useAuth();
  const navigate = useNavigate();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const effectiveTypes = selectedMode ? [selectedMode] : user?.agency?.supportedClientTypes;
  const labels = staffLabels(effectiveTypes);
  const effectiveMode = useEffectiveAgencyMode();
  const [activeTab, setActiveTab] = useState<"client" | "dsp">("client");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBillingStatus, setSelectedBillingStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("all");
  const itemsPerPage = 10;

  const billingStatusFilters: BillingStatusFilter[] = [
    {value: "all", label: "Billing Status"},
    {value: "pending", label: "Pending"},
    {value: "approved", label: "Approved"},
    {value: "rejected", label: "Rejected"},
  ];

  const serviceTypeFilters: ServiceTypeFilter[] = [
    {value: "all", label: "Service Type"},
    {value: "companion-care", label: "Companion Care"},
    {value: "personal-care", label: "Personal Care"},
    {value: "respite-care", label: "Respite Care"},
  ];

  const {data: billingData, isLoading, isFetching} = useGetBillingRecordsQuery(
    {
      agencyId: user?.agencyId || '', 
      billingStatus: selectedBillingStatus,
      date: selectedDate,
      serviceType: selectedServiceType,
      limit: itemsPerPage,
      page: currentPage,
      groupBy: activeTab === "client" ? "client" : "dsp",
      mode: effectiveMode ?? undefined,
    },
    {
      skip: !user?.agencyId,
    }
  );

  // Reset to page 1 when tab changes
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

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Billing & Management
        </h1>
        <div className="flex gap-3">
          <Button
            onClick={() => setActiveTab("client")}
            className={`${
              activeTab === "client"
                ? "bg-[#00b4b8] hover:bg-[#009da1] text-white hover:text-white"
                : "bg-white border border-[#808081] text-[#10141A]"
            } rounded-full px-6 py-2.5 h-auto font-medium shadow-sm transition-all duration-200`}
          >
            Client
          </Button>
          <Button
            onClick={() => setActiveTab("dsp")}
            className={`${
              activeTab === "dsp"
                ? "bg-[#00b4b8] hover:bg-[#009da1] text-white hover:text-white"
                : "bg-white border border-[#808081] text-[#10141A]"
            } rounded-full px-6 py-2.5 h-auto font-medium shadow-sm transition-all duration-200`}
          >
            {labels.noun}
          </Button>
        </div>
      </div>

      {/* Billing Section */}
      <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-[#e5e5e6]">
        <div className={"flex items-center justify-between mb-6"}>
          <div className="mb-6">
            <h2 className="text-[24px] font-bold text-[#10141a] mb-2">Billing</h2>
            <p className="text-[14px] text-[#808081]">
              {activeTab === "client" ? "List of clients" : `List of ${labels.plural}`}
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select
              value={selectedBillingStatus}
              onChange={(e) => setSelectedBillingStatus(e.target.value)}
              className="px-4 py-2 border border-[#e5e5e6] rounded text-[14px] text-[#10141a] bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4b8] min-w-[150px]"
            >
              {billingStatusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-[#e5e5e6] rounded text-[14px] text-[#10141a] bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4b8] min-w-[150px]"
            >
              <option value="all">Date</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
            </select>

            <select
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
              className="px-4 py-2 border border-[#e5e5e6] rounded text-[14px] text-[#10141a] bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4b8] min-w-[180px]"
            >
              {serviceTypeFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Billing Records */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div
                className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
              <p className="text-sm text-[#808081]">Loading billing records...</p>
            </div>
          </div>
        ) : servicesGroupedByRole.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[16px] font-medium text-[#808081]">
              No billing records found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {servicesGroupedByRole.map((record) => {
              const clientName = record.client
                ? `${record.client.firstName || ''} ${record.client.lastName || ''}`.trim() || 'Unknown Client'
                : 'Unknown Client';

              const dspName = record.employee?.fullName || `Unknown ${labels.noun}`;

              const serviceByCode = buildServiceByCodeMap(
                record.client?.services as unknown as ClientServiceDefinition[] | undefined
              );

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
                          className="w-12 h-12 rounded-full bg-linear-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-lg font-bold">
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
                              className="w-12 h-12 rounded-full bg-linear-to-br from-[#808081] to-[#6a6a6b] flex items-center justify-center text-white text-lg font-bold">
                              {employee.fullName?.charAt(0) || 'D'}
                            </div>
                            <div>
                              <p className="text-[16px] font-semibold text-[#10141a]">
                                {employee.fullName || `Unknown ${labels.noun}`}
                              </p>
                              <p className="text-[14px] text-[#808081]">{labels.noun}</p>
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
                          className="w-12 h-12 rounded-full bg-linear-to-br from-[#808081] to-[#6a6a6b] flex items-center justify-center text-white text-lg font-bold">
                          {dspName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[16px] font-semibold text-[#10141a]">
                            {dspName}
                          </p>
                          <p className="text-[14px] text-[#808081]">{labels.noun}</p>
                        </div>
                      </div>

                      {/* Client Info - Multiple rows */}
                      <div className="flex flex-col gap-4">
                        {record.clients?.map((client) => {
                          const clientDisplayName = client
                            ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown Client'
                            : 'Unknown Client';

                          return (
                            <div className="flex items-center gap-4 h-[60px]" key={client.id}>
                              <div
                                className="w-12 h-12 rounded-full bg-linear-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-lg font-bold">
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
                      // For ClientWithHours, try serviceCode property first, then fallback to services array
                      const serviceCode = activeTab === "client" 
                        ? (item as any).serviceCode 
                        : (item as any).serviceCode || (item as any).services?.[0]?.code;
                      return (
                        <div key={item.id} className="flex flex-col justify-center h-[60px]">
                          <p className="text-[14px] text-[#808081] mb-1">Service Code</p>
                          <p className="text-[16px] font-medium text-[#10141a]">
                            {serviceCode || 'N/A'}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Hours - Multiple rows */}
                  <div className="flex flex-col gap-4">
                    {(activeTab === "client" ? record.employees : record.clients)?.map((item) => (
                      <div key={item.id} className="flex flex-col justify-center h-[60px]">
                        <p className="text-[14px] text-[#808081] mb-1">Total Hours</p>
                        <p className="text-[16px] font-medium text-[#10141a]">{(item.totalHours ?? 0).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Pay Rate - Multiple rows (client rate on clients tab, staff rate on DSP tab) */}
                  <div className="flex flex-col gap-4">
                    {(activeTab === "client" ? record.employees : record.clients)?.map((item) => {
                      const serviceCode = (item as { serviceCode?: string }).serviceCode;
                      let rateToShow = record.payRate ?? 0;
                      if (activeTab === "client" && serviceCode) {
                        const service = serviceByCode.get(String(serviceCode));
                        rateToShow = service
                          ? (getClientRate(service).rate || record.payRate) ?? 0
                          : (record.payRate ?? 0);
                      }
                      const rateLabel = serviceCode ? `Pay rate (${serviceCode})` : "Pay Rate";
                      return (
                        <div key={item.id} className="flex flex-col justify-center h-[60px]">
                          <p className="text-[14px] text-[#808081] mb-1">{rateLabel}</p>
                          <p className="text-[16px] font-medium text-[#10141a]">
                            {formatCurrency(rateToShow)}
                          </p>
                        </div>
                      );
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
                        Generate Report
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
