import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { isValid, parseISO } from "date-fns";
import { ChevronRight, GraduationCap, Search, UserCheck, UserX } from "lucide-react";
import { DSP } from "./types";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { roleLabel, staffLabels } from "@/lib/roleLabel";
import type { RootState } from "@/store/redux/store";
import { cn } from "@/lib/utils";
import { AgencyProgressBar, AgencyStatCard } from "@/components/agency/AgencyShell";
import { WorkforceIcon } from "@/components/agency/AgencyIcons";
import {
  AgencyListCard, AgencyPagination, AgencyPerson, AgencyPill, AgencySegmented, agencyField, agencyRowLink,
  agencyTd, agencyTh, agencyTheadRow, agencyTr, type AgencyTone,
} from "@/components/agency/AgencyListKit";

interface DSPStats {
  active: number;
  inactive: number;
  total: number;
}

interface DSPListProps {
  dsps: DSP[];
  stats: DSPStats;
  isLoading?: boolean;
}

const STATUS_TONE: Record<string, AgencyTone> = {
  active: "green",
  pending: "amber",
  suspended: "red",
  inactive: "grey",
};

const statusLabel = (status?: string) => status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";

function hireDateLabel(hireDate?: string) {
  const date = parseISO(hireDate?.slice(0, 10) || "");
  return isValid(date) ? date.toLocaleDateString() : "—";
}

export function DSPList({ dsps, stats, isLoading }: DSPListProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const effectiveTypes = selectedMode ? [selectedMode] : user?.agency?.supportedClientTypes;
  const labels = staffLabels(effectiveTypes);
  const navigateToProfile = (dsp: DSP) => {
    navigate(Routes.agency.dspProfile.replace(":dspId", dsp.id));
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "All">("active");
  const [page, setPage] = useState(1);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const pageSize = 8;

  const { active: activeCount, inactive: inactiveCount, total: totalCount } = stats;
  const trainedCount = dsps.filter((dsp) => (dsp.totalTrainings ?? 0) > 0 && (dsp.completedTrainings ?? 0) >= (dsp.totalTrainings ?? 0)).length;
  const trainedPercent = totalCount ? Math.round((trainedCount / totalCount) * 100) : 0;

  const filteredDsps = dsps.filter(dsp => {
    const matchesSearch = dsp.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" ||
      (statusFilter === "active" && dsp.status === "active") ||
      (statusFilter === "inactive" && (dsp.status === "inactive" || dsp.status === "suspended" || dsp.status === "pending"));
    return matchesSearch && matchesStatus;
  });

  const searchSuggestions = searchQuery.trim()
    ? dsps.filter(dsp =>
        dsp.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const totalPages = Math.ceil(filteredDsps.length / pageSize);
  const paginatedDsps = filteredDsps.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchSuggestions(true);
  };

  const handleSuggestionClick = (dsp: DSP) => {
    setSearchQuery(dsp.fullName);
    setShowSearchSuggestions(false);
  };

  const count = (value: number) => (isLoading ? "—" : value);

  return (
    <>
      {/* Overview */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AgencyStatCard icon={UserCheck} label="Active" value={count(activeCount)} footnote={`${labels.nounPlural} with an active account.`} />
        <AgencyStatCard icon={UserX} label="Inactive" value={count(inactiveCount)} footnote="Inactive, suspended or pending accounts." />
        <AgencyStatCard icon={WorkforceIcon} label="Total" value={count(totalCount)} footnote={`Every ${labels.noun} in this program.`} />
        <AgencyStatCard icon={GraduationCap} label="Training complete" value={count(trainedCount)}
          footnote={isLoading ? undefined : `Of ${totalCount} ${labels.nounPlural} (${trainedPercent}%).`}>
          <AgencyProgressBar value={isLoading ? 0 : trainedPercent} label="Share with all training complete" />
        </AgencyStatCard>
      </div>

      {/* Directory */}
      <AgencyListCard label={`${labels.noun} directory`} className="mt-5">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <AgencySegmented
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "active", label: "Active", count: isLoading ? undefined : activeCount },
              { value: "inactive", label: "Inactive", count: isLoading ? undefined : inactiveCount },
            ]}
          />
          <div className="relative w-full lg:w-[300px]" ref={searchRef}>
            <label className="relative block">
              <span className="sr-only">Search {labels.nounPlural}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b737a]" />
              <input
                type="search"
                placeholder="Search name"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setShowSearchSuggestions(true)}
                className={cn(agencyField, "h-10 pl-10")}
              />
            </label>

            {/* Search suggestions */}
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-[12px] border border-[#e4e7ea] bg-white p-1.5 shadow-[0_8px_24px_rgba(16,20,26,0.08)] dark:border-white/10 dark:bg-[#1b232b]">
                {searchSuggestions.map((dsp) => (
                  <button
                    key={dsp.id}
                    type="button"
                    onClick={() => handleSuggestionClick(dsp)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-2.5 py-2 text-left text-[14px] transition-colors hover:bg-[#f4f6f7] dark:hover:bg-white/5"
                  >
                    <AgencyPerson name={dsp.fullName} imageUrl={dsp.profilePicture} detail={`${roleLabel({ role: dsp.role })} · ${dsp.status}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div aria-hidden="true" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[62px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
          </div>
        ) : filteredDsps.length === 0 ? (
          <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
            <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
              {searchQuery.trim() ? `No ${labels.nounPlural} match your search` : `No ${statusFilter === "inactive" ? "inactive" : "active"} ${labels.nounPlural}`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>{labels.noun}</th>
                  <th scope="col" className={agencyTh}>Clients</th>
                  <th scope="col" className={agencyTh}>Training</th>
                  <th scope="col" className={agencyTh}>Status</th>
                  <th scope="col" className={agencyTh}>Hire date</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {paginatedDsps.map((dsp) => {
                  const done = dsp.completedTrainings || 0;
                  const total = dsp.totalTrainings || 0;
                  return (
                    <tr key={dsp.id} className={agencyTr}>
                      <td className={agencyTd}>
                        <button type="button" onClick={() => navigateToProfile(dsp)}
                          className="cursor-pointer rounded-[8px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]">
                          <AgencyPerson name={dsp.fullName} detail={dsp.email} imageUrl={dsp.profilePicture} />
                        </button>
                      </td>
                      <td className={cn(agencyTd, "tabular-nums")}>{dsp.clients || 0}</td>
                      <td className={agencyTd}>
                        <span className="block text-[13px] font-medium tabular-nums">{done}/{total}</span>
                        <AgencyProgressBar value={total ? (done / total) * 100 : 0} label={`${dsp.fullName} training ${done} of ${total}`} className="mt-1.5 w-[90px]" />
                      </td>
                      <td className={agencyTd}>
                        <AgencyPill tone={STATUS_TONE[dsp.status ?? ""] ?? "grey"}>{statusLabel(dsp.status)}</AgencyPill>
                      </td>
                      <td className={cn(agencyTd, "whitespace-nowrap")}>{hireDateLabel(dsp.hireDate)}</td>
                      <td className={cn(agencyTd, "text-right")}>
                        <button type="button" onClick={() => navigateToProfile(dsp)} className={agencyRowLink}
                          aria-label={`Details for ${dsp.fullName}`}>
                          Details<ChevronRight aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredDsps.length > 0 && (
          <AgencyPagination
            summary={`Showing ${paginatedDsps.length} of ${filteredDsps.length} ${filteredDsps.length === 1 ? labels.noun : labels.nounPlural}`}
            page={page}
            pages={totalPages}
            onPage={setPage}
          />
        )}
      </AgencyListCard>
    </>
  );
}
