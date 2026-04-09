interface ComplianceCardProps {
  title: string;
  subtitle: string;
  doctorCount: number;
  appointmentCount: number;
}

export function ComplianceCard({
  title,
  subtitle,
  doctorCount,
  appointmentCount,
}: ComplianceCardProps) {
  return (
    <div className="bg-white rounded-[16px] border border-[#e5e5e6] p-5">
      <h3 className="text-sm font-semibold text-[#10141a] mb-1">{title}</h3>
      <p className="text-xs text-[#808081] mb-6">{subtitle}</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-2xl font-bold text-[#10141a]">{doctorCount}</span>
          </div>
          <p className="text-xs text-[#808081]">Total doctors</p>
          <p className="text-xs text-[#808081]">Total doctors who has collaborated</p>
        </div>

        <div>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-2xl font-bold text-[#10141a]">{appointmentCount}</span>
          </div>
          <p className="text-xs text-[#808081]">Appointments</p>
          <p className="text-xs text-[#808081]">33% 1bps increased from yesterday</p>
        </div>
      </div>
    </div>
  );
}
