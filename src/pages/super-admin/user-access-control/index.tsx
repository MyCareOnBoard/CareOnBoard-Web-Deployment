import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ConfirmDialog,
  ConfirmDialogContent,
} from "@/components/ui/confirm-dialog";
import UserAccessModal from "./UserAccessModal";
import SuccessModal from "./SuccessModal";
import ErrorDialog from "./ErrorDialog";
import {
  createSuperAdminUser,
  getSuperAdminAccessConfig,
  listAssignableAgencies,
  listSuperAdminUsers,
  removeSuperAdminUser,
  updateSuperAdminUser,
  type SuperAdminAccessConfig,
  type SuperAdminUser,
} from "@/lib/api/super-admin-users";
import type { UserAccessFormValue } from "./userAccessTypes";
import { useAuth } from "@/utils/auth";
import { useAppDispatch } from "@/store/redux/hooks";
import { refreshCommittedAccess } from "./postCommitAccessRefresh";
import { resetSuperAdminCaches } from "./resetSuperAdminCaches";

type AgencyOption = { id: string; name: string; status?: string };
const PAGE_SIZE = 10;

function normalizeUser(user: SuperAdminUser): SuperAdminUser {
  return {
    ...user,
    role: user.role || "Super Admin",
    roleTemplate: user.roleTemplate || "custom",
    accessList: user.accessList || [],
    agencyScope: user.agencyScope || "all",
    agencyIds: user.agencyIds || [],
  };
}

function TableSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading users"
      className="space-y-3 px-2 py-4"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-4 gap-4 rounded-xl border border-[#e4eaea] p-4"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export default function UserAccessControlPage() {
  const { user, refreshProfile } = useAuth();
  const dispatch = useAppDispatch();
  const [config, setConfig] = useState<SuperAdminAccessConfig | null>(null);
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<SuperAdminUser | null>(null);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [agencySearch, setAgencySearch] = useState("");
  const [debouncedAgencySearch, setDebouncedAgencySearch] = useState("");
  const [agencyCursor, setAgencyCursor] = useState<string | null>(null);
  const [isAgencyPageLoading, setIsAgencyPageLoading] = useState(false);
  const [isAgencyHydrationLoading, setIsAgencyHydrationLoading] =
    useState(false);
  const [agencyPageError, setAgencyPageError] = useState("");
  const [agencyHydrationError, setAgencyHydrationError] = useState("");
  const [pendingHydrationIds, setPendingHydrationIds] = useState<string[]>([]);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successUserName, setSuccessUserName] = useState("");
  const [accessRefreshWarning, setAccessRefreshWarning] = useState("");
  const [isRetryingAccessRefresh, setIsRetryingAccessRefresh] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<SuperAdminUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorTitle, setErrorTitle] = useState("Error");
  const [errorMessage, setErrorMessage] = useState("");
  const agencyPageAbortRef = useRef<AbortController | null>(null);
  const agencyHydrationAbortRef = useRef<AbortController | null>(null);
  const agencyPageRequestRef = useRef(0);
  const agencyHydrationRequestRef = useRef(0);
  const userRequestRef = useRef(0);
  const configRequestRef = useRef(0);
  const selectedAgencyIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedAgencySearch(agencySearch.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [agencySearch]);

  const loadUsers = useCallback(async () => {
    const requestId = ++userRequestRef.current;
    setIsLoading(true);
    setError("");
    try {
      const response = await listSuperAdminUsers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        isActive: true,
      });
      if (requestId !== userRequestRef.current) return;
      setUsers(response.data.map(normalizeUser));
      setPagination({
        page: response.pagination.page,
        total: response.pagination.total,
        totalPages: Math.max(1, response.pagination.totalPages),
      });
    } catch (caught) {
      if (requestId !== userRequestRef.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load user access.",
      );
    } finally {
      if (requestId === userRequestRef.current) setIsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);
  const loadConfig = useCallback(async () => {
    const requestId = ++configRequestRef.current;
    setIsConfigLoading(true);
    setConfigError("");
    try {
      const nextConfig = await getSuperAdminAccessConfig();
      if (requestId === configRequestRef.current) setConfig(nextConfig);
    } catch (caught) {
      if (requestId === configRequestRef.current)
        setConfigError(
          caught instanceof Error
            ? caught.message
            : "Unable to load access configuration.",
        );
    } finally {
      if (requestId === configRequestRef.current) setIsConfigLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);
  useEffect(() => () => {
    userRequestRef.current += 1;
    configRequestRef.current += 1;
    agencyPageAbortRef.current?.abort();
    agencyHydrationAbortRef.current?.abort();
  }, []);

  const mergeAgencies = (
    current: AgencyOption[],
    incoming: AgencyOption[],
    replace: boolean,
  ) => {
    const merged = new Map(
      (replace ? [] : current).map((agency) => [agency.id, agency]),
    );
    incoming.forEach((agency) => merged.set(agency.id, agency));
    return Array.from(merged.values());
  };

  const requestAgencyPage = useCallback(
    async ({
      cursor,
      append = false,
    }: { cursor?: string; append?: boolean } = {}) => {
      agencyPageAbortRef.current?.abort();
      const controller = new AbortController();
      agencyPageAbortRef.current = controller;
      const requestId = ++agencyPageRequestRef.current;
      setIsAgencyPageLoading(true);
      setAgencyPageError("");
      try {
        const response = await listAssignableAgencies({
          search: debouncedAgencySearch,
          cursor,
          limit: 50,
          signal: controller.signal,
        });
        if (requestId !== agencyPageRequestRef.current) return;
        setAgencies((current) => {
          const retained = append
            ? current
            : current.filter((agency) =>
                selectedAgencyIdsRef.current.includes(agency.id),
              );
          return mergeAgencies(retained, response.agencies, false);
        });
        setAgencyCursor(response.nextCursor);
      } catch (caught) {
        if (controller.signal.aborted) return;
        if (requestId === agencyPageRequestRef.current)
          setAgencyPageError(
            caught instanceof Error
              ? caught.message
              : "Unable to load agencies.",
          );
      } finally {
        if (requestId === agencyPageRequestRef.current)
          setIsAgencyPageLoading(false);
      }
    },
    [debouncedAgencySearch],
  );

  const hydrateAgencyIds = useCallback(async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) {
      setPendingHydrationIds([]);
      return;
    }
    agencyHydrationAbortRef.current?.abort();
    const controller = new AbortController();
    agencyHydrationAbortRef.current = controller;
    const requestId = ++agencyHydrationRequestRef.current;
    setPendingHydrationIds(uniqueIds);
    setIsAgencyHydrationLoading(true);
    setAgencyHydrationError("");
    try {
      const chunks: string[][] = [];
      for (let index = 0; index < uniqueIds.length; index += 50)
        chunks.push(uniqueIds.slice(index, index + 50));
      const pages = await Promise.all(
        chunks.map((chunk) =>
          listAssignableAgencies({
            ids: chunk,
            limit: 50,
            signal: controller.signal,
          }),
        ),
      );
      if (requestId !== agencyHydrationRequestRef.current) return;
      setAgencies((current) =>
        mergeAgencies(
          current,
          pages.flatMap((entry) => entry.agencies),
          false,
        ),
      );
      setPendingHydrationIds([]);
    } catch (caught) {
      if (controller.signal.aborted) return;
      if (requestId === agencyHydrationRequestRef.current)
        setAgencyHydrationError(
          caught instanceof Error
            ? caught.message
            : "Unable to load selected agencies.",
        );
    } finally {
      if (requestId === agencyHydrationRequestRef.current)
        setIsAgencyHydrationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    void requestAgencyPage();
    return () => agencyPageAbortRef.current?.abort();
  }, [debouncedAgencySearch, isModalOpen, requestAgencyPage]);

  useEffect(() => {
    if (
      !isModalOpen ||
      modalMode !== "edit" ||
      !editingUser ||
      editingUser.agencyScope !== "selected"
    )
      return;
    void hydrateAgencyIds(editingUser.agencyIds);
    return () => agencyHydrationAbortRef.current?.abort();
  }, [editingUser, hydrateAgencyIds, isModalOpen, modalMode]);

  const openCreate = () => {
    selectedAgencyIdsRef.current = [];
    setPendingHydrationIds([]);
    setEditingUser(null);
    setModalMode("create");
    setAgencySearch("");
    setDebouncedAgencySearch("");
    setAgencies([]);
    setAgencyPageError("");
    setAgencyHydrationError("");
    setIsModalOpen(true);
  };
  const openEdit = (user: SuperAdminUser) => {
    selectedAgencyIdsRef.current =
      user.agencyScope === "selected" ? user.agencyIds : [];
    setPendingHydrationIds(selectedAgencyIdsRef.current);
    setEditingUser(user);
    setModalMode("edit");
    setAgencySearch("");
    setDebouncedAgencySearch("");
    setAgencies([]);
    setAgencyPageError("");
    setAgencyHydrationError("");
    setIsModalOpen(true);
  };

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      agencyPageAbortRef.current?.abort();
      agencyHydrationAbortRef.current?.abort();
      agencyPageRequestRef.current += 1;
      agencyHydrationRequestRef.current += 1;
    }
    setIsModalOpen(nextOpen);
  };

  const refreshCurrentAdminAccess = async () => {
    setIsRetryingAccessRefresh(true);
    const refreshed = await refreshCommittedAccess({
      refreshProfile,
      resetCaches: () => resetSuperAdminCaches(dispatch),
      onFailure: () =>
        setAccessRefreshWarning(
          "Your changes were saved, but your access could not be refreshed. Retry before continuing.",
        ),
    });
    if (refreshed) setAccessRefreshWarning("");
    setIsRetryingAccessRefresh(false);
  };

  const saveUser = async (data: UserAccessFormValue) => {
    let refreshSignedInUser = false;
    try {
      if (modalMode === "create")
        await createSuperAdminUser({ ...data, phone: "" });
      else if (editingUser) {
        const { email: _email, password, ...updateData } = data;
        await updateSuperAdminUser(editingUser.id, {
          ...updateData,
          ...(password.trim() ? { password } : {}),
        });
        refreshSignedInUser =
          editingUser.uid === user?.uid || editingUser.id === user?.uid;
      }
      await loadUsers();
      setSuccessUserName(data.name);
      setIsSuccessModalOpen(true);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to save user.";
      setErrorTitle(modalMode === "create" ? "Create failed" : "Update failed");
      setErrorMessage(message);
      setShowErrorDialog(true);
      throw caught;
    }
    if (refreshSignedInUser) void refreshCurrentAdminAccess();
  };

  const confirmRemove = async () => {
    if (!userToRemove) return;
    setIsRemoving(true);
    try {
      await removeSuperAdminUser(userToRemove.id);
      await loadUsers();
      setShowRemoveDialog(false);
      setUserToRemove(null);
    } catch (caught) {
      setErrorTitle("Delete failed");
      setErrorMessage(
        caught instanceof Error ? caught.message : "Unable to remove user.",
      );
      setShowErrorDialog(true);
    } finally {
      setIsRemoving(false);
    }
  };

  const modalInitialData = useMemo(
    () =>
      editingUser
        ? {
            name: editingUser.name,
            email: editingUser.email,
            password: "",
            role: editingUser.role,
            roleTemplate: editingUser.roleTemplate,
            accessList: editingUser.accessList,
            agencyScope: editingUser.agencyScope,
            agencyIds: editingUser.agencyIds,
          }
        : undefined,
    [editingUser],
  );
  const defaultAgencyScope = useMemo(
    () =>
      config?.canAssignAllAgencies
        ? { agencyScope: "all" as const, agencyIds: [] }
        : { agencyScope: "selected" as const, agencyIds: [] },
    [config?.canAssignAllAgencies],
  );
  const isInitialLoading = (isLoading && users.length === 0) || isConfigLoading;
  const isAgenciesLoading = isAgencyPageLoading || isAgencyHydrationLoading;

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#087f82]">
            Platform administration
          </p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-bold leading-tight text-[#10141a]">
            User Access Control
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] text-[#687173]">
            Create focused roles and keep every administrator inside the right
            agency boundary.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!config || isLoading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#087f82] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#066d70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New Access
        </button>
      </header>

      <section className="overflow-hidden rounded-[24px] border border-[#dfe6e6] bg-[#fdfefe] shadow-[0_16px_45px_rgba(33,69,70,0.08)]">
        <div className="flex flex-col gap-4 border-b border-[#e6ecec] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#10141a]">
              <ShieldCheck className="h-5 w-5 text-[#087f82]" />
              Administrator access
            </h2>
            <p className="mt-1 text-[12px] text-[#687173]">
              {pagination.total} active account
              {pagination.total === 1 ? "" : "s"}
            </p>
          </div>
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#748082]" />
            <Input
              aria-label="Search users"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              className="h-11 rounded-full border-[#d2dada] bg-[#f6f9f9] pl-10 pr-4 text-[13px] focus-visible:ring-[#008f92]/30"
            />
          </div>
        </div>
      {isInitialLoading ? (
          <TableSkeleton />
        ) : error || configError ? (
          <div role="alert" className="p-10 text-center">
            <p className="text-[13px] font-semibold text-[#9b3e33]">
              {error || configError}
            </p>
            <button
              onClick={() => {
                void loadUsers();
                if (!config) void loadConfig();
              }}
              className="mt-4 rounded-full border border-[#087f82] px-4 py-2 text-[12px] font-semibold text-[#087f82]"
            >
              Try again
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[14px] font-semibold text-[#273033]">
              No administrators found
            </p>
            <p className="mt-1 text-[12px] text-[#687173]">
              Try a different search or create a new access level.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-[#f5f8f8]">
                <tr>
                  {[
                    "User",
                    "Role",
                    "Permissions",
                    "Agency access",
                    "Actions",
                  ].map((label) => (
                    <th
                      key={label}
                      className={`px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#687173] ${label === "Actions" ? "text-right" : ""}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[#e7eded] transition-colors hover:bg-[#f8fbfb]"
                  >
                    <td className="px-5 py-4">
                      <p className="text-[14px] font-semibold text-[#172022]">
                        {user.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#687173]">
                        {user.email}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-[13px] font-medium text-[#273033]">
                      {user.role}
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[#566164]">
                      {user.accessList.length} permissions
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#e8f5f5] px-3 py-1.5 text-[11px] font-semibold text-[#176b6d]">
                        {user.agencyScope === "all"
                          ? "All agencies"
                          : `${user.agencyIds.length} agencies`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label={`Remove user ${user.name}`}
                          onClick={() => {
                            setUserToRemove(user);
                            setShowRemoveDialog(true);
                          }}
                          className="rounded-full border border-[#d59489] px-3 py-2 text-[11px] font-semibold text-[#a33e30] hover:bg-[#fff3f1]"
                        >
                          Remove
                        </button>
                        <button
                          aria-label={`Edit user ${user.name}`}
                          onClick={() => openEdit(user)}
                          className="rounded-full border border-[#a9b9ba] px-3 py-2 text-[11px] font-semibold text-[#3e4a4c] hover:bg-[#edf4f4]"
                        >
                          Edit user
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {!isInitialLoading && !error && !configError && pagination.totalPages > 0 && (
          <div className="flex items-center justify-center gap-3 border-t border-[#e6ecec] px-5 py-4">
            <button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4dddd] disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[12px] font-semibold text-[#273033]">
              {pagination.page}{" "}
              <span className="font-normal text-[#7a8587]">
                of {pagination.totalPages}
              </span>
            </span>
            <button
              aria-label="Next page"
              disabled={page >= pagination.totalPages}
              onClick={() =>
                setPage((value) => Math.min(pagination.totalPages, value + 1))
              }
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4dddd] disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <UserAccessModal
        open={isModalOpen}
        onOpenChange={handleModalOpenChange}
        mode={modalMode}
        config={config || undefined}
        initialData={modalInitialData}
        onSave={saveUser}
        agencies={agencies}
        agencySearch={agencySearch}
        isAgenciesLoading={isAgenciesLoading}
        hasMoreAgencies={Boolean(agencyCursor)}
        agencyPageError={agencyPageError}
        agencyHydrationError={agencyHydrationError}
        defaultAgencyScope={defaultAgencyScope}
        onAgencySearchChange={setAgencySearch}
        onLoadMoreAgencies={() => {
          if (agencyCursor)
            void requestAgencyPage({ cursor: agencyCursor, append: true });
        }}
        onRetryAgencyPage={() => {
          void requestAgencyPage();
        }}
        onRetryAgencyHydration={() => {
          if (pendingHydrationIds.length)
            void hydrateAgencyIds(pendingHydrationIds);
        }}
      />
      <SuccessModal
        open={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
        userName={successUserName}
        mode={modalMode}
        warning={accessRefreshWarning}
        isRetrying={isRetryingAccessRefresh}
        onRetry={() => void refreshCurrentAdminAccess()}
      />
      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        title={errorTitle}
        message={errorMessage}
      />
      <ConfirmDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <ConfirmDialogContent
          title="Delete User?"
          description={`Are you sure you want to permanently delete ${userToRemove?.name || "this user"}? This action cannot be undone.`}
          confirmText="Yes, Delete Permanently"
          cancelText="No, Keep It"
          onConfirm={confirmRemove}
          onCancel={() => setShowRemoveDialog(false)}
          isLoading={isRemoving}
          loadingText="Deleting..."
        />
      </ConfirmDialog>
    </div>
  );
}
