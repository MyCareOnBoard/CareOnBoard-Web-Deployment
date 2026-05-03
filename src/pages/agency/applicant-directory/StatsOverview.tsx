import { Card } from "@/components/ui/card";

interface StatItem {
  label: string;
  value: number;
  description: string;
  status: "active" | "completed" | "missed";
}

export function StatsOverview() {
  const stats: StatItem[] = [
    {
      label: "Shifts",
      value: 42,
      description: "Weighted over-view of patient recovery and ongoing care",
      status: "active",
    },
    {
      label: "Shifts",
      value: 35,
      description: "Weighted over-view of patient recovery and ongoing care",
      status: "completed",
    },
    {
      label: "Shifts",
      value: 3,
      description: "Weighted over-view of patient recovery and ongoing care",
      status: "missed",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "missed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      case "missed":
        return "Missed";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">
                {stat.value}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{stat.description}</p>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(stat.status)}`}></div>
              <span className="text-xs font-medium text-gray-700">
                {getStatusLabel(stat.status)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            Compliance Scheduling Center
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            These are your Pending Hiring Approvals
          </p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total doctors</span>
              <span className="text-lg font-bold">2</span>
            </div>
            <p className="text-xs text-gray-500">
              Total doctors who have collaborated
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Appointments</h3>
          <p className="text-sm text-gray-600 mb-4">
            These are your Pending Hiring Approvals
          </p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Appointments</span>
              <span className="text-lg font-bold">2</span>
            </div>
            <p className="text-xs text-gray-500">
              33+ new scheduled item yesterday
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
