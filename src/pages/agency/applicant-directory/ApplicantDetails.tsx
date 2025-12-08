import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ApplicantDetails() {
  const documents = [
    { name: "Photo ID", icon: "📄" },
    { name: "Social Security Card", icon: "📄" },
    { name: "School Diploma Certificate", icon: "📄" },
    { name: "Extra Certificates", icon: "📄" },
    { name: "Filled I-9 form", icon: "📄" },
    { name: "Filled W-4 form", icon: "📄" },
  ];

  const references = [
    {
      name: "Nur Nabi Rahman",
      relation: "Colleague",
      mobile: "+8801913527742",
      email: "nurnabi@liroagency",
    },
    {
      name: "Nur Nabi Rahman",
      relation: "Colleague",
      mobile: "+8801913527742",
      email: "nurnabi@liroagency",
    },
  ];

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
          <Badge className="bg-blue-100 text-blue-800">Documents</Badge>
          <Badge className="bg-gray-200 text-gray-700">Conditional Hire</Badge>
          <Badge className="bg-red-100 text-red-800">Final Agency Review</Badge>
        </div>
      </Card>

      {/* Documents Section */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Uploaded Documents
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{doc.icon}</span>
                <span className="text-gray-700 font-medium">{doc.name}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-teal-600 border-teal-200"
              >
                View Document
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* References Section */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">References</h2>

        <div className="grid grid-cols-2 gap-6">
          {references.map((ref, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 rounded-lg"
            >
              <h3 className="font-bold text-gray-900 mb-3">{ref.name}</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Relation:</span> {ref.relation}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Mobile:</span> {ref.mobile}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Email:</span> {ref.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
