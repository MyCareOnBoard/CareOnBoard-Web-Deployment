import UserLevelsTab from "@/pages/agency/agency-settings/components/UserLevelsTab";

export default function StaffManagementPage() {
  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="text-[40px] font-semibold leading-[1.4] text-[#10141a]">Staff Management</h1>
        <p className="mt-1 text-[14px] text-[#808081]">
          Add staff and manage their access to the agency dashboard.
        </p>
      </div>
      <UserLevelsTab />
    </div>
  );
}
