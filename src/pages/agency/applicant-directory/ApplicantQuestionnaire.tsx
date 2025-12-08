import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ApplicantQuestionnaire() {
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
          <Badge className="bg-teal-100 text-teal-800">
            Profile & Pre-Screening
          </Badge>
          <Badge className="bg-gray-200 text-gray-700">Documents</Badge>
          <Badge className="bg-gray-200 text-gray-700">Conditional Hire</Badge>
          <Badge className="bg-red-100 text-red-800">Final Agency Review</Badge>
        </div>
      </Card>

      {/* Questionnaire Section */}
      <Card className="p-8">
        <div className="space-y-6">
          {/* Personal Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <p className="text-gray-900 font-medium">Female</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <p className="text-gray-900 font-medium">kathryn.murp@example.com</p>
          </div>

          {/* Questions */}
          <div className="border-t pt-6">
            <div>
              <p className="text-gray-700 font-medium mb-3">
                Do you have a High School Diploma or GED?
              </p>
              <p className="text-gray-900 font-semibold">Yes</p>
            </div>
          </div>

          <div>
            <p className="text-gray-700 font-medium mb-3">
              Are you legally eligible to work in the U.S ?
            </p>
            <p className="text-gray-900 font-semibold">Yes</p>
          </div>

          <div>
            <p className="text-gray-700 font-medium mb-3">
              Have you ever been convicted of a disqualifying offense under NJ law?
            </p>
            <p className="text-gray-900 font-semibold">Yes</p>
          </div>

          <div>
            <p className="text-gray-700 font-medium mb-3">
              Have you ever been convicted of a disqualifying offense under NJ law?
            </p>
            <p className="text-gray-900 font-semibold">Yes</p>
          </div>

          {/* Resume */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <span className="font-medium text-gray-700">Resume</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-teal-600 border-teal-200"
              >
                View Resume
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
