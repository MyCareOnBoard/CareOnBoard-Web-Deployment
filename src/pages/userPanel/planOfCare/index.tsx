import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGetPlanOfCareByIdQuery, useGetPlanOfCareListQuery } from "./api";
import type { PlanOfCare } from "./types";
import { PlanOfCareList } from "./components/PlanOfCareList";
import { PlanOfCareModal } from "./components/PlanOfCareModal";
import { PlanOfCarePagination } from "./components/PlanOfCarePagination";

export default function PlanOfCarePage() {
  const { data: planOfCareResponse, isLoading, isError } = useGetPlanOfCareListQuery();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const pageSize = 10;
  const plans = useMemo(() => planOfCareResponse?.data ?? [], [planOfCareResponse?.data]);
  const totalPages = Math.max(1, Math.ceil(plans.length / pageSize));
  const pagedPlans = useMemo(
    () => plans.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, plans]
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const { data: selectedPlanResponse, isLoading: isPlanLoading } = useGetPlanOfCareByIdQuery(
    selectedPlanId ?? "",
    { skip: !selectedPlanId }
  );
  const selectedPlan = selectedPlanResponse?.data ?? null;

  const handleViewPlanOfCare = (plan: PlanOfCare) => {
    setSelectedPlanId(plan.id);
    setSelectedClientName(plan.clientName);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlanId(null);
    setSelectedClientName("");
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plan of Care</h1>
          </div>
          <Button className="bg-[#00B4B8] hover:bg-[#00A0A4] hover:cursor-pointer text-white rounded-full px-6">
            + Manual Timesheet
          </Button>
        </div>

        {/* Plan of Care List */}
        <div className="bg-[#edf1f2] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">Plan of care</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              These are your active plan of care
            </p>
          </div>

          <PlanOfCareList
            plans={pagedPlans}
            isLoading={isLoading}
            isError={isError}
            onViewPlan={handleViewPlanOfCare}
          />

          {/* Pagination */}
          <PlanOfCarePagination
            page={page}
            totalPages={totalPages}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Plan of Care Modal */}
      <PlanOfCareModal
        open={showModal && !!selectedPlanId}
        isLoading={isPlanLoading}
        plan={selectedPlan}
        clientName={selectedClientName}
        onClose={handleCloseModal}
      />
    </div>
  );
}
