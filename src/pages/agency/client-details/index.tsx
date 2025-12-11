import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  const totalPages = Math.max(1, Math.ceil(shifts.length / itemsPerPage));
  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return shifts.slice(start, start + itemsPerPage);
  }, [shifts, currentPage]);

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
              "h-[36px] w-[80px] rounded-[60px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4]",
              activeTab === "activity"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#808081] text-[#10141a] opacity-60",
            ].join(" ")}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={[
              "h-[36px] w-[80px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4]",
              activeTab === "profile"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#808081] text-[#10141a] opacity-60",
            ].join(" ")}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={[
              "h-[36px] w-[100px] rounded-[200px] px-[16px] py-[8px] text-[12px] font-medium leading-[1.4]",
              activeTab === "documents"
                ? "bg-[#00b4b8] border border-[#00b4b8] text-white"
                : "border border-[#808081] text-[#10141a] opacity-60",
            ].join(" ")}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab !== "activity" ? (
        <div className="mt-8 rounded-[20px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] p-6">
          <p className="text-[14px] font-medium text-[#808081]">
            {activeTab === "profile" ? "Profile" : "Documents"} content coming soon.
          </p>
        </div>
      ) : (
        <>
          {/* Shifts Header */}
          <div className="mt-8">
            <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
              Shifts
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              These Are Ongoing Shift Of {client.name}
            </p>
          </div>

          {/* Shift Rows */}
          <div className="mt-4 space-y-3">
            {paginatedShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
              >
                <Avatar className="w-[52.5px] h-[60px] rounded-lg shrink-0">
                  {shift.avatarUrl && (
                    <AvatarImage
                      src={shift.avatarUrl}
                      alt={shift.dspName}
                      className="w-full h-full object-cover aspect-auto rounded-lg"
                    />
                  )}
                  <AvatarFallback className="w-full h-full rounded-lg bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                    {shift.dspName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-1 items-center gap-16 min-w-0">
                  <div className="flex flex-col gap-1 min-w-[160px]">
                    <p className="text-[16px] font-semibold leading-[1.6] text-black truncate">
                      {shift.dspName}
                    </p>
                    <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      {shift.dspRole}
                    </p>
                  </div>

                  <div className="w-[75px] text-[14px] font-medium leading-[1.4]">
                    <p className="mb-0 text-[#808081]">Date</p>
                    <p className="text-[#10141a]">{shift.dateLabel}</p>
                  </div>

                  <div className="w-[180px] text-[14px] font-medium leading-[1.4]">
                    <p className="mb-0 text-[#808081]">Location</p>
                    <p className="text-[#10141a]">{shift.location}</p>
                  </div>

                  <p className="w-[95px] text-[14px] font-medium leading-[1.4] text-[#808081]">
                    Clocked In <span className="text-[#10141a]">{shift.clockedIn}</span>
                  </p>

                  <p className="w-[105px] text-[14px] font-medium leading-[1.4] text-[#808081]">
                    Clocked Out <span className="text-[#10141a]">{shift.clockedOut}</span>
                  </p>
                </div>

                <div className="bg-[rgba(178,178,179,0.1)] border-[#b2b2b3] border-[0.5px] border-solid rounded-[60px] px-[10px] py-[10px] flex items-center justify-center">
                  <span className="text-[12px] font-semibold leading-[normal] text-[#565656] whitespace-nowrap">
                    {shift.durationLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
              {Math.min(currentPage, totalPages)}
              <span className="text-[14px] text-[#808081]">/{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5 text-[#10141a]" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5 text-[#10141a]" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}


