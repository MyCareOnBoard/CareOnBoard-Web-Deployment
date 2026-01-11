import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import UserAccessModal from "./UserAccessModal";
import SuccessModal from "./SuccessModal";
import ErrorDialog from "./ErrorDialog";
import {
  listSuperAdminUsers,
  createSuperAdminUser,
  updateSuperAdminUser,
  removeSuperAdminUser,
  type SuperAdminUser,
} from "@/lib/api/super-admin-users";

interface UserAccess {
  id: string;
  role: string;
  name: string;
  email: string;
  accessStages: number;
  password?: string;
  accessList?: string[];
}

export default function UserAccessControlPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserAccess | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successUserName, setSuccessUserName] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserAccess | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("Error");

  // API integration
  const [userAccesses, setUserAccesses] = useState<UserAccess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch super admins from API
  const fetchSuperAdmins = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listSuperAdminUsers({
        page: 1,
        limit: 100,
        isActive: true,
      });

      const mappedUsers: UserAccess[] = response.data.map((admin) => ({
        id: admin.id,
        role: "Administration",
        name: admin.name,
        email: admin.email,
        password: "", // Never store password in state
        accessStages: admin.accessList.length,
        accessList: admin.accessList,
      }));

      setUserAccesses(mappedUsers);
    } catch (err: any) {
      console.error("Failed to fetch super admins:", err);
      setError(err.message || "Failed to load super admin users");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchSuperAdmins();
  }, []);

  const filteredAccesses = userAccesses.filter((access) =>
    access.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    access.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredAccesses.length / itemsPerPage));
  const paginatedAccesses = filteredAccesses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRemoveAccess = (id: string) => {
    const user = userAccesses.find((u) => u.id === id);
    if (user) {
      setUserToRemove(user);
      setShowRemoveDialog(true);
    }
  };

  const handleConfirmRemove = async () => {
    if (!userToRemove) return;

    setIsRemoving(true);

    try {
      await removeSuperAdminUser(userToRemove.id);

      console.log(`✅ Super admin ${userToRemove.name} deleted permanently`);

      // Refresh the list
      await fetchSuperAdmins();

      // Close dialog
      setShowRemoveDialog(false);
      setUserToRemove(null);
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      setError(err.message || "Failed to delete super admin user");
      setErrorTitle("Delete Failed");
      setErrorMessage(err.message || "Failed to delete super admin user");
      setShowErrorDialog(true);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleEditUser = (id: string) => {
    const user = userAccesses.find((u) => u.id === id);
    if (user) {
      setEditingUser(user);
      setModalMode("edit");
      setIsModalOpen(true);
    }
  };

  const handleNewAccess = () => {
    setEditingUser(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleSaveUser = async (data: {
    name: string;
    email: string;
    password: string;
    accessList: string[];
  }) => {
    setIsLoading(true);

    try {
      if (modalMode === "create") {
        // Create new super admin
        await createSuperAdminUser({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: "", // Optional
          accessList: data.accessList,
        });

        console.log(`✅ Super admin ${data.name} created successfully`);
      } else if (editingUser) {
        // Update existing super admin
        const updateData: any = {
          name: data.name,
          accessList: data.accessList,
        };

        // Only include password if it's provided (not empty)
        if (data.password && data.password.trim() !== "") {
          updateData.password = data.password;
        }

        await updateSuperAdminUser(editingUser.id, updateData);

        console.log(`✅ Super admin ${data.name} updated successfully`);
      }

      // Refresh the list
      await fetchSuperAdmins();

      // Show success modal
      setSuccessUserName(data.name);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error("Failed to save user:", err);
      setError(err.message || "Failed to save super admin user");
      setErrorTitle(modalMode === "create" ? "Create Failed" : "Update Failed");
      setErrorMessage(err.message || "Failed to save super admin user");
      setShowErrorDialog(true);
      // Re-throw error to keep modal open
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize initialData to prevent unnecessary re-renders that could reset modal state
  const modalInitialData = useMemo(() => {
    if (!editingUser) return undefined;
    return {
      name: editingUser.name,
      email: editingUser.email,
      password: editingUser.password || "",
      accessList: editingUser.accessList || [],
    };
  }, [editingUser]);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          User Access Control
        </h1>
        <button
          onClick={handleNewAccess}
          disabled={isLoading}
          className="flex items-center gap-[13px] px-[16px] py-[12px] rounded-[60px] bg-[#2b82ff] backdrop-blur-[22px] hover:bg-[#2775e5] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5 text-white" />
          <span className="text-[14px] font-semibold leading-[1.4] text-white">
            New Access
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
                Global Access Given
              </h2>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081] capitalize">
                These are the list of access given
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative flex items-center gap-[10px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-[60px] pl-[12px] pr-[16px] py-[10px] h-[36px] w-full sm:w-[320px] backdrop-blur overflow-hidden">
              <Search className="w-5 h-5 text-[#808081] shrink-0" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="h-[20px] border-0 bg-transparent px-0 py-0 text-[12px] font-medium leading-[1.4] text-[#10141a] placeholder:text-[#808081] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
              <p className="mt-4 text-sm text-[#808081]">Loading super admin users...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="py-12 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchSuperAdmins}
                className="px-4 py-2 bg-[#00b4b8] text-white rounded-lg hover:bg-[#009a9e] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* User Access Table */}
          {!isLoading && !error && (
            <div className="overflow-x-auto">
              {paginatedAccesses.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[14px] font-medium text-[#808081]">
                    No user access found.
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  {/* Table Header */}
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.05)]">
                      <th className="text-left px-4 py-3 text-[14px] font-semibold leading-[1.4] text-[#808081]">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-[14px] font-semibold leading-[1.4] text-[#808081]">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 text-[14px] font-semibold leading-[1.4] text-[#808081]">
                        Access
                      </th>
                      <th className="text-right px-4 py-3 text-[14px] font-semibold leading-[1.4] text-[#808081]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {paginatedAccesses.map((access) => (
                      <tr
                        key={access.id}
                        className="border-b border-[rgba(0,0,0,0.05)] hover:bg-white/30 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-4 py-4">
                          <p className="text-[16px] font-semibold leading-[1.6] text-black">
                            {access.name}
                          </p>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-4">
                          <p className="text-[14px] font-medium leading-[1.4] text-[#10141a]">
                            {access.email}
                          </p>
                        </td>

                        {/* Access */}
                        <td className="px-4 py-4">
                          <p className="text-[14px] font-medium leading-[1.4] text-black">
                            {access.accessStages} stages
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* Remove Access Button */}
                            <button
                              onClick={() => handleRemoveAccess(access.id)}
                              disabled={isLoading}
                              className="flex items-center justify-center px-[10px] py-[10px] rounded-[60px] bg-[rgba(175,33,14,0.05)] border-[0.5px] border-[#d53411] hover:bg-[rgba(175,33,14,0.1)] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <p className="text-[12px] font-semibold leading-[normal] text-[#d53411] text-center">
                                Remove Access
                              </p>
                            </button>

                            {/* Edit User Button */}
                            <button
                              onClick={() => handleEditUser(access.id)}
                              disabled={isLoading}
                              className="flex items-center justify-center px-[10px] py-[10px] rounded-[60px] bg-[rgba(178,178,179,0.1)] border-[0.5px] border-[#b2b2b3] hover:bg-[rgba(178,178,179,0.2)] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <p className="text-[12px] font-semibold leading-[normal] text-[#565656] text-center">
                                Edit User
                              </p>
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
          {!isLoading && !error && paginatedAccesses.length > 0 && (
            <div className="mt-6 sm:mt-[30px] flex items-center justify-center gap-2">
              <span className="text-[14px] sm:text-[16px] font-medium leading-[1.6] text-[#10141a]">
                {Math.min(currentPage, totalPages)}
                <span className="text-[12px] sm:text-[14px] text-[#808081]">/{totalPages}</span>
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-[145.455px] p-[6px] disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer touch-manipulation"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#10141a]" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* User Access Modal */}
      <UserAccessModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        mode={modalMode}
        initialData={modalInitialData}
        onSave={handleSaveUser}
      />

      {/* Success Modal */}
      <SuccessModal
        open={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
        userName={successUserName}
      />

      {/* Error Dialog */}
      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        title={errorTitle}
        message={errorMessage}
      />

      {/* Remove Access Confirmation Dialog */}
      <ConfirmDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <ConfirmDialogContent
          title="Delete User?"
          description={`Are you sure you want to permanently delete ${userToRemove?.name || 'this user'}? This will remove their account from Firebase Auth and all data from Firestore. This action cannot be undone.`}
          confirmText="Yes, Delete Permanently"
          cancelText="No, Keep It"
          onConfirm={handleConfirmRemove}
          onCancel={() => setShowRemoveDialog(false)}
          isLoading={isRemoving}
          loadingText="Deleting..."
        />
      </ConfirmDialog>
    </div>
  );
}
