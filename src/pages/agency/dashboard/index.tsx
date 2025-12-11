import React, {useState} from "react";
import {ChevronRight, ArrowUpRight, ChevronLeft} from "lucide-react";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {
  useGetExpiredDocumentsQuery
} from "@/pages/agency/compliance-alerts/api";
import {useAuth} from "@/utils/auth";
import {useGetClientStatsQuery, useGetDSPStatsQuery, useGetShiftStatsQuery} from "@/pages/agency/dashboard/api";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";

export default function AgencyDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const shiftsData = [
    {day: "SUN", scheduled: 0, completed: 0, date: "5 January"},
    {day: "MON", scheduled: 0, completed: 0, date: "6 January"},
    {day: "TUE", scheduled: 0, completed: 0, date: "7 January"},
    {day: "WED", scheduled: 0, completed: 0, date: "8 January"},
    {day: "THUR", scheduled: 0, completed: 0, date: "9 January"},
    {day: "FRI", scheduled: 0, completed: 0, date: "10 January"},
    {day: "SAT", scheduled: 0, completed: 0, date: "11 January"},
  ];

  const [hoveredShift, setHoveredShift] = useState<number | null>(null);
  const {data: expiredDocsData, isLoading: isLoadingAlerts} = useGetExpiredDocumentsQuery(user?.agencyId, {
    skip: !user?.agencyId,
    refetchOnMountOrArgChange: true
  });
  const expiredDocuments = expiredDocsData?.data || [];

  const {data: clientStatsData} = useGetClientStatsQuery(user?.agencyId, {
    skip: !user?.agencyId,
    refetchOnMountOrArgChange: true
  });
  const clients = clientStatsData?.stats || {active: 0, inactive: 0, total: 0};

  const {data: dspStatsData} = useGetDSPStatsQuery(user?.agencyId, {
    skip: !user?.agencyId,
    refetchOnMountOrArgChange: true
  });
  const dspStats = dspStatsData?.stats || {active: 0, inactive: 0, total: 0};

  const {data: shiftStatsData} = useGetShiftStatsQuery(
    {agencyId: user?.agencyId || '', range: 'lastWeek'},
    {skip: !user?.agencyId, refetchOnMountOrArgChange: true}
  )
  const shifts = shiftStatsData?.buckets || [];

  // Transform shifts data to dashboard format
  const transformedShifts = shifts.length > 0 ? shifts.map(bucket => {
    const date = new Date(bucket.date);
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return {
      day: dayNames[date.getDay()],
      scheduled: bucket.scheduled,
      completed: bucket.completed,
      date: `${date.getDate()} ${monthNames[date.getMonth()]}`
    };
  }) : shiftsData;

  // Transform to dashboard format and limit to first 10
  const complianceAlerts = expiredDocuments.slice(0, 10).map(doc => ({
    id: doc.id,
    title: doc.employee.fullName,
    subtitle: doc.employee.role,
    document: doc.documentType,
    status: `Expired (${doc.daysExpired} day${doc.daysExpired !== 1 ? 's' : ''} ago)`,
  }));

  const maxShiftValue = Math.max(...transformedShifts.map((d) => Math.max(d.scheduled, d.completed)));

  const copyToClipboard = async () => {
    const domain = window.location.origin;
    const url = `${domain}/${user?.agencyId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard!");
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Dashboard
        </h1>
        <Button
          onClick={copyToClipboard}
          className="bg-[#00b4b8] text-white px-4 py-2 rounded-full"
        >Copy DSP Agency URL</Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Row - DSP and Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* DSP Card */}
          <div
            className="flex justify-between items-center rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#10141a]">DSP</h2>
                <p className="text-[16px] font-medium text-[#808081] mt-1">
                  DSP overview who are managing shifts for clients
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
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
            </div>
          </div>

          {/* Clients Card */}
          <div
            className="flex justify-between items-center rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#10141a]">CLIENTS</h2>
                <p className="text-[16px] font-medium text-[#808081] mt-1">
                  Clients overview who are registered from a 3rd party
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
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
            </div>
          </div>
        </div>

        {/* Bottom Row - Shifts and Billing */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <div className={"space-y-6"}>
            {/* Shifts Chart */}
            <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#10141a]">SHIFTS</h2>
                  <p className="text-[12px] font-medium text-[#808081] mt-1">
                    Total number of shifts happening last 7 days
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col items-center">
                    <div className="flex justify-end items-center w-full">
                                            <span
                                              className="text-[11px] font-medium text-[#808081] text-right">Scheduled</span>
                      <div className="w-3 h-3 rounded-sm bg-[#2B82FF] ml-2"></div>
                    </div>
                    <div className="flex justify-end items-center w-full">
                                            <span
                                              className="text-[11px] font-medium text-[#808081]">Visit Completed</span>
                      <div className="w-3 h-3 rounded-sm bg-[#2B82FF]/40 ml-2"></div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => navigate(Routes.agency.shifts)}
                      className="cursor-pointer bg-white p-2 rounded-full text-[#00b4b8] hover:text-[#0090a8] transition-colors"
                    >
                      <ArrowUpRight color={"#000000"} className="w-5 h-5"/>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 h-[200px] relative">
                {transformedShifts.map((shift, index) => (
                  <div
                    key={`${shift.day}-${index}`}
                    className="flex flex-col items-center flex-1 h-full justify-end relative"
                    onMouseEnter={() => setHoveredShift(index)}
                    onMouseLeave={() => setHoveredShift(null)}
                  >
                    {/* Tooltip */}
                    {hoveredShift === index && (
                      <div
                        className="rounded absolute bottom-full mb-2 bg-white text-black px-4 py-3 whitespace-nowrap z-10 shadow-lg">
                        <div className="mb-1 text-sm font-semibold">Report
                          for {shift.date}</div>
                        <div className={"flex justify-between items-center gap-4"}>
                          <div className="text-[#808081] text-xs">Scheduled</div>
                          <div className="text-black text-xs">{shift.scheduled}</div>
                        </div>
                        <div className={"flex justify-between items-center gap-4"}>
                          <div className="text-[#808081] text-xs">Visit Completed</div>
                          <div className="text-black text-xs">{shift.completed}</div>
                        </div>
                      </div>
                    )}

                    <div className="relative w-full flex gap-1 items-end justify-center h-full">
                      {/* Scheduled Bar */}
                      {shift.scheduled > 0 && <div
                        className="flex-1 text-center text-white text-sm rounded-t-[6px] rounded-b-[6px] bg-[#2B82FF] transition-all duration-300"
                        style={{
                          height: `${(shift.scheduled / maxShiftValue) * 100}%`,
                          minHeight: shift.scheduled ? "30px" : "0px",
                        }}
                      >{shift.scheduled}
                      </div>}
                      {/* Completed Bar */}
                       {shift.completed > 0 && <div
                        className="flex-1 text-center text-white text-sm rounded-t-[6px] rounded-b-[6px] bg-[#2B82FF]/40 transition-all duration-300"
                        style={{
                          height: `${(shift.completed / maxShiftValue) * 100}%`,
                          minHeight: shift.completed ? "30px" : "0px",
                        }}
                      >{shift.completed}
                      </div>}
                    </div>
                    {/* Day Label */}
                    <div className="text-[11px] font-medium text-[#808081] mt-2">{shift.day}</div>
                    <div className="text-[10px] font-medium text-[#b2b2b3]">{shift.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Alerts */}
            <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
              <div className="flex items-center justify-between mb-6">
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
                    <ArrowUpRight color={"#000000"} className="w-5 h-5"/>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="space-y-3">
                {isLoadingAlerts ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-[14px] text-[#808081]">Loading compliance alerts...</p>
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
                      <div className="flex-shrink-0">
                        <button
                          className="cursor-pointer px-4 py-2 text-[13px] rounded-full bg-[#B2B2B31A] border border-[#B2B2B3] font-semibold text-[#565656] transition-colors">
                          Send Alert
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {/* Pagination */}
              {complianceAlerts.length > itemsPerPage && (
                <div className="flex items-center justify-center gap-2 mt-6">
              <span className={"text-[18px]"}>
                {currentPage}/<span className={"text-[#808081]"}>
                  {Math.ceil(complianceAlerts.length / itemsPerPage)}
                </span>
              </span>
                  <div
                    className={`rounded-full p-2 cursor-pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white'}`}
                    onClick={() => currentPage > 1 && setCurrentPage(prev => prev - 1)}
                  >
                    <ChevronLeft size={14} className={currentPage === 1 ? 'text-gray-400' : ''}/>
                  </div>
                  <div
                    className={`rounded-full p-2 cursor-pointer ${currentPage * itemsPerPage >= complianceAlerts.length ? 'opacity-50 cursor-not-allowed' : 'bg-white'}`}
                    onClick={() => currentPage * itemsPerPage < complianceAlerts.length && setCurrentPage(prev => prev + 1)}
                  >
                    <ChevronRight size={14}
                                  className={currentPage * itemsPerPage >= complianceAlerts.length ? 'text-gray-400' : ''}/>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing Approvals */}
          <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[16px] font-semibold text-[#10141a]">Billing Approvals</h2>
                <p className="text-[12px] font-medium text-[#808081] mt-1">
                  View Outstanding Billing Approvals
                </p>
              </div>
              <button className="text-[#00b4b8] hover:text-[#0090a8] transition-colors">
                <ChevronRight className="w-5 h-5"/>
              </button>
            </div>
            <div className="text-center py-8">
              <p className="text-[14px] font-medium text-[#808081]">No pending approvals</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
