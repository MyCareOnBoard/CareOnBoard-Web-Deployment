import React, {useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Search} from "lucide-react";
import CustomDatePicker from "@/components/ui/datePicker";
import {cn} from "@/lib/utils";
import ClientReportModal from "@/components/report/clientReportModal";

interface ClientItem {
    id: string;
    name: string;
    image: string;
    documentType?: string;
    noteType?: string;
    timeAgo: string;
    details: string;
    agency: string;
    date?: string;
}


const reportsData: ClientItem[] = [
    {
        id: "1",
        name: "Dr. Brooklyn Simmons",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
        documentType: "I-9 Form",
        timeAgo: "3 days ago",
        details: "Details here",
        agency: "Iota Digital",
    },
    {
        id: "2",
        name: "Dr. Brooklyn Simmons",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
        documentType: "I-9 Form",
        timeAgo: "3 days ago",
        details: "Details here",
        agency: "Iota Digital",
    },
    {
        id: "3",
        name: "Dr. Brooklyn Simmons",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
        documentType: "I-9 Form",
        timeAgo: "3 days ago",
        details: "Details here",
        agency: "Iota Digital",
    },
    {
        id: "4",
        name: "Dr. Brooklyn Simmons",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
        documentType: "I-9 Form",
        timeAgo: "3 days ago",
        details: "Details here",
        agency: "Iota Digital",
    },
    {
        id: "5",
        name: "Dr. Brooklyn Simmons",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=5",
        documentType: "I-9 Form",
        timeAgo: "3 days ago",
        details: "Details here",
        agency: "Iota Digital",
    },
    {
        id: "6",
        name: "Dr. Brooklyn Simmons",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=6",
        documentType: "I-9 Form",
        timeAgo: "3 days ago",
        details: "Details here",
        agency: "Iota Digital",
    },
];



export default function DSPReport() {
    const [dates, setDates] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: null,
        endDate: null
    });

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [status, setStatus] = useState<"active" | "inactive" | "all">("all");

    const handleDateSelect = (
        name: string,
        value: Date | null
    ) => {
        setDates((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    const itemsPerPage = 8;
    const totalPages = Math.ceil(reportsData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = reportsData.slice(startIndex, startIndex + itemsPerPage);


    return (
        <div className="min-h-[calc(100vh-200px)] flex flex-col">
            <div className={"mb-8 flex items-center justify-between"}>
                <div>
                    <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
                        Report
                    </h1>
                </div>
                <div className={"flex gap-4"}>
                    <CustomDatePicker
                        placeholder={"Select start date"}
                        date={dates.startDate}
                        setDate={(e) => handleDateSelect("startDate", e)}
                    />
                    <CustomDatePicker
                        placeholder={"Select end date"}
                        date={dates.endDate}
                        setDate={(e) => handleDateSelect("endDate", e)}
                    />
                    <Button
                        className="h-[44px] rounded-[8px] bg-[#00b4b8] text-white"
                    >
                        Generate
                    </Button>
                </div>
            </div>
            <div className={"mt-3 bg-[#FFFFFF4D] rounded-xl p-4 flex-1 flex flex-col"}>
                <div className={"flex items-center justify-between"}>
                    <div>
                        <h4 className={"font-semibold text-lg"}>DSPs Report</h4>
                        <p className={"text-[#808081]"}>Report For DSPs</p>
                    </div>
                    <div className={"flex items-center gap-4"}>
                        <div className="relative w-[240px] animate-in fade-in slide-in-from-right-2 duration-300">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081] pointer-events-none z-10"/>
                            <Input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 h-10 border-0 rounded-full bg-[#f8f9fa] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
                            />
                        </div>
                        <Button
                            className={cn("h-[44px] rounded-3xl w-[80px]",
                                status === "all"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("all")}
                        >
                            All
                        </Button>
                        <Button
                            className={cn(
                                "h-[44px] rounded-3xl w-[80px]",
                                status === "active"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("active")}
                        >
                            Active
                        </Button>
                        <Button
                            className={cn(
                                "h-[44px] rounded-3xl w-[80px]",
                                status === "inactive"
                                    ? "bg-[#00b4b8] text-white"
                                    : "bg-transparent border border-[#808081] text-[#808081] hover:bg-[#d0d0d0]"
                            )}
                            onClick={() => setStatus("inactive")}
                        >
                            Inactive
                        </Button>
                    </div>
                </div>

                <div className="flex-1 mt-6 overflow-auto">
                    <div className="space-y-4">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between gap-4 backdrop-blur-[20px] bg-white/50 rounded-[20px] flex items-center p-4"
                                >
                                    {/* Avatar */}
                                    <div className={"flex gap-4 items-center"}>
                                        <div className="w-[52.5px] h-[60px] rounded-[8px] overflow-hidden flex-shrink-0">
                                            {item.image
                                                ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full h-full flex items-center justify-center bg-[#00b4b8] text-white rounded-[8px]">
                                                        {item.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                        </div>
                                        {/* Name */}
                                        <div>
                                            <p className="text-[16px] font-semibold leading-[1.6] text-black">
                                                {item.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-[#0EAF520D] border border-[#0EAF52] rounded-[60px] px-4 py-2">
                                        <p className="text-[12px] font-semibold text-[#0EAF52]">
                                            Active
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[14px] font-medium text-[#808081] mb-0">
                                            Clients
                                        </p>
                                        <p className="text-[14px] font-medium text-black">
                                            40
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[14px] font-medium text-[#808081] mb-0">
                                            Account Created
                                        </p>
                                        <p className="text-[14px] font-medium text-black">
                                            12 January 2025
                                        </p>
                                    </div>

                                    {/* Agency */}
                                    <div>
                                        <p className="text-[14px] font-medium text-[#808081] mb-0">
                                            Assigned Agency
                                        </p>
                                        <p className="text-[14px] font-medium text-black">
                                            {item.agency}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button
                                            className="bg-[#00b4b8] border border-[#00b4b8] text-white hover:bg-[#00b4b8] rounded-[60px] px-4 py-2 text-[12px] font-semibold h-auto min-w-[84px]"
                                            onClick={() => setIsModalOpen(true)}
                                        >
                                            View Documents
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center py-20">
                                <p className="text-[16px] text-[#808081]">No data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          {isModalOpen && <ClientReportModal onClose={() => setIsModalOpen(false)}/>}
        </div>
    )
}