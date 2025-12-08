import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ClearanceItem {
  name: string;
  progress: number;
  status: "approved" | "pending" | "cancelled";
}

export function ClearanceAndHiring() {
  const items: ClearanceItem[] = [
    { name: "DR Brooklyn Simmons", progress: 60, status: "approved" },
    { name: "DR Brooklyn Simmons", progress: 60, status: "approved" },
    { name: "DR Brooklyn Simmons", progress: 60, status: "approved" },
    { name: "DR Brooklyn Simmons", progress: 60, status: "approved" },
    { name: "DR Brooklyn Simmons", progress: 60, status: "approved" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-teal-100 text-teal-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusButtonColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500 hover:bg-green-600 text-white";
      case "pending":
        return "bg-teal-500 hover:bg-teal-600 text-white";
      case "cancelled":
        return "bg-red-500 hover:bg-red-600 text-white";
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Clearance & Hiring Toggle
          </h2>
          <p className="text-sm text-gray-600">
            These are your Pending Hiring Approvals
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{item.name}</p>
              <div className="flex gap-2 mt-2">
                <div className="h-2 bg-teal-500 rounded-full" style={{ width: `${item.progress}%` }}></div>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <Badge className={getStatusColor(item.status)}>
                {item.status === "approved"
                  ? "Approve"
                  : item.status === "pending"
                    ? "Pending"
                    : "Cancel"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-6 gap-2">
        <span className="text-sm text-gray-600">1/8</span>
        <button className="text-gray-400 hover:text-gray-600">←</button>
        <button className="text-gray-400 hover:text-gray-600">→</button>
      </div>
    </Card>
  );
}
