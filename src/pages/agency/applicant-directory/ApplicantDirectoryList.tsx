import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Applicant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  stages: {
    label: string;
    completed: boolean;
  }[];
}

export function ApplicantDirectoryList() {
  const applicants: Applicant[] = [
    {
      id: "1",
      name: "DR Brooklyn Simmons",
      role: "Applicant",
      stages: [
        { label: "Profile & Pre-Screening", completed: true },
        { label: "Documents", completed: true },
        { label: "Conditional Hire", completed: true },
        { label: "Final Agency Review", completed: false },
      ],
    },
    {
      id: "2",
      name: "DR Brooklyn Simmons",
      role: "Applicant",
      stages: [
        { label: "Profile & Pre-Screening", completed: true },
        { label: "Documents", completed: true },
        { label: "Conditional Hire", completed: false },
        { label: "Final Agency Review", completed: false },
      ],
    },
    {
      id: "3",
      name: "DR Brooklyn Simmons",
      role: "Applicant",
      stages: [
        { label: "Profile & Pre-Screening", completed: true },
        { label: "Documents", completed: true },
        { label: "Conditional Hire", completed: true },
        { label: "Final Agency Review", completed: true },
      ],
    },
    {
      id: "4",
      name: "DR Brooklyn Simmons",
      role: "Applicant",
      stages: [
        { label: "Profile & Pre-Screening", completed: true },
        { label: "Documents", completed: true },
        { label: "Conditional Hire", completed: true },
        { label: "Final Agency Review", completed: false },
      ],
    },
    {
      id: "5",
      name: "DR Brooklyn Simmons",
      role: "Applicant",
      stages: [
        { label: "Profile & Pre-Screening", completed: true },
        { label: "Documents", completed: true },
        { label: "Conditional Hire", completed: true },
        { label: "Final Agency Review", completed: true },
      ],
    },
    {
      id: "6",
      name: "DR Brooklyn Simmons",
      role: "Applicant",
      stages: [
        { label: "Profile & Pre-Screening", completed: true },
        { label: "Documents", completed: true },
        { label: "Conditional Hire", completed: true },
        { label: "Final Agency Review", completed: false },
      ],
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Applicant Directory
          </h2>
          <p className="text-sm text-gray-600">
            These are your Pending Hiring Approvals
          </p>
        </div>
        <Input
          placeholder="Search"
          className="w-64"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          Today
        </Button>
        <Button
          variant="outline"
        >
          This Week
        </Button>
        <Button
          variant="outline"
        >
          This month
        </Button>
      </div>

      <div className="space-y-3">
        {applicants.map((applicant) => (
          <div
            key={applicant.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold">BD</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{applicant.name}</p>
                <p className="text-xs text-gray-600">{applicant.role}</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap flex-1 justify-center">
              {applicant.stages.map((stage, index) => (
                <Badge
                  key={index}
                  className={
                    stage.completed
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-600"
                  }
                >
                  {stage.label}
                </Badge>
              ))}
            </div>

            <Button
              variant="outline"
              className="ml-4 text-gray-600"
            >
              Details
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-6 gap-2">
        <span className="text-sm text-gray-600">1/6</span>
        <button className="text-gray-400 hover:text-gray-600">←</button>
        <button className="text-gray-400 hover:text-gray-600">→</button>
      </div>
    </Card>
  );
}
