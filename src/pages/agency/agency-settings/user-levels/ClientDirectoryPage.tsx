import { useState } from "react";
import { useSelector } from "react-redux";
import { Search, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { staffLabels } from "@/lib/roleLabel";
import type { RootState } from "@/store/redux/store";

interface Client {
  id: string;
  name: string;
  avatar?: string;
  status: "Active" | "Inactive";
  dsp: string;
  accountCreated: string;
}

export default function ClientDirectoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const effectiveTypes = selectedMode ? [selectedMode] : user?.agency?.supportedClientTypes;
  const labels = staffLabels(effectiveTypes);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"Active" | "Inactive">("Active");

  // Mock data - replace with actual API call
  const [clients] = useState<Client[]>([
    {
      id: "1",
      name: "DR Brooklyn Simmons",
      status: "Active",
      dsp: "4D",
      accountCreated: "12 January 2025",
    },
    {
      id: "2",
      name: "DR Brooklyn Simmons",
      status: "Active",
      dsp: "4D",
      accountCreated: "12 January 2025",
    },
    {
      id: "3",
      name: "DR Brooklyn Simmons",
      status: "Active",
      dsp: "4D",
      accountCreated: "12 January 2025",
    },
    {
      id: "4",
      name: "DR Brooklyn Simmons",
      status: "Active",
      dsp: "4D",
      accountCreated: "12 January 2025",
    },
    {
      id: "5",
      name: "DR Brooklyn Simmons",
      status: "Active",
      dsp: "4D",
      accountCreated: "12 January 2025",
    },
    {
      id: "6",
      name: "DR Brooklyn Simmons",
      status: "Active",
      dsp: "4D",
      accountCreated: "12 January 2025",
    },
    {
      id: "7",
      name: "DR Brooklyn Simmons",
      status: "Active",
      dsp: "4D",
      accountCreated: "12 January 2025",
    },
    {
      id: "8",
      name: "DR Brooklyn Simmons",
      status: "Active",
      dsp: "4D",
      accountCreated: "12 January 2025",
    },
  ]);

  const filteredClients = clients.filter(
    (client) =>
      client.status === activeTab &&
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="flex flex-col gap-4 shadow-sm p-6 bg-[#f7f7f7] rounded-[16px] mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#10141a]">Client Overview</h2>
          <p className="mt-1 text-[12px] text-[#808081]">Overview of clients assigned to {labels.noun}</p>
        </div>
        <div className="text-right">
          <div className="text-[32px] font-bold text-[#10141a]">35</div>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <div className="w-2 h-2 bg-[#3B82F6] rounded-full"></div>
            <span className="text-[12px] text-[#808081]">Total</span>
          </div>
        </div>
      </div>

    <div className="shadow-sm p-6 space-y-5 bg-[#f7f7f7] rounded-[16px]">
     
      {/* Section Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-[#10141a]">Client Directory</h3>
          <p className="mt-1 text-[12px] text-[#808081]">The List Of Clients</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-[#a0a0a1] transform -translate-y-1/2 left-3 top-1/2" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 h-[40px] rounded-full border-[#e0e0e0] text-[14px] sm:w-64"
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

      {/* Clients List */}
      <div className="space-y-3">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between gap-6 p-4 bg-[#fafafa] rounded-[12px]"
          >
            {/* First Column: Avatar and Name */}
            <div className="flex items-center gap-4 min-w-[180px]">
              <img
                src={client.avatar || "/placeholder-avatar.jpg"}
                alt={client.name}
                className="object-cover w-[48px] h-[48px] rounded-full shrink-0"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=random`;
                }}
              />
              <h3 className="font-semibold text-[14px] text-[#10141a]">{client.name}</h3>
            </div>

            {/* Second Column: Status Badge */}
            <div className="min-w-[80px]">
              <Badge
                className={
                  client.status === "Active"
                    ? "bg-[#D1FAE5] text-[#059669] text-[11px] px-2 py-0.5 rounded-[30px] font-normal border-0"
                    : "bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 rounded-[4px] font-normal border-0"
                }
              >
                {client.status}
              </Badge>
            </div>

            {/* Third Column: DSP */}
            <div className="min-w-[80px]">
              <p className="text-[11px] text-[#808081]">{labels.noun}</p>
              <p className="font-semibold text-[14px] text-[#10141a]">{client.dsp}</p>
            </div>

            {/* Fourth Column: Account Created */}
            <div className="min-w-[140px]">
              <p className="text-[11px] text-[#808081]">Account Created</p>
              <p className="text-[14px] font-semibold text-[#10141a]">{client.accountCreated}</p>
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
