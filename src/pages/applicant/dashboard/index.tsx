import { useNavigate } from "react-router";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/constants";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Dashboard
          </h1>
          <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-[#00b4b8] bg-[#e5f7f7] rounded-full border border-[#00b4b8]/20">
            Applicant
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

      {/* Empty State */}
      <div className="flex items-center justify-center rounded-md bg-[#e5f7f7] min-h-[500px]">
        <div className="flex flex-col items-center max-w-md text-center">
          {/* Icon */}
          <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-[#e5f7f7]">
            <FileText className="w-10 h-10 text-[#00b4b8]" />
          </div>

          {/* Heading */}
          <h2 className="mb-3 text-2xl font-bold text-[#10141a]">
            No Applications Submit yet
          </h2>

          {/* Description */}
          <p className="mb-8 text-base text-[#808081] leading-relaxed">
            Application status will be shown here once you
            <br />
            submit any application
          </p>

          {/* CTA Button */}
          <Button
            onClick={() => navigate(Routes.applicant.application)}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#00b4b8] border-2 border-[#00b4b8] rounded-full px-6 py-2.5 h-auto font-medium transition-all duration-200 hover:shadow-md"
          >
            <Plus size={18} />
            New Application
          </Button>
        </div>
      </div>
    </div>
  );
}

