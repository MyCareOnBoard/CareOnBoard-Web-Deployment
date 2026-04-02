import React, { useState, useMemo, useCallback } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import {
  useListServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  type Service,
  type CreateServiceRequest,
} from "@/lib/api/services";
import { ServiceModal } from "./ServiceModal";

const ITEMS_PER_PAGE = 10;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function ServicesManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading, isError, refetch } = useListServicesQuery({
    limit: 200,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
  });

  const [createService, { isLoading: isCreating }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation();
  const [deleteService, { isLoading: isDeleting }] = useDeleteServiceMutation();

  const services = data?.services ?? [];
  const uniqueTypes = useMemo(
    () => Array.from(new Set(services.map((s) => s.type).filter(Boolean))).sort(),
    [services]
  );

  const filteredServices = useMemo(() => {
    let result = services;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.type?.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((s) => s.type === typeFilter);
    }
    return result;
  }, [services, debouncedSearch, typeFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredServices.length / ITEMS_PER_PAGE)),
    [filteredServices.length]
  );
  const paginatedServices = useMemo(
    () =>
      filteredServices.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      ),
    [filteredServices, currentPage]
  );

  const existingCodes = useMemo(
    () => services.map((s) => s.code).filter(Boolean),
    [services]
  );

  const handleAddService = useCallback(() => {
    setEditingService(null);
    setModalMode("create");
    setIsModalOpen(true);
  }, []);

  const handleEditService = useCallback((service: Service) => {
    setEditingService(service);
    setModalMode("edit");
    setIsModalOpen(true);
  }, []);

  const handleDeleteService = useCallback((service: Service) => {
    setServiceToDelete(service);
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!serviceToDelete) return;
    const id = serviceToDelete.id;
    try {
      await deleteService(id).unwrap();
      setShowDeleteDialog(false);
      setServiceToDelete(null);
    } catch {
      // Error handled by RTK Query
    }
  }, [serviceToDelete, deleteService]);

  const handleTypeFilter = useCallback((type: string) => {
    setTypeFilter(type);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleSaveService = useCallback(
    async (payload: CreateServiceRequest) => {
      if (modalMode === "create") {
        await createService(payload).unwrap();
      } else if (editingService) {
        await updateService({
          serviceId: editingService.id,
          data: payload,
        }).unwrap();
      }
    },
    [modalMode, editingService, createService, updateService]
  );

  const isBusy = isLoading || isCreating || isUpdating || isDeleting;

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Services
        </h1>
        <button
          onClick={handleAddService}
          disabled={isBusy}
          className="flex items-center gap-[13px] px-[16px] py-[12px] rounded-[60px] bg-[#00b4b8] backdrop-blur-[22px] hover:bg-[#009da1] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5 text-white" />
          <span className="text-[14px] font-semibold leading-[1.4] text-white">
            Add Service
          </span>
        </button>
      </div>

      {/* Main Card */}
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
        <div className="relative p-4 sm:p-[19px]">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-[35px] gap-4">
            <div className="flex flex-col gap-[4px]">
              <h2 className="text-[18px] sm:text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Service catalog
              </h2>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                Manage services that can be assigned to clients for billing and reporting.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative flex items-center gap-[10px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-[60px] pl-[12px] pr-[16px] py-[10px] h-[36px] w-full sm:w-[320px] backdrop-blur overflow-hidden">
              <Search className="w-5 h-5 text-[#808081] shrink-0" />
              <Input
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by name, code, or type"
                className="h-[20px] border-0 bg-transparent px-0 py-0 text-[12px] font-medium leading-[1.4] text-[#10141a] placeholder:text-[#808081] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => handleTypeFilter("all")}
              className={`backdrop-blur-[22px] flex items-center justify-center px-4 py-[9px] rounded-[60px] font-semibold text-[14px] leading-[1.4] transition-colors ${
                typeFilter === "all"
                  ? "bg-[#00b4b8] text-white"
                  : "border border-[#808081] text-[#808081] font-medium"
              }`}
            >
              All
            </button>
            {uniqueTypes.map((t) => (
              <button
                key={t}
                onClick={() => handleTypeFilter(t)}
                className={`backdrop-blur-[22px] flex items-center justify-center px-4 py-[9px] rounded-[60px] font-semibold text-[14px] leading-[1.4] transition-colors ${
                  typeFilter === t
                    ? "bg-[#00b4b8] text-white"
                    : "border border-[#808081] text-[#808081] font-medium"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
              <p className="mt-4 text-sm text-[#808081]">Loading services...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && isError && (
            <div className="py-12 text-center">
              <p className="text-red-500 mb-4">Failed to load services. Please try again.</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-[#00b4b8] text-white rounded-lg hover:bg-[#009da1] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Services Table */}
          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              {paginatedServices.length === 0 ? (
                <div className="py-12 text-center">
                  <Briefcase className="w-16 h-16 text-[#808081] mx-auto mb-4" />
                  <p className="text-[14px] font-medium text-[#808081]">
                    {searchQuery || typeFilter !== "all"
                      ? "No services match your filters."
                      : "No services yet. Add your first service to get started."}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.05)]">
                      <th className="text-left px-4 py-3 text-[14px] font-semibold leading-[1.4] text-[#808081]">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-[14px] font-semibold leading-[1.4] text-[#808081]">
                        Code
                      </th>
                      <th className="text-left px-4 py-3 text-[14px] font-semibold leading-[1.4] text-[#808081]">
                        Type
                      </th>
                      <th className="text-right px-4 py-3 text-[14px] font-semibold leading-[1.4] text-[#808081]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedServices.map((service) => (
                      <tr
                        key={service.id}
                        className="border-b border-[rgba(0,0,0,0.05)] hover:bg-white/30 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <p className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
                            {service.name}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[14px] font-medium leading-[1.4] text-[#10141a]">
                            {service.code}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[14px] font-medium leading-[1.4] text-[#10141a]">
                            {service.type}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDeleteService(service)}
                              disabled={isBusy}
                              className="flex items-center justify-center px-[10px] py-[10px] rounded-[60px] bg-[rgba(175,33,14,0.05)] border-[0.5px] border-[#d53411] hover:bg-[rgba(175,33,14,0.1)] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-[12px] font-semibold leading-[normal] text-[#d53411] text-center">
                                Delete
                              </span>
                            </button>
                            <button
                              onClick={() => handleEditService(service)}
                              disabled={isBusy}
                              className="flex items-center justify-center px-[10px] py-[10px] rounded-[60px] bg-[rgba(178,178,179,0.1)] border-[0.5px] border-[#b2b2b3] hover:bg-[rgba(178,178,179,0.2)] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-[12px] font-semibold leading-[normal] text-[#565656] text-center">
                                Edit
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !isError && paginatedServices.length > 0 && (
            <div className="mt-6 sm:mt-[30px] flex items-center justify-center gap-2">
              <span className="text-[14px] sm:text-[16px] font-medium leading-[1.6] text-[#10141a]">
                {currentPage}
                <span className="text-[12px] sm:text-[14px] text-[#808081]">/{totalPages}</span>
              </span>
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-[145.455px] p-[6px] disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer touch-manipulation"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#10141a]" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-[145.455px] p-[6px] disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer touch-manipulation"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#10141a]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <ServiceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        mode={modalMode}
        initialData={editingService ?? undefined}
        existingTypes={uniqueTypes}
        existingCodes={existingCodes}
        onSave={handleSaveService}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmDialogContent
          title="Delete service?"
          description={`Delete "${serviceToDelete?.name ?? "this service"}"? This service may be assigned to clients. Deleting it cannot be undone.`}
          confirmText="Delete service"
          cancelText="Keep"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setServiceToDelete(null);
          }}
          isLoading={isDeleting}
          loadingText="Deleting..."
        />
      </ConfirmDialog>
    </div>
  );
}
