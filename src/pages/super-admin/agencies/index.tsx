import React, {useState, useMemo} from "react";
import {Plus, Building2, Search, ArrowUpRight} from "lucide-react";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {useListAllAgenciesQuery} from "./api";

type FilterStatus = "all" | "active" | "inactive" | "pending";

export default function AgenciesPage() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {data: agencies, isLoading: loadingAgencies} = useListAllAgenciesQuery({});


  const filteredAgencies = useMemo(() => {
    if (!agencies?.agencies) return [];
    
    let filtered = agencies.agencies;
    
    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter(agency => agency.status === filterStatus);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agency => 
        agency.name.toLowerCase().includes(query) ||
        agency.email.toLowerCase().includes(query) ||
        agency.id.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [agencies, filterStatus, searchQuery]);

  const viewAgency = (agencyId: string) => {
      navigate(Routes.superAdmin.agencyView.replace(":id", agencyId))
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Agencies
        </h1>
        <button
          onClick={() => navigate(Routes.superAdmin.addAgency)}
          className="cursor-pointer backdrop-blur-[22px] bg-[#00b4b8] flex items-center gap-[13px] justify-center px-4 py-3 rounded-[60px] text-white font-semibold text-[14px] leading-[1.4] hover:bg-[#009da1] transition-colors"
        >
          <Plus className="w-5 h-5"/>
          Add Agency
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`backdrop-blur-[22px] flex items-center justify-center px-4 py-[9px] rounded-[60px] font-semibold text-[14px] leading-[1.4] transition-colors ${
              filterStatus === "all"
                ? "bg-[#00b4b8] text-white"
                : "border border-[#808081] text-[#808081] font-medium"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`backdrop-blur-[22px] flex items-center justify-center px-4 py-[9px] rounded-[60px] font-semibold text-[14px] leading-[1.4] transition-colors ${
              filterStatus === "active"
                ? "bg-[#00b4b8] text-white"
                : "border border-[#808081] text-[#808081] font-medium"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus("inactive")}
            className={`backdrop-blur-[22px] flex items-center justify-center px-4 py-[9px] rounded-[60px] font-semibold text-[14px] leading-[1.4] transition-colors ${
              filterStatus === "inactive"
                ? "bg-[#00b4b8] text-white"
                : "border border-[#808081] text-[#808081] font-medium"
            }`}
          >
            Inactive
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`backdrop-blur-[22px] flex items-center justify-center px-4 py-[9px] rounded-[60px] font-semibold text-[14px] leading-[1.4] transition-colors ${
              filterStatus === "pending"
                ? "bg-[#00b4b8] text-white"
                : "border border-[#808081] text-[#808081] font-medium"
            }`}
          >
            Pending
          </button>
        </div>

        {/* Search Input */}
        <div className="backdrop-blur bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] flex items-center gap-[10px] h-[38px] pl-3 pr-4 py-[10px] rounded-[60px] w-[320px]">
          <Search className="w-6 h-6 text-[#808081]" />
          <input
            type="text"
            placeholder="Search Agency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-[#10141a] placeholder:text-[#808081]"
          />
        </div>
      </div>

      {/* Agency Cards Grid */}
      <div className="flex flex-wrap gap-3">
        {loadingAgencies ? (
          <div className="py-12 w-full text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
            <p className="mt-4 text-sm text-[#808081]">Loading super admin users...</p>
          </div>
        ) : filteredAgencies.length > 0 ? (
          filteredAgencies.map((agency) => (
            <div
              key={agency.id}
              className="backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] flex flex-col items-start p-5 rounded-[20px] w-[379px]"
            >
              <div className="flex items-center gap-4 w-full">
                {/* Agency Image/Logo */}
                <div className="relative h-[110px] w-[96px] shrink-0">
                  <div 
                    className="absolute h-[110px] w-[96px] rounded-[12px] flex items-center justify-center"
                    style={{ backgroundColor: agency.primaryColor || '#D9D9D9' }}
                  >
                  </div>
                  {/* Status Badge */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 bottom-[-8px] flex items-center justify-center px-3 py-1 rounded-[200px] text-[12px] font-medium ${
                      agency.status === "active"
                        ? "bg-[#f0faf4] border-[0.5px] border-[#0eaf52] text-[#0eaf52]"
                        : agency.status === "inactive"
                        ? "bg-[#fef3f2] border-[0.5px] border-[#f04438] text-[#f04438]"
                        : "bg-[#fffaeb] border-[0.5px] border-[#f79009] text-[#f79009]"
                    }`}
                  >
                    {agency.status.charAt(0).toUpperCase() + agency.status.slice(1)}
                  </div>
                </div>

                {/* Agency Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[20px] leading-[1.6] text-[#10141a] truncate">
                    {agency.name}
                  </h3>
                  <p className="font-medium text-[12px] text-[#808081] truncate mt-1">
                    {agency.primaryColor}
                  </p>
                </div>
              </div>

              {/* Admin Info */}
              <div className="w-full mt-4 pt-4 border-t border-[rgba(255,255,255,0.3)]">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-[#10141a] truncate">
                      {agency.owner?.fullName || "Admin User"}
                    </p>
                    <p className="font-medium text-[12px] text-[#808081] truncate">
                      Admin
                    </p>
                  </div>
                  <button 
                    onClick={() => viewAgency(agency.id)}
                    className="cursor-pointer backdrop-blur-sm bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] flex items-center justify-center p-3 rounded-[200px] shrink-0 hover:bg-[rgba(255,255,255,0.7)] transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4 text-[#10141a]" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="w-full text-center py-12">
            <Building2 className="w-16 h-16 text-[#808081] mx-auto mb-4"/>
            <p className="text-[#808081]">
              {searchQuery ? "No agencies found matching your search" : "No agencies found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
