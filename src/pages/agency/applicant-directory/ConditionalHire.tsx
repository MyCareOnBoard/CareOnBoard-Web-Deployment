import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ConditionalHire() {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="p-8">
        <div className="flex items-start justify-between">
          <div className="flex gap-6">
            <div className="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600 font-bold text-3xl">BD</span>
            </div>
            <div>
              <Badge className="bg-green-100 text-green-800 mb-3">
                Applicant
              </Badge>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                DR.Brooklyn Simmons
              </h1>
              <p className="text-gray-600 mb-4">
                2208 Baker Street • 22 October 1998
              </p>
              <div className="flex gap-3">
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  📞 Call
                </Button>
                <Button variant="outline">💬 Chat</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6 flex-wrap">
          <Badge className="bg-gray-200 text-gray-700">
            Profile & Pre-Screening
          </Badge>
          <Badge className="bg-teal-100 text-teal-800">Documents</Badge>
          <Badge className="bg-teal-100 text-teal-800">Conditional Hire</Badge>
          <Badge className="bg-red-100 text-red-800">Final Agency Review</Badge>
        </div>
      </Card>

      {/* Conditional Hire Letter Section */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Conditional Hire
        </h2>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-4">
            <span className="text-2xl flex-shrink-0">✅</span>
            <div>
              <h3 className="font-semibold text-green-900 mb-1">
                Conditional Hire Letter Signed
              </h3>
              <p className="text-sm text-green-700">Signed on 18 January 2022</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-gray-600"
            >
              View Signed Letter
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
