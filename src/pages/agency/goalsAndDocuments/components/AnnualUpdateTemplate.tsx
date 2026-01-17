import React, {useState} from "react";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {ChevronLeft} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";

export default function AnnualUpdateTemplate(
    {pageTitle}: {pageTitle: string}
) {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Form submitted:", formData);
    };

    const currentDate = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"});

    return (
        <div className="min-h-[calc(100vh-200px)]">
            {/* Header with Back Button */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(Routes.agency.goalsAndDocuments.index)}
                    className="flex items-center gap-2 text-[14px] font-medium text-[#808081] hover:text-[#2B82FF] transition-colors mb-4"
                >
                    <ChevronLeft size={20}/>
                    Back to Goals & Documents
                </button>
            </div>

            {/* Form Container */}
            <div className="px-8">
                {/* Header Section */}
                <div className="text-center mb-6 space-y-2">
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                        New Jersey Department of Human Services
                    </p>
                    <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                        Division of Developmental Disabilities
                    </p>
                    <a
                        href="https://www.nj.gov/humanservice/add"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] font-normal leading-[1.4] text-[#2b82ff] hover:underline font-['Urbanist',sans-serif]"
                    >
                        www.nj.gov/humanservice/add
                    </a>
                </div>


                <h3 className="text-[24px] font-bold text-[#10141a] mb-6 text-center">
                    {pageTitle}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                                Name
                            </label>
                            <Input
                                type="text"
                                value={""}
                                placeholder=""
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                                ISP Start Date
                            </label>
                            <Input
                                type="text"
                                value={""}
                                placeholder=""
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                                ISP End Date
                            </label>
                            <Input
                                type="text"
                                value={""}
                                placeholder=""
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Activities Description */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Describe how the activities participated in during this year assisted the individual in
                            moving toward his/her ISP outcome(s).
                        </label>
                        <Textarea
                            value={""}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                        />
                    </div>

                    {/* Changes Needed */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Do changes need to be made to the strategies/activities based on the above information?
                        </label>
                        <Textarea
                            value={""}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                        />
                    </div>

                    {/* Outstanding Issues */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Are there any outstanding issues/concerns?
                        </label>
                        <Textarea
                            value={""}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                        />
                    </div>

                    {/* Planning Examples */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Give example(s) of how the individual participated in the planning of his/her activities
                            throughout the year.
                        </label>
                        <Textarea
                            value={""}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                        />
                    </div>

                    {/* Connections Examples */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Give example(s) from this year that demonstrate how the individual made new connections
                            and/or participated more fully in his/her community.
                        </label>
                        <Textarea
                            value={""}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                        />
                    </div>

                    {/* Employment Opportunities */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Have any opportunities for employment of additional community participation been identified
                            during this year?
                        </label>
                        <Textarea
                            value={""}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                        />
                    </div>

                    {/* Employment Pursuits */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            What has been done to pursue these employment or additional community participation
                            opportunities? Click here to enter text.
                        </label>
                        <Textarea
                            value={""}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                        />
                    </div>

                    {/* Health/Safety Changes */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Has anything changed related to the individual's health/safety during this year? If follow
                            up needed?
                        </label>
                        <Textarea
                            value={""}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                        />
                    </div>

                    <div className="mt-8">
                        <label
                            className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
                            Submitted by
                        </label>
                        <Input
                            type="text"
                            value={formData.completedBy}
                            placeholder=""
                            className="max-w-md"
                        />
                        <p className="mt-2 text-[12px] font-normal leading-[normal] text-black font-['Urbanist',sans-serif]">
                            {currentDate}
                        </p>
                    </div>

                    {/* Submit Button */}
                    <div className={"flex justify-end"}>
                        <Button
                            type={"button"}
                            onClick={handleSubmit}
                            disabled={false}
                            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
                        >
                            Submit
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
