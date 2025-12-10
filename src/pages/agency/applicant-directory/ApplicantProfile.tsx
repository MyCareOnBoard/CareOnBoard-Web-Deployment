import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProcessStep {
  label: string;
  completed: boolean;
  icon: string;
}

export function ApplicantProfile() {
  const steps: ProcessStep[] = [
    { label: "Profile & Pre-Screening", completed: true, icon: "✓" },
    { label: "Documents", completed: true, icon: "✓" },
    { label: "Conditional Hire", completed: true, icon: "✓" },
    { label: "Final Agency Review", completed: true, icon: "✓" },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="p-8">
        <div className="flex items-start justify-between">
          <div className="flex gap-6">
            <div className="flex items-center justify-center flex-shrink-0 w-32 h-32 bg-gray-300 rounded-lg">
              <span className="text-3xl font-bold text-gray-600">BD</span>
            </div>
            <div>
              <Badge className="mb-3 text-green-800 bg-green-100">
                Applicant
              </Badge>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                DR.Brooklyn Simmons
              </h1>
              <p className="mb-4 text-gray-600">
                2208 Baker Street • 22 October 1998
              </p>
              <div className="flex gap-3">
                <Button className="text-white bg-blue-500 hover:bg-blue-600">
                  📞 Call
                </Button>
                <Button variant="outline">💬 Chat</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          {steps.map((step, index) => (
            <Badge
              key={index}
              className={
                step.completed
                  ? "bg-teal-100 text-teal-800"
                  : "bg-gray-200 text-gray-600"
              }
            >
              {step.label}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Authorizations Section */}
      <Card className="p-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Authorize Drug test appointment
        </h2>

        <div className="space-y-4">
          {[
            "Authorize Drug test appointment",
            "Authorize Fingerprint appointment",
            "Authorize Central Registry Check (Developmental Disabilities Abuse/Neglect Registry)",
            "Authorize CARI Check (Child Abuse Record Information, DCF)",
            "Authorize Sex Offender Registry Check (Megon's Law)",
            "Authorize OIG Exclusion List Check (LEIE)",
            "Authorize Health & TB Screening",
            "Authorize Reference Checks (Minimum 2. Non-Family)",
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
            >
              <p className="text-gray-700">{item}</p>
              <div className="flex gap-2">
                {index === 5 ? (
                  <>
                    <Badge className="text-red-800 bg-red-100">Disabled</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-600"
                    >
                      Send Alert
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge className="text-green-800 bg-green-100">
                      Enabled
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-teal-600"
                    >
                      Go to appointment booking
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-gray-600">
          Everything looks good! Send Official Hire letter!
        </p>

        <Button className="mt-6 text-white bg-teal-500 hover:bg-teal-600">
          Send Letter!
        </Button>
      </Card>
    </div>
  );
}
