import React, { useState } from "react";
import { ChevronRight, ArrowUpRight, ChevronLeft, Clock3, WandSparkles, UserRoundCog } from "lucide-react";
import { useSelector } from "react-redux";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import {
  useGetExpiredDocumentsQuery
} from "@/pages/agency/compliance-alerts/api";
import { useAuth } from "@/utils/auth";
import { useGetClientStatsQuery, useGetDSPStatsQuery, useGetShiftStatsQuery } from "@/pages/agency/dashboard/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { staffLabels } from "@/lib/roleLabel";
import type { RootState } from "@/store/redux/store";

import OperationReportHeader from "../analytics/components/AnalyticsReportHeader";
import AnalyticsDateRangeModal from "../analytics/components/AnalyticsDateRangeModal";
import ShareReportModal from "../analytics/components/ShareReportModal";
import OverviewCards from "../analytics/components/OverviewCards";
import ComplianceInsights from "../analytics/components/ComplianceInsights";
import RiskTrends from "../analytics/components/RiskTrends";
import OperationalEfficiency, { type OperationalMetric } from "../analytics/components/OperationalEfficiency";
import BillingSummary from "../analytics/components/BillingSummary";

import { useGetAnalyticsSummaryQuery } from "@/lib/api/reports";
import type { AnalyticsSummaryData } from "@/lib/api/reports";

function buildOperationalMetrics(data: AnalyticsSummaryData["operationalEfficiency"]): OperationalMetric[] {
  return [
    {
      id: "completion",
      title: "Shift completion rate",
      value: data.completionRate.value,
      path: Routes.agency.shifts,
      trend: data.completionRate.trend,
      icon: Clock3,
      chartColor: "#12B5B0",
      data: data.completionRate.sparkline,
    },
    {
      id: "ontime",
      title: "On-time start rate",
      value: data.onTimeRate.value,
      path: Routes.agency.shifts, 
      trend: data.onTimeRate.trend,
      icon: WandSparkles,
      chartColor: "#12B5B0",
      data: data.onTimeRate.sparkline,
    },
    {
      id: "manual",
      title: "Manual interventions",
      value: data.manualRate.value,
      path: Routes.agency.shifts,
      trend: data.manualRate.trend,
      icon: UserRoundCog,
      chartColor: "#E5484D",
      data: data.manualRate.sparkline,
    },
  ];
}

export default function AgencyDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const effectiveTypes = selectedMode ? [selectedMode] : user?.agency?.supportedClientTypes;
  const labels = staffLabels(effectiveTypes);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = React.useState({ startDate: "", endDate: "" });
  const [showDateModal, setShowDateModal] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const itemsPerPage = 10;

  const shiftsData = [
    { day: "SUN", scheduled: 0, completed: 0, ongoing: 0, date: "5 January" },
    { day: "MON", scheduled: 0, completed: 0, ongoing: 0, date: "6 January" },
    { day: "TUE", scheduled: 0, completed: 0, ongoing: 0, date: "7 January" },
    { day: "WED", scheduled: 0, completed: 0, ongoing: 0, date: "8 January" },
    { day: "THUR", scheduled: 0, completed: 0, ongoing: 0, date: "9 January" },
    { day: "FRI", scheduled: 0, completed: 0, ongoing: 0, date: "10 January" },
    { day: "SAT", scheduled: 0, completed: 0, ongoing: 0, date: "11 January" },
  ];

  const [hoveredShift, setHoveredShift] = useState<number | null>(null);
  const { data: expiredDocsData, isLoading: isLoadingAlerts } = useGetExpiredDocumentsQuery(user?.agencyId || "", {
    skip: !user?.agencyId,
  });
  const expiredDocuments = expiredDocsData?.data || [];

  const { data: clientStatsData, isLoading: isLoadingClients } = useGetClientStatsQuery(
    { agencyId: user?.agencyId || "", type: selectedMode },
    { skip: !user?.agencyId }
  );
  const clients = clientStatsData?.stats || { active: 0, inactive: 0, total: 0 };

  const { data: dspStatsData, isLoading: isLoadingDsp } = useGetDSPStatsQuery(
    { agencyId: user?.agencyId || "", type: selectedMode },
    { skip: !user?.agencyId }
  );
  const dspStats = dspStatsData?.stats || { active: 0, inactive: 0, total: 0 };

  const { data: shiftStatsData, isLoading: isLoadingShifts } = useGetShiftStatsQuery(
    { agencyId: user?.agencyId || "", range: "lastWeek" },
    { skip: !user?.agencyId }
  );
  const shifts = shiftStatsData?.buckets || [];

  const { data: analyticsResponse, isLoading: isLoadingAnalytics, isFetching: isFetchingAnalytics } = useGetAnalyticsSummaryQuery(
    {
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
    },
    { refetchOnMountOrArgChange: true }
  );

  const summary = analyticsResponse?.data;

  // Transform shifts data to dashboard format
  const transformedShifts = shifts.length > 0 ? shifts.map(bucket => {
    const date = new Date(bucket.date);
    const dayNames = ["SUN", "MON", "TUE", "WED", "THUR", "FRI", "SAT"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    return {
      day: dayNames[date.getDay()],
      scheduled: bucket.scheduled,
      completed: bucket.completed,
      ongoing: bucket.ongoing || 0,
      date: `${date.getDate()} ${monthNames[date.getMonth()]}`
    };
  }) : shiftsData;

  // Transform to dashboard format and limit to first 10
  const complianceAlerts = expiredDocuments.slice(0, 10).map(doc => ({
    id: doc.id,
    title: doc.employee.fullName,
    subtitle: doc.employee.role,
    document: doc.documentType,
    status: `Expired (${doc.daysExpired} day${doc.daysExpired !== 1 ? "s" : ""} ago)`,
  }));

  const maxShiftValue = Math.max(...transformedShifts.map((d) => Math.max(d.scheduled, d.completed, d.ongoing || 0)));

  const copyToClipboard = async () => {
    const domain = window.location.origin;
    const url = `${domain}/${user?.agencyId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard!");
  };

  const copyMobileAppUrl = async () => {
    const domain = window.location.origin;
    const url = `${domain}/app/${user?.agencyId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Mobile app URL copied to clipboard!");
  };

  const downloadPDF = () => {
    window.open(Routes.agency.analyticsPrint, "_blank", "noopener,noreferrer");
  };

  const isAnalyticsLoading = isLoadingAnalytics || isFetchingAnalytics;

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Dashboard
        </h1>
        <div className="flex gap-3">
          <Button
            onClick={copyToClipboard}
            className="bg-[#00b4b8] text-white px-4 py-2 rounded-full"
          >Copy {labels.noun} Agency URL</Button>
          <Button
            onClick={copyMobileAppUrl}
            className="bg-[#00b4b8] text-white px-4 py-2 rounded-full"
          >Copy Mobile App URL</Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Row - DSP and Clients */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* DSP Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(Routes.agency.dspManagement)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(Routes.agency.dspManagement);
              }
            }}
            className="flex justify-between items-center rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white cursor-pointer transition-all hover:border-[#00b4b8] hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#00b4b8]/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#10141a]">{labels.noun}</h2>
                <p className="text-[16px] font-medium text-[#808081] mt-1">
                  Overview of Staff employed by the agency.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {isLoadingDsp ? (
                <>
                  {[["#0EAF52", "Active"], ["#2B82FF", "Inactive"], ["#808081", "Total"]].map(([color, label]) => (
                    <div key={label} className="text-center">
                      <Skeleton className="w-12 mx-auto mb-2 h-9" />
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <div className="text-[12px] font-medium text-[#808081]">{label}</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-[32px] font-bold text-[#10141a]">{dspStats.active}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <div className={"flex"}>
                        <div className="w-2 h-2 rounded-full bg-[#0EAF52]"></div>
                      </div>
                      <div className="text-[12px] font-medium text-[#808081]">Active</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[32px] font-bold text-[#10141a]">{dspStats.inactive}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <div className={"flex"}>
                        <div className="w-2 h-2 rounded-full bg-[#2B82FF]"></div>
                      </div>
                      <div className="text-[12px] font-medium text-[#808081]">Inactive</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[32px] font-bold text-[#10141a]">{dspStats.total}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <div className={"flex"}>
                        <div className="w-2 h-2 rounded-full bg-[#808081]"></div>
                      </div>
                      <div className="text-[12px] font-medium text-[#808081]">Total</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Clients Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(Routes.agency.clients)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(Routes.agency.clients);
              }
            }}
            className="flex justify-between items-center rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white cursor-pointer transition-all hover:border-[#00b4b8] hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#00b4b8]/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#10141a]">CLIENTS</h2>
                <p className="text-[16px] font-medium text-[#808081] mt-1">
                  Breakdown of Clients registered to this agency.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {isLoadingClients ? (
                <>
                  {[["#0EAF52", "Active"], ["#2B82FF", "Inactive"], ["#808081", "Total"]].map(([color, label]) => (
                    <div key={label} className="text-center">
                      <Skeleton className="w-12 mx-auto mb-2 h-9" />
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <div className="text-[12px] font-medium text-[#808081]">{label}</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-[32px] font-bold text-[#10141a]">{clients.active}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <div className={"flex"}>
                        <div className="w-2 h-2 rounded-full bg-[#0EAF52]"></div>
                      </div>
                      <div className="text-[12px] font-medium text-[#808081]">Active</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[32px] font-bold text-[#10141a]">{clients.inactive}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <div className={"flex"}>
                        <div className="w-2 h-2 rounded-full bg-[#2B82FF]"></div>
                      </div>
                      <div className="text-[12px] font-medium text-[#808081]">Inactive</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[32px] font-bold text-[#10141a]">{clients.total}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <div className={"flex"}>
                        <div className="w-2 h-2 rounded-full bg-[#808081]"></div>
                      </div>
                      <div className="text-[12px] font-medium text-[#808081]">Total</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row - Shifts and Billing */}
        <div>
          {/* <div className={"space-y-6"}> */}
            {/* Shifts Chart */}
            {/* <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#10141a]">SHIFTS</h2>
                  <p className="text-[12px] font-medium text-[#808081] mt-1">
                    Total number of shifts happening last 7 days
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center justify-end w-full">
                      <span className="text-[11px] font-medium text-[#808081] text-right">Scheduled</span>
                      <div className="w-3 h-3 rounded-sm bg-[#2B82FF] ml-2"></div>
                    </div>
                    <div className="flex items-center justify-end w-full">
                      <span className="text-[11px] font-medium text-[#808081]">Visit Completed</span>
                      <div className="w-3 h-3 rounded-sm bg-[#84B7FF] ml-2"></div>
                    </div>
                    <div className="flex items-center justify-end w-full">
                      <span className="text-[11px] font-medium text-[#808081]">Ongoing</span>
                      <div className="w-3 h-3 rounded-sm bg-[#808081] ml-2"></div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => navigate(Routes.agency.shifts)}
                      className="cursor-pointer bg-white p-2 rounded-full text-[#00b4b8] hover:text-[#0090a8] transition-colors"
                    >
                      <ArrowUpRight color={"#000000"} className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 h-[200px] relative">
                {isLoadingShifts ? (
                  [55, 80, 40, 90, 65, 45, 70].map((h, i) => (
                    <div key={i} className="flex flex-col items-center justify-end flex-1 h-full gap-2">
                      <Skeleton className="w-full rounded-t-md" style={{ height: `${h}%` }} />
                      <Skeleton className="w-8 h-3" />
                      <Skeleton className="h-2.5 w-10" />
                    </div>
                  ))
                ) : transformedShifts.map((shift, index) => (
                  <div
                    key={`${shift.day}-${index}`}
                    className="relative flex flex-col items-center justify-end flex-1 h-full"
                    onMouseEnter={() => setHoveredShift(index)}
                    onMouseLeave={() => setHoveredShift(null)}
                  >
                    {/* Tooltip */}
                    {/* {hoveredShift === index && (
                      <div
                        className="absolute z-10 px-4 py-3 mb-2 text-black bg-white rounded shadow-lg bottom-full whitespace-nowrap">
                        <div className="mb-1 text-sm font-semibold">Report
                          for {shift.date}</div>
                        <div className={"flex justify-between items-center gap-4"}>
                          <div className="text-[#808081] text-xs">Scheduled</div>
                          <div className="text-xs font-semibold text-black">{shift.scheduled}</div>
                        </div>
                        <div className={"flex justify-between items-center gap-4"}>
                          <div className="text-[#808081] text-xs">Visit Completed</div>
                          <div className="text-xs font-semibold text-black">{shift.completed}</div>
                        </div>
                        {shift.ongoing > 0 && (
                          <div className={"flex justify-between items-center gap-4"}>
                            <div className="text-[#808081] text-xs">Ongoing</div>
                            <div className="text-xs font-semibold text-black">{shift.ongoing}</div>
                          </div>
                        )}
                      </div>
                    )} */}

                    {/* <div className="relative flex items-end justify-center w-full h-full gap-1"> */}
                      {/* Scheduled Bar
                      {shift.scheduled > 0 && <div
                        className="flex-1 text-center text-white text-sm rounded-t-md rounded-b-md bg-[#2B82FF] transition-all duration-300"
                        style={{
                          height: `${(shift.scheduled / maxShiftValue) * 100}%`,
                          minHeight: shift.scheduled ? "30px" : "0px",
                        }}
                      >{shift.scheduled}
                      </div>} */}
                      {/* Completed Bar */}
                      {/* {shift.completed > 0 && <div
                        className="flex-1 text-center text-white text-sm rounded-t-md rounded-b-md bg-[#84B7FF] transition-all duration-300"
                        style={{
                          height: `${(shift.completed / maxShiftValue) * 100}%`,
                          minHeight: shift.completed ? "30px" : "0px",
                        }}
                      >{shift.completed}
                      </div>} */}
                      {/* Ongoing Bar */}
                      {/* {shift.ongoing > 0 && <div
                        className="flex-1 text-center text-white text-sm rounded-t-md rounded-b-md bg-[#808081] transition-all duration-300"
                        style={{
                          height: `${(shift.ongoing / maxShiftValue) * 100}%`,
                          minHeight: shift.ongoing ? "30px" : "0px",
                        }}
                      >{shift.ongoing}
                      </div>}
                    </div> */}
                    {/* Day Label */}
                    {/* <div className="text-[11px] font-medium text-[#808081] mt-2">{shift.day}</div>
                    <div className="text-[10px] font-medium text-[#b2b2b3]">{shift.date}</div>
                  </div>
                ))}
              </div>
            // </div> */
            // } 
            }

            {/* Compliance Alerts */}
            {/* <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white"> */}
              {/* <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#10141a]">Compliance Alerts</h2>
                  <p className="text-[12px] font-medium text-[#808081] mt-1">
                    Number of Expiring Or Missing Documents
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => navigate(Routes.agency.complianceAlerts)}
                    className="cursor-pointer bg-white p-2 rounded-full text-[#00b4b8] hover:text-[#0090a8] transition-colors"
                  >
                    <ArrowUpRight color={"#000000"} className="w-5 h-5" />
                  </button>
                </div>
              </div> */}

              {/* Table */}
              {/* <div className="space-y-3">
                {isLoadingAlerts ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-4 px-4 border-b border-[#e5e5e6] last:border-0">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="w-32 h-4" />
                          <Skeleton className="w-20 h-3" />
                        </div>
                        <div className="flex-1 px-4 space-y-2">
                          <Skeleton className="w-16 h-3" />
                          <Skeleton className="w-24 h-4" />
                        </div>
                        <div className="flex-1 px-4 space-y-2">
                          <Skeleton className="w-12 h-3" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                        <Skeleton className="w-24 h-8 rounded-full shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : complianceAlerts.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-[14px] text-[#808081]">No expired documents found.</p>
                  </div>
                ) : (
                  complianceAlerts.map((alert) => (
                    <div key={alert.id}
                         className="flex items-center justify-between py-4 px-4 rounded-lg hover:bg-[#f9fafb] transition-colors border-b border-[#e5e5e6] last:border-0">
                      <div className="flex-1">
                        <div
                          className="text-[14px] font-semibold text-[#10141a]">{alert.title}</div>
                        <div
                          className="text-[12px] font-medium text-[#808081]">{alert.subtitle}</div>
                      </div>
                      <div className="flex-1 px-4">
                        <div className="text-[14px] text-[#808081]">Document</div>
                        <div
                          className="text-[14px] font-medium text-[#10141a]">{alert.document}</div>
                      </div>
                      <div className="flex-1 px-4">
                        <div className="text-[14px] text-[#808081]">Status</div>
                        <div
                          className="text-[14px] font-medium text-[#d53411]">{alert.status}</div>
                      </div>
                      <div className="shrink-0">
                        <button
                          className="cursor-pointer px-4 py-2 text-[13px] rounded-full bg-[#B2B2B31A] border border-[#B2B2B3] font-semibold text-[#565656] transition-colors">
                          Send Alert
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div> */}

              {/* Pagination */}
              {/* Pagination */}
              {/* {complianceAlerts.length > itemsPerPage && (
                <div className="flex items-center justify-center gap-2 mt-6">
              <span className={"text-[18px]"}>
                {currentPage}/<span className={"text-[#808081]"}>
                  {Math.ceil(complianceAlerts.length / itemsPerPage)}
                </span>
              </span>
                  <div
                    className={`rounded-full p-2 cursor-pointer ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : "bg-white"}`}
                    onClick={() => currentPage > 1 && setCurrentPage(prev => prev - 1)}
                  >
                    <ChevronLeft size={14} className={currentPage === 1 ? "text-gray-400" : ""} />
                  </div>
                  <div
                    className={`rounded-full p-2 cursor-pointer ${currentPage * itemsPerPage >= complianceAlerts.length ? "opacity-50 cursor-not-allowed" : "bg-white"}`}
                    onClick={() => currentPage * itemsPerPage < complianceAlerts.length && setCurrentPage(prev => prev + 1)}
                  >
                    <ChevronRight size={14}
                                  className={currentPage * itemsPerPage >= complianceAlerts.length ? "text-gray-400" : ""} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div> */}
      </div>

      <div className="space-y-6 ">
        {/* Analytics header */}
        <div className="no-print">
          <OperationReportHeader
            title="Agency Operation Overview"
            dateRange={dateRange}
            onOpenDateModal={() => setShowDateModal(true)}
            onActionSelect={(action) => {
              switch (action) {
                case "Download report":
                  downloadPDF();
                  break;
                case "Share report":
                  setShowShareModal(true);
                  break;
                default:
                  break;
              }
            }}
          />
        </div>

        {/* Analytics report */}
        <div id="analytics-report" className="space-y-6 print-container">
          <div className="print-card">
            <OverviewCards data={summary?.overview} isLoading={isAnalyticsLoading} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="print-card">
              <ComplianceInsights
                total={summary?.complianceInsights.total}
                data={summary?.complianceInsights.breakdown}
                isLoading={isAnalyticsLoading}
                startDate={dateRange.startDate || undefined}
                endDate={dateRange.endDate || undefined}
              />
            </div>

            <div className="print-card">
              <RiskTrends
                data={summary?.riskTrends}
                isLoading={isAnalyticsLoading}
                startDate={dateRange.startDate || undefined}
                endDate={dateRange.endDate || undefined}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="print-card">
              <OperationalEfficiency
                metrics={summary ? buildOperationalMetrics(summary.operationalEfficiency) : undefined}
                isLoading={isAnalyticsLoading}
                startDate={dateRange.startDate || undefined}
                endDate={dateRange.endDate || undefined}
              />
            </div>

            <div className="print-card">
              <BillingSummary
                total={summary?.billingSummary.total}
                data={summary?.billingSummary.breakdown}
                isLoading={isAnalyticsLoading}
                startDate={dateRange.startDate || undefined}
                endDate={dateRange.endDate || undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Date modal */}
      <AnalyticsDateRangeModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        values={dateRange}
        onChange={setDateRange}
        onApply={(values) => {
          setDateRange(values);
        }}
      />

      {/* Share modal */}
      <ShareReportModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
    </div>
  );
}
