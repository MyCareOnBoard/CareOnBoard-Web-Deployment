import React, {useState} from "react";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";


interface GenerateReportFormProps {
  reportType: string;
}

export default function GenerateReport() {
  const [formData, setFormData] = useState<GenerateReportFormProps>({
    reportType: ""
  });

  const handleChange = (
    name: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      name: value
    }))
  };

  const reportTypes = [

  ]

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Report
        </h1>
      </div>
      <div className={"mt-8"}>
        <h1>Generate Report</h1>
        <div className={"mt-3"}>
          <div className={"max-w-[70%]"}>
            <div className={"w-full"}>
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
                  <SelectValue placeholder="Select time"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"monthly"}>Monthly</SelectItem>
                  <SelectItem value={"yearly"}>Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div></div>
        </div>
      </div>
    </div>
  )
}