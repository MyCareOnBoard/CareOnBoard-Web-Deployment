import type { SuperAdminStaffDetail } from "@/lib/api/staff-directory";

export function StaffProfileTab({ staff }: { staff: SuperAdminStaffDetail }) {
  const fields = [
    ["Email", staff.profile.email],
    ["Phone", staff.profile.phone],
    ["Role", staff.profile.role],
    ["Status", staff.profile.status],
    ["Agency", staff.profile.agency.name],
    ["Address", staff.profile.address],
    ["Date of birth", staff.profile.dateOfBirth ? new Date(staff.profile.dateOfBirth).toLocaleDateString() : null],
    ["Hire date", staff.profile.hireDate ? new Date(staff.profile.hireDate).toLocaleDateString() : null],
    ["Available for work", staff.profile.workAvailability == null ? null : staff.profile.workAvailability ? "Yes" : "No"],
    ["Created", staff.profile.createdAt ? new Date(staff.profile.createdAt).toLocaleDateString() : null],
  ].filter((field): field is [string, string] => Boolean(field[1]));

  return (
    <section className="mt-8 rounded-xl border border-[#e2e6e6] bg-white p-5 sm:p-6" aria-label="Staff profile">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="text-xs font-medium text-[#808081]">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold capitalize text-[#10141a]">{value}</p>
          </div>
        ))}
      </div>
      {staff.profile.bio ? <div className="mt-6 border-t pt-5"><p className="text-xs font-medium text-[#808081]">Bio</p><p className="mt-1 whitespace-pre-wrap text-sm text-[#343a3d]">{staff.profile.bio}</p></div> : null}
    </section>
  );
}
