import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Department } from "./types";

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  departments: Department[];
  label?: string;
  placeholder?: string;
  includeAll?: boolean;
}

const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  value,
  onChange,
  departments,
  label = "Department",
  placeholder = "Select department",
  includeAll = false,
}) => {
  const ALL_VALUE = "__all__";

  const handleValueChange = (selectedValue: string) => {
    onChange(selectedValue === ALL_VALUE ? "" : selectedValue);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeAll && <SelectItem value={ALL_VALUE}>All departments</SelectItem>}
          {departments.map((department) => (
            <SelectItem key={department.value} value={department.value}>
              {department.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DepartmentSelect;
