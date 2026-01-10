import React, {useState} from "react";
import {useParams, useNavigate} from "react-router";
import {useGetSingleAgencyUsersQuery, useGetSummaryAgencyInfoQuery, useUpdateAgencyStatusMutation} from "./api";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Search, ChevronLeft, ChevronRight, Phone, MessageSquare, Edit} from "lucide-react";
import {Routes} from "@/routes/constants";
import {toast} from "sonner";
import {cn} from "@/lib/utils";
import {UserAvatar} from "@/components/DashboardHeader";

export default function AgencyView() {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"user" | "client">("user");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const {data: agency, isLoading, refetch} = useGetSummaryAgencyInfoQuery(id!, {
    refetchOnMountOrArgChange: true,
    skip: !id
  });
  const [updateAgencyStatus, {isLoading: updateAgencyStatusLoading}] = useUpdateAgencyStatusMutation();
  const {data: users = []} = useGetSingleAgencyUsersQuery(id!, {
    refetchOnMountOrArgChange: true,
    skip: !id
  });

  const totalPages = Math.ceil(users?.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const filteredUsers = searchQuery
    ? users?.filter(user => user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;
  const paginatedUsers = filteredUsers?.slice(startIndex, startIndex + itemsPerPage);

  const handleStatusUpdate = async () => {
    if (!agency) return;

    try {
      const {message} = await updateAgencyStatus({
        agencyId: agency?.agencyData.id,
        data: {
          status: agency.agencyData.status === "active" ? "inactive" : "active"
        }
      }).unwrap();
      toast.success(message);
      refetch();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#808081]">Loading agency...</p>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#808081]">Agency not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div>
              <h2 className="text-4xl font-bold text-[#10141a]">Agency Management</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Agency Info Card */}
            <div
              className="flex justify-between bg-transparent border border-[rgba(255,255,255,0.3)] rounded-[20px] p-6 mb-6">
              <div className="flex items-start gap-6">
                {/* Agency Logo */}
                <div
                  className="w-[140px] h-[140px] rounded-[12px] flex items-center justify-center shrink-0"
                  style={{backgroundColor: agency?.agencyData?.logo ? "transparent" : agency?.agencyData?.primaryColor}}
                >
                  {agency?.agencyData?.logo ? (
                    <img src={agency.agencyData?.logo} alt={agency.agencyData?.name}
                         className="w-full h-full object-cover rounded-[12px]"/>
                  ) : (
                    <div className="w-16 h-16 bg-black rounded-[8px]"/>
                  )}
                </div>

                {/* Agency Details */}
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-[#10141a] mb-2">{agency.agencyData?.name}</h3>
                  <div className="mb-4">
                    <div className={"flex items-center gap-2"}>
                      <p className="text-[14px] text-[#808081] font-medium">Admin:</p>
                      <p className="text-[14px] text-[#808081] font-medium">
                        {agency.user?.fullName}
                      </p>
                    </div>
                    <div className={"flex items-center gap-2"}>
                      <p className="text-[14px] text-[#808081] font-medium">Expires:</p>
                      <p className="text-[14px] text-[#808081] font-medium">February 2025</p>
                    </div>
                    <div className={"flex items-center gap-2"}>
                      <p className="text-[14px] text-[#808081] font-medium">Agency ID:</p>
                      <p className="text-[14px] text-[#808081] font-medium">{agency.agencyData?.id}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      className="min-w-[220px] bg-[#00b4b8] hover:bg-[#009da1] text-white px-6 py-3 rounded-[200px] font-semibold text-[14px] flex items-center gap-2">
                      <Phone className="w-5 h-5"/>
                      Call
                    </Button>
                    <Button
                      className="backdrop-blur-sm bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.7)] text-[#10141a] px-6 py-3 rounded-[200px] font-semibold text-[14px] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5"/>
                      Chat
                    </Button>
                    <Button
                      onClick={() => navigate(Routes.superAdmin.addAgency + `?agencyId=${agency.agencyData?.id}`)}
                      className="backdrop-blur-sm bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.7)] text-[#10141a] px-6 py-3 rounded-[200px] font-semibold text-[14px] flex items-center gap-2">
                      <Edit className="w-5 h-5"/>
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleStatusUpdate}
                disabled={updateAgencyStatusLoading}
                className={cn(
                  "text-white px-6 py-3 rounded-[60px] font-semibold text-[14px]",
                  agency?.agencyData?.status === "active" ? "bg-[#f04438] hover:bg-[#d63b2f]" : "bg-[#00b4b8] hover:bg-[#009da1]"
                )}
              >
                {!updateAgencyStatusLoading && (agency?.agencyData?.status === "active" ? "Deactivate Agency" : "Activate Agency")}
                {updateAgencyStatusLoading && "Updating..."}
              </Button>
            </div>

            {/* Activity Section */}
            <div className="mb-6 bg-[#FFFFFF4D] p-6 rounded-[20px] backdrop-blur-[20px]">
              <div className={"flex justify-between"}>
                <div>
                  <h3 className="text-[20px] font-medium text-[#10141a] mb-2">Global Access Given</h3>
                  <p className="text-[14px] text-[#808081] mb-4">These are the list of access given</p>
                </div>

                {/* Filter Tabs and Search */}
                <div className="flex items-center justify-between mb-4 gap-4">
                  <div className="relative w-[300px]">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808081]"
                    />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search"
                      className="h-[44px] pl-10 rounded-[60px] border-[#e5e5e6] bg-[rgba(255,255,255,0.5)] backdrop-blur-sm focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setFilterTab("user")}
                      className={`px-6 py-3 rounded-[60px] font-semibold text-[14px] transition-colors ${
                        filterTab === "user"
                          ? "bg-[#00b4b8] text-white hover:bg-[#009da1]"
                          : "backdrop-blur-sm bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] text-[#808081] hover:bg-[rgba(255,255,255,0.7)]"
                      }`}
                    >
                      User
                    </Button>
                    <Button
                      onClick={() => setFilterTab("client")}
                      className={`px-6 py-3 rounded-[60px] font-semibold text-[14px] transition-colors ${
                        filterTab === "client"
                          ? "bg-[#00b4b8] text-white hover:bg-[#009da1]"
                          : "backdrop-blur-sm bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] text-[#808081] hover:bg-[rgba(255,255,255,0.7)]"
                      }`}
                    >
                      Client
                    </Button>
                  </div>

                </div>
              </div>

              {/* User List */}
              <div className="space-y-3">
                {paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="border border-[rgba(255,255,255,0.3)] rounded-[20px] p-4 flex items-center gap-4 transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-[8px] shrink-0 overflow-hidden",
                        user.profilePictureUrl ? "bg-[#e0e0e0] w-[60px] h-[60px]" : ""
                      )}>
                      {user.profilePictureUrl ? (
                        <img src={user.profilePictureUrl} alt={user.fullName}
                             className="w-full h-full object-cover"/>
                      ) : (
                        <div>
                          <UserAvatar userName={user.fullName} userImage={user.profilePictureUrl}/>
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 flex items-center gap-16">
                      <div className="flex-1">
                        <p className="text-[16px] font-semibold text-[#10141a]">{user.fullName}</p>
                      </div>

                      {/* Status Badge */}
                      <div
                        className="bg-[rgba(14,175,82,0.05)] border-[0.5px] border-[#0eaf52] px-4 py-2 rounded-[60px]">
                        <p className="text-[12px] font-semibold text-[#0eaf52] capitalize">{user.status}</p>
                      </div>

                      {/* DSP Count */}
                      <div className="w-[75px]">
                        <p className="text-[14px] text-[#808081] font-medium">
                          {filterTab === "user" ? "Clients" : "DSPs"}
                        </p>
                        <p className="text-[14px] text-[#10141a] font-medium">{user.clients}</p>
                      </div>

                      {/* Account Created */}
                      {filterTab === "client" && <div className="w-[129px]">
                          <p className="text-[14px] text-[#808081] font-medium">Account
                              Created</p>
                          <p className="text-[14px] text-[#10141a] font-medium">{new Date(user.hireDate).toDateString()}</p>
                      </div>}

                      {filterTab === "user" && <div className="w-[129px]">
                          <p className="text-[14px] text-[#808081] font-medium">Training</p>
                          <p className="text-[14px] text-[#10141a] font-medium">{user.training.completed}({user.training.total})</p>
                      </div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <p className="text-[16px] font-medium text-[#10141a]">
                    {currentPage}
                    <span className="text-[14px] text-[#808081]">/{totalPages}</span>
                  </p>
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="bg-[rgba(255,255,255,0.5)] backdrop-blur border border-[rgba(255,255,255,0.3)] p-[6px] rounded-full hover:bg-[rgba(255,255,255,0.7)] disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#10141a]"/>
                  </Button>
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-[rgba(255,255,255,0.5)] backdrop-blur border border-[rgba(255,255,255,0.3)] p-[6px] rounded-full hover:bg-[rgba(255,255,255,0.7)] disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5 text-[#10141a]"/>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
