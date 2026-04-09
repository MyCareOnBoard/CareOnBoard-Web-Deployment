import { useState } from "react";
import { Search, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import AddNewUserModal from "./AddNewUserModal";

interface InternalUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accessLevels: string[];
}

export default function InternalUsersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  
  // Mock data - replace with actual API call
  const [users] = useState<InternalUser[]>([
    {
      id: "1",
      name: "Nur Nabi Rahman",
      email: "nurnabi@iotaq.agency",
      avatar: "",
      accessLevels: ["Scheduling", "Notes", "Analytics", "Reports"],
    },
     {
      id: "2",
      name: "Bob Agency",
      email: "bob@bob.agency",
      avatar: "",
      accessLevels: ["Notes", "Analytics", "Reports"],
    },
  ]);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(Routes.agency.agencySettings, { state: { activeTab: "userLevels" } })}
        className="flex items-center gap-2 text-gray-600 transition-colors cursor-pointer hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to User Levels</span>
      </button>
    
    <div className="shadow-sm p-4 bg-[#f7f7f7] rounded-[16px]">
        
      {/* Header with Search and New User Button */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-shrink-0">
          <h2 className="text-[24px] font-semibold text-[#10141a]">Internal Agency Users</h2>
          <p className="text-[12px] text-[#808081] mt-1">The List Of Internal Users</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#a0a0a1]" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-[40px] rounded-full bg-white border border-[#e0e0e0] text-[14px] placeholder:text-[#a0a0a1] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
            />
          </div>

          <Button
            onClick={() => setShowAddUserModal(true)}
            className="bg-[#00B4B8] hover:bg-[#009FA3] text-white h-[40px] px-5 rounded-full text-[14px] font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            New User
          </Button>
        </div>
      </div>

      {/* Users List */}
      <div className="mt-6 space-y-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between gap-6 p-5 bg-white rounded-[16px] border border-[#f0f0f0]"
          >
            {/* First Column: Avatar and Name */}
            <div className="flex items-center flex-shrink-0 min-w-0 gap-4">
              <div className="w-[50px] h-[50px] shrink-0 rounded-full bg-gradient-to-br from-[#8B5CF6] via-[#A855F7] to-[#EC4899] flex items-center justify-center text-white font-semibold text-[20px]">
                {user.name.charAt(0)}
              </div>
              <h3 className="font-semibold text-[16px] text-[#10141a] whitespace-nowrap">{user.name}</h3>
            </div>

            {/* Second Column: User Levels */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-black text-bold mb-1.5">User Levels</p>
              <div className="flex flex-wrap gap-1">
                {user.accessLevels.map((level) => (
                  <span
                    key={level}
                    className="text-[11px] px-2 py-1 bg-[#f5f5f5] text-[#525253] rounded-[4px] font-normal"
                  >
                    {level}
                  </span>
                ))}
              </div>
            </div>

            {/* Third Column: Action Buttons */}
            <div className="flex items-center flex-shrink-0 gap-2">
              <Button
                variant="outline"
                className="text-[#525253] border-[#e0e0e0] bg-white hover:bg-[#f9f9f9] text-[13px] h-[38px] px-4 rounded-full font-normal"
              >
                Reset Password
              </Button>
              <Button
                className="text-white bg-[#9ca3af] hover:bg-[#6b7280] border-0 text-[13px] h-[38px] px-4 rounded-full font-normal"
              >
                Deactivate
              </Button>
              <Button
                className="bg-[#EF4444] hover:bg-[#DC2626] text-white border-0 text-[13px] h-[38px] px-4 rounded-full font-normal"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete User
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="text-sm text-gray-600">1/3</span>
        <Button variant="outline" size="sm" disabled>
          &lt;
        </Button>
        <Button variant="outline" size="sm">
          &gt;
        </Button>
      </div>
    </div>
      {/* Add New User Modal */}
      <AddNewUserModal
        open={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
      />
    </div>
  );
}
