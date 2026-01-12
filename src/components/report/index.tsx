import React, {useState} from "react";
import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/utils/auth";
import {UserType} from "@/utils/auth/types";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import CustomDatePicker from "@/components/ui/datePicker";


interface GenerateReportFormProps {
  reportType: string;
  noteType: string;
  status: string;
  startDate: string;
  endDate: string;
  isLifetime: boolean;
}

export default function GenerateReport() {
  const [formData, setFormData] = useState<GenerateReportFormProps>({
    reportType: "",
    noteType: "",
    status: "all",
    startDate: "",
    endDate: "",
    isLifetime: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const {user} = useAuth();
  const navigate = useNavigate();

  const handleChange = (
    name: string,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  };

  const statusTypes = [
    {id: "all", label: "All"},
    {id: "active", label: "Active"},
    {id: "inactive", label: "Inactive"},
  ];

  const shiftsTypes = [
    {id: "all", label: "All"},
    {id: "ongoing", label: "Ongoing"},
    {id: "scheduled", label: "Scheduled"},
    {id: "finished", label: "Finished"},
  ];

  const notesFilters = [
    {id: "all", label: "All"},
  ];

  const notesTypes = [
    {
      id: "community-based",
      title: "Community Based / Individual Supports",
    },
    {
      id: "community-inclusion",
      title: "Community Inclusion Services – Activities Log",
    },
    {
      id: "day-habilitation",
      title: "Day Habilitation Services – Activities Log",
    },
    {
      id: "prevocational-training",
      title: "Prevocational Training Services – Activities Log",
    },
    {
      id: "supported-employment-intervention",
      title: "Supported Employment Services – Intervention Plan and Service Log",
    },
    {
      id: "supported-employment-pre",
      title: "Supported Employment Services – Pre‐Employment Service Log",
    },
    {
      id: "respite-log",
      title: "Respite Log",
    },
  ];

  const filters: Record<string, any> = {
    "clients": statusTypes,
    "dsp": statusTypes,
    "shifts": shiftsTypes,
    "notes": notesFilters,
  }

  const reportFilterTypes = formData.reportType ? filters[formData.reportType as keyof typeof filters] : [];

  const userRoutesPrefix: Record<string, string> = {
    [UserType.SUPER_ADMIN]: "superAdmin",
    [UserType.AGENCY]: "agency",
  }

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const userRoutes: any = Routes[userRoutesPrefix[user?.userType as UserType] as keyof typeof Routes];
      navigate(userRoutes.reports[formData.reportType]);
    }, 3000);
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Report
        </h1>
      </div>
      <div className={"mt-8"}>
        <h1 className={"font-semibold"}>Generate Report</h1>
        <div className={"mt-3 space-y-8"}>
          <div className={"max-w-[70%] flex items-center gap-3"}>
            <div className={"w-[50%]"}>
              <Label htmlFor="reportType" className="mb-2 text-[14px] font-medium text-[#10141a]">
                Select Report
              </Label>
              <Select
                value={formData.reportType}
                onValueChange={(value) => handleChange("reportType", value)}
              >
                <SelectTrigger
                  className={cn("w-full")}
                >
                  <SelectValue placeholder="Select role"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"clients"}>Clients</SelectItem>
                  <SelectItem value={"dsp"}>DSPs</SelectItem>
                  <SelectItem value={"shifts"}>Shifts</SelectItem>
                  <SelectItem value={"notes"}>Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.reportType === "notes" && <div className={"w-[50%]"}>
                <Label htmlFor="reportType" className="mb-2 text-[14px] font-medium text-[#10141a]">
                    Select Note
                </Label>
                <Select
                    value={formData.noteType}
                    onValueChange={(value) => handleChange("noteType", value)}
                >
                    <SelectTrigger
                        className={cn("w-full")}
                    >
                        <SelectValue placeholder="Select note"/>
                    </SelectTrigger>
                    <SelectContent>
                      {notesTypes.map((noteType) =>
                        <SelectItem value={noteType.id}>{noteType.title}</SelectItem>
                      )}
                    </SelectContent>
                </Select>
            </div>}
            <div>
              <div className="flex items-center gap-3 mt-8">
                {reportFilterTypes.map((reportType: { id: string, label: string }) => (
                  <button
                    key={reportType.id}
                    type="button"
                    onClick={() => handleChange("status", reportType.id)}
                    className={`px-6 py-2 rounded text-[14px] font-medium transition-colors ${
                      reportType.id === formData.status
                        ? "bg-[#00b4b8] text-white"
                        : "bg-transparent border border-[#808081] text-[#10141a] hover:bg-[#d0d0d0]"
                    }`}
                  >
                    {reportType.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={"max-w-[70%]"}>
            <h4 className={"font-semibold mb-4"}>Time Period</h4>
            <div className={"flex items-center gap-3"}>
              <div>
                <Label htmlFor="reportType" className="mb-2 text-[14px] font-medium text-[#10141a]">
                  From
                </Label>
                <CustomDatePicker
                  date={formData.startDate ? new Date(formData.startDate) : null}
                  placeholder={"Select date"}
                  setDate={(e) => handleChange("startDate", e?.toISOString()?.slice(0, 10) ?? "")}
                  className={cn(
                    "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                  )}
                />
              </div>
              <div>
                <Label htmlFor="reportType" className="mb-2 text-[14px] font-medium text-[#10141a]">
                  To
                </Label>
                <CustomDatePicker
                  date={formData.endDate ? new Date(formData.endDate) : null}
                  placeholder={"Select date"}
                  setDate={(e) => handleChange("endDate", e?.toISOString()?.slice(0, 10) ?? "")}
                  className={cn(
                    "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                  )}
                />
              </div>
              <div className={"mt-7"}>
                <Button
                  onClick={() => handleChange("isLifetime", !formData.isLifetime)}
                  className={cn(
                    "px-6 py-2 rounded text-[14px] hover:text-white hover:border-[#00b4b8] font-medium transition-colors bg-transparent border border-[#808081] text-[#10141a]",
                    formData.isLifetime && "bg-[#00b4b8] text-white border-none"
                  )}
                >
                  Lifetime
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={"mt-8"}>
        <Button
          onClick={handleGenerateReport}
          disabled={!formData.reportType}
          className={"px-8 py-2 rounded-lg text-[14px] font-medium transition-colors bg-[#2b82ff] text-white hover:bg-[#1e6fd9]"}
        >
          Generate
        </Button>
      </div>

      {/* Generating Modal */}
      {isGenerating && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"/>

          {/* Modal */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
            <div
              className="backdrop-blur bg-white border border-white/30 rounded-[30px] p-5 pb-[38px] pt-5 w-[379px] flex flex-col items-center gap-6">
              {/* Success Icon with Loading Spinner */}
              <div className="relative w-[100px] h-[100px]">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-4 border-[#f0faf4]"/>

                {/* Green circle with spinner */}
                <div
                  className="absolute left-[14.5px] top-[14px] w-[72px] h-[72px] bg-[#0eaf52] rounded-full flex items-center justify-center">
                  {/* Loading spinner */}
                  <div
                    className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                </div>
              </div>

              {/* Text Content */}
              <div className="flex flex-col gap-3 items-center text-center w-full">
                <p className="text-[32px] font-semibold text-[#10141a] leading-[1]">
                  Please wait
                </p>
                <p className="text-[16px] font-medium text-[#808081] leading-[1.6]">
                  Please wait while we generate your report
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}