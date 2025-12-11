import React, { useEffect, useMemo, useState } from "react";
import { Phone } from "lucide-react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityTab } from "@/pages/agency/client-details/tabs/ActivityTab";
import { ProfileTab } from "@/pages/agency/client-details/tabs/ProfileTab";
import { DocumentsTab } from "@/pages/agency/client-details/tabs/DocumentsTab";

type ClientDetailsTab = "activity" | "profile" | "documents";

export default function ClientDetailsPage() {
  const { clientId } = useParams();

  const [activeTab, setActiveTab] = useState<ClientDetailsTab>("activity");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [clientId]);

  const client = useMemo(
    () => ({
      id: clientId ?? "client-1",
      name: "DR.Brooklyn Simmons",
      roleLabel: "Client",
      ageLabel: "30 yrs old",
      avatarUrl: "https://i.pravatar.cc/220?img=12",
    }),
    [clientId]
  );

  const shifts = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, idx) => ({
        id: `shift-${idx + 1}`,
        dspName: "Nola Hawkins",
        dspRole: "DSP",
        avatarUrl: "https://i.pravatar.cc/120?img=47",
        dateLabel: "12 January",
        location: "221/B Baker Street",
        clockedIn: "2.30 PM",
        clockedOut: "4.30 PM",
        durationLabel: "2 hour session",
      })),
    []
  );

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Client Management
        </h1>
      </div>

      {/* Header Block */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-6">
          <Avatar className="w-[127px] h-[145px] rounded-[12px]">
            {client.avatarUrl && (
              <AvatarImage
                src={client.avatarUrl}
                alt={client.name}
                className="w-full h-full object-cover aspect-auto rounded-[12px]"
              />
            )}
            <AvatarFallback className="w-full h-full rounded-[12px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-xl font-semibold">
              {client.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[24px] font-semibold leading-[normal] text-[#10141a]">
                {client.name}
              </p>
              <div className="flex items-center gap-2 text-[12px] font-medium leading-[1.6] text-[#808081]">
                <span>{client.roleLabel}</span>
                <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#808081]" />
                <span>{client.ageLabel}</span>
              </div>
            </div>

            <Button className="h-[44px] w-[180px] rounded-[60px] px-[11px] py-[12px] gap-2">
              <Phone className="w-5 h-5 text-white" />
              Call
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={[
              "h-[36px] w-[80px] rounded-[60px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4] backdrop-blur-[22px] cursor-pointer",
              activeTab === "activity"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#b2b2b3] text-[#b2b2b3]",
            ].join(" ")}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={[
              "h-[36px] w-[80px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4] backdrop-blur-[22px] cursor-pointer",
              activeTab === "profile"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#b2b2b3] text-[#b2b2b3]",
            ].join(" ")}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={[
              "h-[36px] w-[100px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4] backdrop-blur-[22px] cursor-pointer",
              activeTab === "documents"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#b2b2b3] text-[#b2b2b3]",
            ].join(" ")}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "activity" && (
        <ActivityTab
          clientName={client.name}
          shifts={shifts}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
        />
      )}
      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "documents" && <DocumentsTab />}
    </div>
  );
}


