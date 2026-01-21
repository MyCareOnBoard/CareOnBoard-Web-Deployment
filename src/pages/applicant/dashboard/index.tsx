import { useNavigate } from "react-router";
import { Plus, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/constants";
import { useEffect, useState } from "react";
import { APPLICATION_STEP_NAMES, getApplicationStatus } from "@/lib/api/job-application";
import { ApplicationStatusType } from "@/lib/api/job-application";


const applicationStages = [{
  title: "No Applications Submitted yet",
  subtitle: "Application status will be shown here once you submit any application"
},
{
  title: "You have Submitted Profile & Pre-Screening",
  subtitle: "Once they are approved, You can move to stage 2"
},
{
  title: "You have Submitted Documents for Eligibility",
  subtitle: "Once they are approved, You will be conditionally hired"
},
// {
//   title: "You are conditionally Hired! Upload your Documents & Sign Digitally!",
//   subtitle: "Once they are approved, You can move to stage 4"
// },
{
  title: "You are conditionally Hired! Lets' wait for the Agency to review your final documents",
  subtitle: "Once they are approved, You can move to stage 5. You can cover your mandatory training."
},
{
  title: "Congratulations! You are hired officially!",
  subtitle: "Sign digitally & take your employee ID & Email!"
}]

export type ApplicationStage = typeof applicationStages[number];

export default function ApplicantDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applicationStage, setApplicationStage] = useState<ApplicationStage>(applicationStages[0]);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatusType>("incomplete");
  const [applicationStep, setApplicationStep] = useState(0);
  const [applicationStarted, setApplicationStarted] = useState(false);

  const fetchApplicationStatus = async () => {
    try {
      setLoading(true);
      const response = await getApplicationStatus();

      if (response?.status) {
        const { hasStarted, currentStep, status } = response.status;

        setApplicationStatus(status);
        setApplicationStep(APPLICATION_STEP_NAMES.indexOf(currentStep || "profile"));
        setApplicationStarted(hasStarted);

        if (hasStarted && currentStep !== null) {
          console.log("🔍 Setting application stage to:", APPLICATION_STEP_NAMES.indexOf(currentStep));
          setApplicationStage(applicationStages[APPLICATION_STEP_NAMES.indexOf(currentStep)]);
        }
      }

    } catch (error) {
      console.error("❌ Failed to fetch application status:", error);
      setApplicationStage(applicationStages[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
            <p className="text-sm text-[#808081]">Loading application status...</p>
          </div>
        </div>
      );
    }

    if (!applicationStarted) {
      return (
        <div className="flex flex-col items-center max-w-md text-center">
          <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#e5f7f7]">
            <FileText className="w-10 h-10 text-[#00b4b8]" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
            {applicationStage.title}
          </h2>
          <p className="mb-8 text-base text-[#808081] leading-relaxed">
            {applicationStage.subtitle}
          </p>
          <Button
            onClick={() => navigate(Routes.applicant.application)}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
          >
            <Plus size={18} />
            New Application
          </Button>
        </div>
      )
    }

    if (applicationStatus === "approved") {
      return (
        <div className="flex flex-col items-center max-w-xl text-center">
          <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#22c55e]">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
            Congratulations! You are hired officially!
          </h2>
          <p className="mb-8 text-base text-[#808081] leading-relaxed">
            Sign digitally & Take your employee ID & E-mail
          </p>
          <Button
            onClick={() => navigate(Routes.applicant.documents)}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
          >
            Take me there
          </Button>
        </div>
      );
    }


    return (
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#e5f7f7]">
          <FileText className="w-10 h-10 text-[#00b4b8]" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
          {applicationStage.title}
        </h2>
        <p className="mb-8 text-base text-[#808081] leading-relaxed">
          {applicationStage.subtitle}
        </p>
        <Button
          onClick={() => navigate(Routes.applicant.application)}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
        >
          <Plus size={18} />
          Track Application
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Dashboard
          </h1>
          <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-[#00b4b8] bg-[#e5f7f7] rounded-full border border-[#00b4b8]/20">
            {applicationStarted ? `Stage ${applicationStep} Submitted` : "Applicant"}
          </span>
        </div>
        <Button
          onClick={() => navigate(Routes.applicant.application)}
          className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-2.5 h-auto font-medium shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <Plus size={18} />
          New Application
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex items-center justify-center rounded-2xl bg-white min-h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
}

