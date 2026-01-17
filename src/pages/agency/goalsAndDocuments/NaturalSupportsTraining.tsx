import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { ChevronLeft } from "lucide-react";

export default function NaturalSupportsTraining() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    ispOutcome: "",
    nameOfTrainer: "",
    trainingParticipants: [
      { name: "", signature: "" },
      { name: "", signature: "" },
    ],
    trainings: [
      { type: "", date: "", startTime: "", endTime: "", description: "" },
      { type: "", date: "", startTime: "", endTime: "", description: "" },
      { type: "", date: "", startTime: "", endTime: "", description: "" },
    ],
    completedBy: "",
    completionDate: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleParticipantChange = (index: number, field: string, value: string) => {
    const updated = [...formData.trainingParticipants];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, trainingParticipants: updated }));
  };

  const handleTrainingChange = (index: number, field: string, value: string) => {
    const updated = [...formData.trainings];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, trainings: updated }));
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
          Natural Supports Training
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
          Natural Supports Training
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                ISP-Date
              </label>
              <input
                type="text"
                value={formData.birthDate}
                onChange={(e) => handleInputChange("birthDate", e.target.value)}
                className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
                placeholder="Enter date"
              />
            </div>
          </div>

          {/* ISP Outcome */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              ISP Outcome
            </label>
            <textarea
              value={formData.ispOutcome}
              onChange={(e) => handleInputChange("ispOutcome", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA] min-h-[100px]"
              placeholder="Enter ISP outcome"
            />
          </div>

          {/* Name of Trainer */}
          <div>
            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
              Name of Trainer
            </label>
            <input
              type="text"
              value={formData.nameOfTrainer}
              onChange={(e) => handleInputChange("nameOfTrainer", e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
              placeholder="Enter trainer name"
            />
          </div>

          {/* Training Participants */}
          <div>
            <h4 className="text-[16px] font-semibold text-[#10141a] mb-4">
              Name of Training Participant(s)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.trainingParticipants.map((participant, index) => (
                <div key={index} className="space-y-3">
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => handleParticipantChange(index, "name", e.target.value)}
                    className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
                    placeholder={`Name of Training Participant(s)`}
                  />
                  <input
                    type="text"
                    value={participant.signature}
                    onChange={(e) => handleParticipantChange(index, "signature", e.target.value)}
                    className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-[#F8F9FA]"
                    placeholder={`Signature of Training Participant(s)`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Training Sessions */}
          <div>
            <h4 className="text-[16px] font-semibold text-[#10141a] mb-4">
              Training Sessions
            </h4>
            {formData.trainings.map((training, index) => (
              <div key={index} className="mb-6 p-6 bg-[#F8F9FA] rounded-lg border border-[#e5e5e6]">
                <h5 className="text-[14px] font-semibold text-[#10141a] mb-4">
                  Training Type #{index + 1}
                </h5>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={training.type}
                    onChange={(e) => handleTrainingChange(index, "type", e.target.value)}
                    className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-white"
                    placeholder="Training Type #1"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={training.date}
                      onChange={(e) => handleTrainingChange(index, "date", e.target.value)}
                      className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-white"
                      placeholder="Date"
                    />
                    <input
                      type="text"
                      value={training.startTime}
                      onChange={(e) => handleTrainingChange(index, "startTime", e.target.value)}
                      className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-white"
                      placeholder="Start Time"
                    />
                    <input
                      type="text"
                      value={training.endTime}
                      onChange={(e) => handleTrainingChange(index, "endTime", e.target.value)}
                      className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-white"
                      placeholder="End Time"
                    />
                  </div>
                  <textarea
                    value={training.description}
                    onChange={(e) => handleTrainingChange(index, "description", e.target.value)}
                    className="w-full px-4 py-3 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors bg-white min-h-[100px]"
                    placeholder={`Brief Description of Content of Training Type #${index + 1}`}
                  />
                </div>
              </div>
            ))}
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
