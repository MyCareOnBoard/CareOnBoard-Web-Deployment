
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Phone, MessageSquare, ArrowLeft, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Routes } from "@/routes/constants";

export default function ApplicantProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeSection, setActiveSection] = useState<"profile" | "documents" | "conditional" | "final">("profile");

  // Mock data - replace with API call
  const applicant = {
    id: id || "1",
    name: "DR.Brooklyn Simmons",
    role: "Applicant",
    address: "2208 Baker Street",
    dob: "22 October 1998",
    gender: "Female",
    email: "kathry.murp@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
    profileScreening: true,
    documents: true,
    conditionalHire: true,
    finalAgencyReview: true,
    questionnaire: {
      highSchoolDiploma: "Yes",
      legallyEligible: "Yes",
      convicted: "Yes",
      convictedRepeat: "Yes",
    },
  };

  // Mock data for other tabs
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
      mobile: "+88019I3527742",
      email: "nurnabi@liroagency",
    },
    {
      name: "Nur Nabi Rahman",
      relation: "Colleague",
      mobile: "+88019I3527742",
      email: "nurnabi@liroagency",
    },
  ];
  const conditionalHireData = {
    letterSigned: true,
    signedDate: "18 January 2022",
  };
  const authorizations = [
    { name: "Authorize Drug test appointment", status: "Enabled", bookingLink: true },
    { name: "Authorize Fingerprint appointment", status: "Enabled", bookingLink: true },
    { name: "Authorize Central Registry Check (Developmental Disabilities Abuse/Neglect Registry)", status: "Enabled", bookingLink: true },
    { name: "Authorize CARI Check (Child Abuse Record Information, DCF)", status: "Enabled", bookingLink: true },
    { name: "Authorize Sex Offender Registry Check (Megan's Law)", status: "Enabled", bookingLink: true },
    { name: "Authorize OIG Exclusion List Check (LEIE)", status: "Disabled", bookingLink: false },
    { name: "Authorize Health & TB Screening", status: "Enabled", bookingLink: true },
    { name: "Authorize Reference Checks (Minimum 2, Non-Family)", status: "Enabled", bookingLink: true },
  ];

  const handleNavigateToSection = (section: "profile" | "documents" | "conditional" | "final") => {
    setActiveSection(section);
    // No navigation, just switch tab
  };

  const handleSendOfferLetter = () => {
    // TODO: Implement send offer letter functionality
    alert("Send offer letter");
  };

  return (
    <div className="min-h-screen">
      <div className="p-2">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(Routes.agency.applicantClearanceHiring)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Applicant's directory
            </h1>
          </div>

          {/* Profile Card */}
          <div className="p-8 mb-6 bg-white rounded-lg shadow-sm">
            <div className="flex items-start gap-6">
              <img
                src={applicant.avatar}
                alt={applicant.name}
                className="w-32 h-32 rounded-full"
              />
              <div className="flex-1">
                <Badge className="mb-3 text-green-800 bg-green-100">
                  {applicant.role}
                </Badge>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  {applicant.name}
                </h2>
                <p className="mb-4 text-gray-600">
                  {applicant.address} • {applicant.dob}
                </p>
                <div className="flex gap-3">
                  <Button 
                    disabled
                    className="text-gray-400 bg-gray-200 cursor-not-allowed hover:bg-gray-200"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-300"
                    onClick={() => navigate(Routes.agency.support)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleNavigateToSection("profile")}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeSection === "profile"
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {applicant.profileScreening && <span className="mr-1">✓</span>}
                Profile & Pre-Screening
              </button>
              <button
                onClick={() => handleNavigateToSection("documents")}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeSection === "documents"
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {applicant.documents && <span className="mr-1">✓</span>}
                Document Upload & Eligibility Verification
              </button>
              <button
                onClick={() => handleNavigateToSection("conditional")}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeSection === "conditional"
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {applicant.conditionalHire && <span className="mr-1">✓</span>}
                Conditional Hire & Compliance
              </button>
              <button
                onClick={() => handleNavigateToSection("final")}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeSection === "final"
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {applicant.finalAgencyReview && <span className="mr-1">!</span>}
                Final Agency Review
              </button>
            </div>
          </div>

          {/* Tab Panels */}
          {activeSection === "profile" && (
            <div className="p-8 bg-white rounded-lg shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Profile & Pre-Screening</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Gender</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.gender}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.email}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Do you have a High School Diploma or GED?</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.questionnaire.highSchoolDiploma}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Are you legally eligible to work in the U.S.?</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.questionnaire.legallyEligible}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Have you ever been convicted of a disqualifying offense under NJ law?</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.questionnaire.convicted}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Have you ever been convicted of a disqualifying offense under NJ law?</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.questionnaire.convictedRepeat}</span>
                </div>
                {/* Resume Section */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-lg">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Resume</span>
                  </div>
                  <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                    View Resume
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "documents" && (
            <div className="p-8 bg-white rounded-lg shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Documents</h3>
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                    </div>
                    <Button variant="outline" className="text-teal-600 border-teal-600 hover:bg-teal-50">
                      View Document
                    </Button>
                  </div>
                ))}
              </div>
              <h3 className="mt-10 mb-6 text-lg font-semibold text-gray-900">References</h3>
              <div className="grid grid-cols-2 gap-6">
                {references.map((ref, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="mb-1 text-sm font-semibold text-gray-900">{ref.name}</h4>
                    <p className="mb-3 text-xs text-gray-500">{ref.relation}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Mobile</span>
                        <span className="font-medium text-gray-900">{ref.mobile}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Email</span>
                        <span className="font-medium text-gray-900">{ref.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "conditional" && (
            <div className="p-8 bg-white rounded-lg shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Conditional Hire</h3>
              <div className="p-6 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 bg-green-100 rounded-full">
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="mb-1 text-base font-semibold text-gray-900">
                        Conditional Hire Letter Signed
                      </h4>
                      <p className="text-sm text-gray-600">
                        Signed on {conditionalHireData.signedDate}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="text-gray-700 border-gray-300 hover:bg-gray-50">
                    <Eye className="w-4 h-4 mr-2" />
                    View Signed Letter
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "final" && (
            <div className="p-8 bg-white rounded-lg shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Final Agency Review</h3>
              <div className="space-y-3">
                {authorizations.map((auth, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <span className="flex-1 text-sm text-gray-900">{auth.name}</span>
                    <div className="flex items-center gap-3">
                      <Badge className={auth.status === "Enabled" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {auth.status}
                      </Badge>
                      {auth.bookingLink && (
                        <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Go to appointment booking
                        </Button>
                      )}
                      {!auth.bookingLink && (
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Send Alert
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Send Offer Letter Section */}
              <div className="p-6 mt-8 border border-gray-200 rounded-lg bg-gray-50">
                <p className="mb-4 text-sm text-gray-600">
                  Everything looks good! Send Official Hire letter!
                </p>
                <Button 
                  onClick={handleSendOfferLetter}
                  className="text-white bg-teal-500 hover:bg-teal-600"
                >
                  Send Letter!
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
