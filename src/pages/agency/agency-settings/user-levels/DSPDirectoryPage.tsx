import { useState } from "react";
import { Search, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";

interface DSPUser {
  id: string;
  name: string;
  avatar?: string;
  status: "Active" | "Inactive";
  clients: number;
  training: string;
}

export default function DSPDirectoryPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"Active" | "Inactive">("Active");

  // Mock data - replace with actual API call
  const [users] = useState<DSPUser[]>([
    {
      id: "1",
      name: "Nola Hawkins",
      status: "Active",
      clients: 40,
      training: "5(12)",
    },
    {
      id: "2",
      name: "Nola Hawkins",
      status: "Active",
      clients: 40,
      training: "5(12)",
    },
    {
      id: "3",
      name: "Nola Hawkins",
      status: "Active",
      clients: 40,
      training: "5(12)",
    },
    {
      id: "4",
      name: "Nola Hawkins",
      status: "Active",
      clients: 40,
      training: "5(12)",
    },
    {
      id: "5",
      name: "Nola Hawkins",
      status: "Active",
      clients: 40,
      training: "5(12)",
    },
    {
      id: "6",
      name: "Nola Hawkins",
      status: "Active",
      clients: 40,
      training: "5(12)",
    },
    {
      id: "7",
      name: "Nola Hawkins",
      status: "Active",
      clients: 40,
      training: "5(12)",
    },
    {
      id: "8",
      name: "Nola Hawkins",
      status: "Active",
      clients: 40,
      training: "5(12)",
    },
  ]);

  const activeUsers = users.filter((u) => u.status === "Active");
  const inactiveUsers = users.filter((u) => u.status === "Inactive");
  const totalUsers = users.length;

  const filteredUsers = users.filter(
    (user) =>
      user.status === activeTab &&
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* Header with Stats */}
      <div className="flex flex-col gap-4 shadow-sm p-6 bg-white rounded-[16px] mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#10141a]">DSP</h2>
          <p className="text-[12px] text-[#808081] mt-1">Overview of DSP</p>
        </div>
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="text-right">
            <div className="text-[32px] font-bold text-[#10141a]">23</div>
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
              <span className="text-[12px] text-[#808081]">Active</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[32px] font-bold text-[#10141a]">10</div>
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
              <span className="text-[12px] text-[#808081]">Inactive</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[32px] font-bold text-[#10141a]">33</div>
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#6B7280]"></div>
              <span className="text-[12px] text-[#808081]">Total</span>
            </div>
          </div>
        </div>
      </div>

    <div className="shadow-sm p-6 space-y-5 bg-white rounded-[16px]">
      {/* Section Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-[#10141a]">DSP Directory</h3>
          <p className="text-[12px] text-[#808081] mt-1">Number Of Dsps Working</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#a0a0a1]" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full h-[40px] rounded-full border-[#e0e0e0] text-[14px] sm:w-64"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveTab("Active")}
              className={
                activeTab === "Active"
                  ? "bg-[#00B4B8] hover:bg-[#009FA3] text-white flex-1 sm:flex-initial rounded-full h-[40px] px-5 text-[14px] font-medium"
                  : "bg-white hover:bg-gray-50 text-[#808081] border border-[#e0e0e0] flex-1 sm:flex-initial rounded-full h-[40px] px-5 text-[14px] font-medium"
              }
            >
              Active
            </Button>
            <Button
              onClick={() => setActiveTab("Inactive")}
              className={
                activeTab === "Inactive"
                  ? "bg-[#00B4B8] hover:bg-[#009FA3] text-white flex-1 sm:flex-initial rounded-full h-[40px] px-5 text-[14px] font-medium"
                  : "bg-white hover:bg-gray-50 text-[#808081] border border-[#e0e0e0] flex-1 sm:flex-initial rounded-full h-[40px] px-5 text-[14px] font-medium"
              }
            >
              Inactive
            </Button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between gap-6 p-4 bg-[#fafafa] rounded-[12px]"
          >
            {/* First Column: Avatar and Name */}
            <div className="flex items-center gap-4 min-w-[180px]">
              <img
                src={user.avatar || "/placeholder-avatar.jpg"}
                alt={user.name}
                className="w-[48px] h-[48px] shrink-0 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                }}
              />
              <h3 className="font-semibold text-[14px] text-[#10141a]">{user.name}</h3>
            </div>

            {/* Second Column: Status Badge */}
            <div className="min-w-[80px]">
              <Badge
                className={
                  user.status === "Active"
                    ? "bg-[#D1FAE5] text-[#059669] text-[11px] px-2 py-0.5 rounded-[4px] font-normal border-0"
                    : "bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 rounded-[4px] font-normal border-0"
                }
              >
                {user.status}
              </Badge>
            </div>

            {/* Third Column: Clients */}
            <div className="min-w-[80px]">
              <p className="text-[11px] text-[#808081]">Clients</p>
              <p className="font-semibold text-[14px] text-[#10141a]">{user.clients}</p>
            </div>

            {/* Fourth Column: Training */}
            <div className="min-w-[100px]">
              <p className="text-[11px] text-[#808081]">Training</p>
              <p className="font-semibold text-[14px] text-[#10141a]">{user.training}</p>
            </div>

            {/* Fifth Column: Actions */}
            <div className="flex items-center flex-shrink-0 gap-2">
              <Button className="bg-[#00B4B8] hover:bg-[#009FA3] text-white text-[12px] h-[32px] px-3 rounded-full font-normal">
                Assign Shift
              </Button>
              <Button className="bg-[#9ca3af] hover:bg-[#6b7280] text-white text-[12px] h-[32px] px-3 rounded-full font-normal border-0">
                Deactivate
              </Button>
              <Button
                className="bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] h-[32px] px-3 rounded-full font-normal border-0"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
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
    </div>
  );
}
