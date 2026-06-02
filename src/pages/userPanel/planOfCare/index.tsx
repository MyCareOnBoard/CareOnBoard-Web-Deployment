import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/store/redux/hooks";
import {
  planOfCareApi,
  useGetPlanOfCareByIdQuery,
  useGetPlanOfCareListQuery,
} from "./api";
import type { PlanOfCare } from "./types";
import { PlanOfCareList } from "./components/PlanOfCareList";
import { PlanOfCarePagination } from "./components/PlanOfCarePagination";
import {
  CARD_SURFACE,
  PAGE_TITLE,
  SECTION_SUBTITLE,
  SECTION_TITLE,
  SUMMARY_COUNT,
} from "./planOfCareStyles";

const PlanOfCareModal = lazy(
  () =>
    import("./components/PlanOfCareModal").then((m) => ({
      default: m.PlanOfCareModal,
    }))
);

const PAGE_SIZE = 10;

function ModalSuspenseFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <Loader2 className="w-6 h-6 animate-spin text-[#808081]" aria-hidden />
    </div>
  );
}

export default function PlanOfCarePage() {
  const dispatch = useAppDispatch();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanOfCare | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const listParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [page]
  );

  const {
    data: planOfCareResponse,
    isLoading,
    isFetching,
    isError,
  } = useGetPlanOfCareListQuery(listParams);

  const plans = planOfCareResponse?.data ?? [];
  const hasKnownTotal =
    planOfCareResponse?.pagination?.total !== undefined &&
    planOfCareResponse?.pagination?.total !== null;
  const totalCount = hasKnownTotal
    ? planOfCareResponse!.pagination!.total!
    : plans.length;
  const totalPages = hasKnownTotal
    ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    : 1;

  const needsDetailFetch = Boolean(
    selectedPlanId && !selectedPlan?.planOfCare?.url
  );

  const { data: selectedPlanResponse, isLoading: isPlanLoading } =
    useGetPlanOfCareByIdQuery(selectedPlanId ?? "", {
      skip: !needsDetailFetch,
    });

  const displayPlan = selectedPlanResponse?.data ?? selectedPlan;

  const showInitialLoading = isLoading && plans.length === 0;

  useEffect(() => {
    if (!isFetching && hasKnownTotal && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, isFetching, hasKnownTotal]);

  useEffect(() => {
    if (!hasKnownTotal || page >= totalPages) return;
    const nextParams = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    dispatch(
      planOfCareApi.util.prefetch("getPlanOfCareList", nextParams, {
        force: false,
      })
    );
  }, [dispatch, page, totalPages, hasKnownTotal]);

  const handleViewPlanOfCare = useCallback((plan: PlanOfCare) => {
    setSelectedPlan(plan);
    setSelectedPlanId(plan.clientId);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedPlanId(null);
    setSelectedPlan(null);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (!hasKnownTotal) return;
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages, hasKnownTotal]);

  const modalOpen = showModal && Boolean(displayPlan?.id);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-6">
        <h1 className={PAGE_TITLE}>Plan of Care</h1>
      </div>

      <div className={`${CARD_SURFACE} mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className={SECTION_TITLE}>Overview</p>
            <p className={SECTION_SUBTITLE}>Clients with a plan of care</p>
          </div>
          <p className={SUMMARY_COUNT}>
            {showInitialLoading ? "…" : totalCount}
          </p>
        </div>
      </div>

      <div className={CARD_SURFACE}>
        <div className="mb-6">
          <h2 className={SECTION_TITLE}>Your plans of care</h2>
          <p className={`${SECTION_SUBTITLE} mt-1`}>
            Clients you support and their plan of care documents
          </p>
        </div>

        <PlanOfCareList
          plans={plans}
          isLoading={showInitialLoading}
          isFetching={isFetching && !showInitialLoading}
          isError={isError}
          onViewPlan={handleViewPlanOfCare}
        />

        {hasKnownTotal && (
          <PlanOfCarePagination
            page={page}
            totalPages={totalPages}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
          />
        )}

      </div>

      {modalOpen && displayPlan && (
        <Suspense fallback={<ModalSuspenseFallback />}>
          <PlanOfCareModal
            open={modalOpen}
            isLoading={needsDetailFetch && isPlanLoading}
            plan={displayPlan}
            onClose={handleCloseModal}
          />
        </Suspense>
      )}
    </div>
  );
}
