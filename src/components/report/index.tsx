import React, {useState} from "react";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";


interface GenerateReportFormProps {
  reportType: string;
  status: string;
  startDate: string;
  endDate: string;
  isLifetime: boolean;
}

export default function GenerateReport() {
  const [formData, setFormData] = useState<GenerateReportFormProps>({
    reportType: "",
    status: "all",
    startDate: "",
    endDate: "",
    isLifetime: false
  });

  const handleChange = (
    name: string,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  };

  const reportTypes = [
    {id: "all", label: "All"},
    {id: "active", label: "Active"},
    {id: "enterprise", label: "Inactive"},
  ];

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
                  <SelectItem value={"dsps"}>DSPs</SelectItem>
                  <SelectItem value={"shifts"}>Shifts</SelectItem>
                  <SelectItem value={"notes"}>Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center gap-3 mt-8">
                {reportTypes.map((reportType) => (
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
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  placeholder="Enter plan start date"
                  className={cn(
                    "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                  )}
                />
              </div>
              <div>
                <Label htmlFor="reportType" className="mb-2 text-[14px] font-medium text-[#10141a]">
                  To
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  placeholder="Enter plan start date"
                  className={cn(
                    "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
                  )}
                />
              </div>
              <div className={"mt-7"}>
                <Button
                  onClick={() => handleChange("isLifetime", !formData.isLifetime)}
                  className={cn(
                    "px-6 py-2 rounded text-[14px] font-medium transition-colors bg-transparent border border-[#808081] text-[#10141a]",
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
          onClick={() => {}}
          className={"px-8 py-2 rounded-lg text-[14px] font-medium transition-colors bg-[#00b4b8] text-white"}
        >
          Generate
        </Button>
      </div>
    </div>
  )
}