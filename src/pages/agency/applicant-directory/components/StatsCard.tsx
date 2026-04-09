interface StatsCardProps {
  title: string;
  value: number;
  subtitle: string;
  status?: "active" | "completed" | "missed";
}

export function StatsCard({ title, value, subtitle, status }: StatsCardProps) {
  const statusColors = {
    active: "bg-[#10b981]",
    completed: "bg-[#2563eb]",
    missed: "bg-[#ef4444]",
  };

  return (
    <div className="bg-white rounded-[16px] border border-[#e5e5e6] p-5">
      <h3 className="text-sm text-[#808081] mb-3">{title}</h3>
      <div className="flex items-end gap-3 mb-3">
        <span className="text-[40px] font-bold leading-none text-[#10141a]">{value}</span>
        {status && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`w-2 h-2 rounded-full ${statusColors[status]}`}></div>
            <span className="text-xs text-[#808081] capitalize">{status}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-[#808081]">{subtitle}</p>
    </div>
  );
}
