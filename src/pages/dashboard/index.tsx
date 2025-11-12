import { useNavigate, useLocation } from "react-router";
import { Plus, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/constants";
import { useEffect, useState, useRef } from "react";
import { getApplicationStatus } from "@/lib/api/job-application";

type ApplicationStage = 
  | "none" 
  | "stage1" 
  | "stage2" 
  | "stage3" 
  | "stage4" 
  | "active";

interface ApplicationStatus {
  stage: ApplicationStage;
  stageName: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>({
    stage: "none",
    stageName: "Applicant"
  });
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchApplicationStatus = async () => {
    try {
      setLoading(true);
      const response = await getApplicationStatus();
      
      console.log("📊 Dashboard API Response:", response); // Debug log
      
      let stage: ApplicationStage = "none";
      let stageName = "Applicant";

      if (response?.status) {
        const { hasStarted, currentStep, status } = response.status;
        
        console.log("🔍 Status Details:", { hasStarted, currentStep, status }); // Debug log
        
        if (!hasStarted) {
          stage = "none";
          stageName = "Applicant";
        } else {
          const statusLower = String(status || '').toLowerCase();
          const stepLower = String(currentStep || '').toLowerCase();
          
          // Active employee - Check this FIRST
          if (statusLower === "hired" || statusLower === "active" || statusLower === "approved" || stepLower === "step5" || stepLower === "orientation") {
            stage = "active";
            stageName = "Active Employee";
          } 
          // Stage 4
          else if (stepLower === "step4" || stepLower === "review" || stepLower === "stage4" || statusLower === "documents_signed" || statusLower === "pending_final_review" || statusLower === "final_review") {
            stage = "stage4";
            stageName = "Stage 4 submitted";
          }
          // Stage 3
          else if (stepLower === "step3" || stepLower === "compliance" || stepLower === "stage3" || statusLower === "conditionally_hired" || statusLower === "conditional" || statusLower === "conditional_hire") {
            stage = "stage3";
            stageName = "Conditionally Hired";
          }
          // Stage 2
          else if (stepLower === "step2" || stepLower === "eligibility" || stepLower === "stage2" || statusLower === "documents_submitted" || statusLower === "eligibility_review" || statusLower === "eligibility_complete") {
            stage = "stage2";
            stageName = "Stage 2 submitted";
          }
          // Stage 1
          else if (stepLower === "step1" || stepLower === "profile" || stepLower === "stage1" || statusLower === "submitted" || statusLower === "pending" || statusLower === "under_review" || statusLower === "pre-screening_complete") {
            stage = "stage1";
            stageName = "Stage 1 submitted";
          }
        }
      }

      console.log("✅ Final Stage:", stage, "Name:", stageName); // Debug log
      setApplicationStatus({ stage, stageName });
    } catch (error) {
      console.error("❌ Failed to fetch application status:", error);
      setApplicationStatus({ stage: "none", stageName: "Applicant" });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and refetch on navigation
  useEffect(() => {
    fetchApplicationStatus();
  }, [location.key]);

  // Auto-refresh every 10 seconds (reduced from 30 for faster updates during testing)
  useEffect(() => {
    const startPolling = () => {
      fetchTimeoutRef.current = setInterval(() => {
        console.log("🔄 Auto-refreshing dashboard status..."); // Debug log
        fetchApplicationStatus();
      }, 10000); // 10 seconds
    };

    startPolling();

    return () => {
      if (fetchTimeoutRef.current) {
        clearInterval(fetchTimeoutRef.current);
      }
    };
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-gray-300 rounded-full animate-spin border-t-[#00B4B8]"></div>
            <p className="text-gray-600">Loading application status...</p>
          </div>
        </div>
      );
    }

    switch (applicationStatus.stage) {
      case "none":
        return (
          <div className="flex flex-col items-center max-w-md text-center">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#e5f7f7]">
              <FileText className="w-10 h-10 text-[#00b4b8]" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
              No Applications Submit yet
            </h2>
            <p className="mb-8 text-base text-[#808081] leading-relaxed">
              Application status will be shown here once you
              <br />
              submit any application
            </p>
            <Button
              onClick={() => navigate(Routes.application)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
            >
              <Plus size={18} />
              New Application
            </Button>
          </div>
        );

      case "stage1":
        return (
          <div className="flex flex-col items-center max-w-xl text-center">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#e5f7f7]">
              <FileText className="w-10 h-10 text-[#00b4b8]" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
              You have Submitted Profile & Pre-Screening
            </h2>
            <p className="mb-8 text-base text-[#808081] leading-relaxed">
              Once they are approved, You can move to stage 2
            </p>
            <Button
              onClick={() => navigate(Routes.application)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
            >
              Track Application
            </Button>
          </div>
        );

      case "stage2":
        return (
          <div className="flex flex-col items-center max-w-xl text-center">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#e5f7f7]">
              <FileText className="w-10 h-10 text-[#00b4b8]" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
              You have Submitted Documents for Eligibility
            </h2>
            <p className="mb-8 text-base text-[#808081] leading-relaxed">
              Once they are approved, You will be conditionally hired
            </p>
            <Button
              onClick={() => navigate(Routes.application)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
            >
              Track Application
            </Button>
          </div>
        );

      case "stage3":
        return (
          <div className="flex flex-col items-center max-w-xl text-center">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#e5f7f7]">
              <FileText className="w-10 h-10 text-[#00b4b8]" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
              You are conditionally Hired! Upload your Documents & Sign Digitally!
            </h2>
            <p className="mb-8 text-base text-[#808081] leading-relaxed">
              Once they are approved, You can move to stage 4
            </p>
            <Button
              onClick={() => navigate(Routes.application)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
            >
              Track Application
            </Button>
          </div>
        );

      case "stage4":
        return (
          <div className="flex flex-col items-center max-w-xl text-center">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#e5f7f7]">
              <FileText className="w-10 h-10 text-[#00b4b8]" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
              You are conditionally Hired! Lets' wait for the [Agency] to review your final documents
            </h2>
            <p className="mb-8 text-base text-[#808081] leading-relaxed">
              Once they are approved, You can move to stage 5. You can cover your mandatory training.
            </p>
            <Button
              onClick={() => navigate(Routes.application)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
            >
              Track Application
            </Button>
          </div>
        );

      case "active":
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
              onClick={() => navigate(Routes.documents)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
            >
              Take me there
            </Button>
          </div>
        );

      default:
        return null;
    }
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
            {applicationStatus.stageName}
          </span>
        </div>
        {applicationStatus.stage !== "active" && (
          <Button
            onClick={() => navigate(Routes.application)}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-2.5 h-auto font-medium shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <Plus size={18} />
            New Application
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex items-center justify-center rounded-2xl bg-white min-h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
}

