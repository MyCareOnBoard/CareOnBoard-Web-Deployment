import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { ChevronLeft } from "lucide-react";

export default function PrevocationalTrainingServices() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    ispStartDate: "",
    ispEndDate: "",
    activitiesDescription: "",
    changesNeeded: "",
    outstandingIssues: "",
    planningExamples: "",
    connectionsExamples: "",
    employmentOpportunities: "",
    employmentPursuits: "",
    healthSafetyChanges: "",
    completedBy: "",
    completionDate: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header with Back Button */}
      <div className="mb-8">
        <button
          onClick={() => navigate(Routes.agency.goalsAndDocuments.index)}
          className="flex items-center gap-2 text-[14px] font-medium text-[#808081] hover:text-[#2B82FF] transition-colors mb-4"
        >
          <ChevronLeft size={20} />
          Back to Goals & Documents
        </button>
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Prevocational Training Services – Annual Update
        </h1>
      </div>

      {/* Form Container */}
      <div className="rounded-[20px] bg-white p-8 shadow-sm border border-[#e5e5e6]">
        {/* Header Section */}
        <div className="text-center mb-8 pb-6 border-b border-[#e5e5e6]">
          <h2 className="text-[20px] font-bold text-[#10141a] mb-2">
            New Jersey Department of Human Services
          </h2>
          <p className="text-[16px] font-semibold text-[#10141a] mb-1">
            Division of Developmental Disabilities
          </p>
          <a
            href="https://www.nj.gov/humanservices/ddd"
            className="text-[14px] text-[#2B82FF] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.nj.gov/humanservices/ddd
          </a>
        </div>

        <h3 className="text-[24px] font-bold text-[#10141a] mb-6 text-center">
          Prevocational Training Services – Annual Update
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                ISP Start Date
              </label>
              <input
                type="text"
                value={formData.ispStartDate}
                onChange={(e) => handleInputChange("ispStartDate", e.target.value)}
                className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
                placeholder="Enter start date"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                ISP End Date
              </label>
              <input
                type="text"
                value={formData.ispEndDate}
                onChange={(e) => handleInputChange("ispEndDate", e.target.value)}
                className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
                placeholder="Enter end date"
              />
            </div>
          </div>

          {/* Activities Description */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              Describe how the activities participated in during this year assisted the individual in moving toward his/her ISP outcome(s).
            </label>
            <textarea
              value={formData.activitiesDescription}
              onChange={(e) => handleInputChange("activitiesDescription", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[120px]"
              placeholder="Enter description"
            />
          </div>

          {/* Changes Needed */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              Do changes need to be made to the strategies/activities based on the above information?
            </label>
            <textarea
              value={formData.changesNeeded}
              onChange={(e) => handleInputChange("changesNeeded", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[120px]"
              placeholder="Enter response"
            />
          </div>

          {/* Outstanding Issues */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              Are there any outstanding issues/concerns?
            </label>
            <textarea
              value={formData.outstandingIssues}
              onChange={(e) => handleInputChange("outstandingIssues", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[120px]"
              placeholder="Enter response"
            />
          </div>

          {/* Planning Examples */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              Give example(s) of how the individual participated in the planning of his/her activities throughout the year.
            </label>
            <textarea
              value={formData.planningExamples}
              onChange={(e) => handleInputChange("planningExamples", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[120px]"
              placeholder="Enter examples"
            />
          </div>

          {/* Connections Examples */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              Give example(s) from this year that demonstrate how the individual made new connections and/or participated more fully in his/her community.
            </label>
            <textarea
              value={formData.connectionsExamples}
              onChange={(e) => handleInputChange("connectionsExamples", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[120px]"
              placeholder="Enter examples"
            />
          </div>

          {/* Employment Opportunities */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              Have any opportunities for employment of additional community participation been identified during this year?
            </label>
            <textarea
              value={formData.employmentOpportunities}
              onChange={(e) => handleInputChange("employmentOpportunities", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[120px]"
              placeholder="Enter response"
            />
          </div>

          {/* Employment Pursuits */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              What has been done to pursue these employment or additional community participation opportunities? Click here to enter text.
            </label>
            <textarea
              value={formData.employmentPursuits}
              onChange={(e) => handleInputChange("employmentPursuits", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[120px]"
              placeholder="Enter response"
            />
          </div>

          {/* Health/Safety Changes */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              Has anything changed related to the individual's health/safety during this year?  If follow up needed?
            </label>
            <textarea
              value={formData.healthSafetyChanges}
              onChange={(e) => handleInputChange("healthSafetyChanges", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[120px]"
              placeholder="Enter response"
            />
          </div>

          {/* Completion Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                Completed by
              </label>
              <input
                type="text"
                value={formData.completedBy}
                onChange={(e) => handleInputChange("completedBy", e.target.value)}
                className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                June 19th
              </label>
              <input
                type="text"
                value={formData.completionDate}
                onChange={(e) => handleInputChange("completionDate", e.target.value)}
                className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
                placeholder="Select date"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6">
            <button
              type="submit"
              className="px-8 py-3 bg-[#2B82FF] text-white text-[14px] font-semibold rounded-lg hover:bg-[#2470e6] transition-colors"
            >
              Save Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
