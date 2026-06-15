import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StaffMember } from "./types";

interface StaffSelectProps {
  value: string;
  onChange: (value: string) => void;
  staff: StaffMember[];
  label?: string;
  placeholder?: string;
  includeAll?: boolean;
}

const StaffSelect: React.FC<StaffSelectProps> = ({
  value,
  onChange,
  staff,
  label = "Staff Member",
  placeholder = "Select staff member",
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
          {includeAll && <SelectItem value={ALL_VALUE}>All staff members</SelectItem>}
          {staff.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StaffSelect;
