import { useState } from "react";
import { Search, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import AddNewUserModal from "../user-levels/AddNewUserModal";
import {
  useListAgencyStaffQuery,
  useDeleteAgencyStaffMutation,
  useCreateAgencyStaffMutation,
  useUpdateAgencyStaffMutation,
  useResetPasswordMutation,
  useToggleActiveMutation,
  type CreateAgencyStaffRequest,
  type UpdateAgencyStaffRequest,
  type AgencyStaffMember,
} from "@/lib/api/agency-staff";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { getInitials } from "@/lib/utils/string-utils";
import { validateImageUrl } from "@/lib/utils/string-utils";

export default function InternalUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AgencyStaffMember | null>(null);

  // Confirmation dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { toast } = useToast();

  // Fetch staff members with search
  const { data, isLoading, error } = useListAgencyStaffQuery({
    page: 1,
    limit: 50,
    search: searchQuery,
  });

  // Mutations
  const [createStaff, { isLoading: isCreating }] = useCreateAgencyStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateAgencyStaffMutation();
  const [deleteStaff, { isLoading: isDeleting }] = useDeleteAgencyStaffMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();
  const [toggleActive, { isLoading: isTogglingActive }] = useToggleActiveMutation();

  const handleCreateStaff = async (staffData: CreateAgencyStaffRequest) => {
    try {
      await createStaff(staffData).unwrap();
      toast({
        title: "Success",
        description: "Agency staff member created successfully",
      });
      setShowAddUserModal(false);
      setEditingStaff(null);
    } catch (err: any) {
      console.error("Failed to create staff:", err);
      toast({
        title: "Error",
        description: err?.data?.error || "Failed to create staff member",
        variant: "destructive",
      });
      throw err; // Re-throw so modal stays open
    }
  };

  const handleUpdateStaff = async (staffData: CreateAgencyStaffRequest) => {
    if (!editingStaff) return;

    try {
      const updateData: UpdateAgencyStaffRequest = {
        name: staffData.name,
        phone: staffData.phone,
        accessList: staffData.accessList,
      };

      // Only include password if it was changed
      if (staffData.password) {
        updateData.password = staffData.password;
      }

      await updateStaff({ id: editingStaff.id, data: updateData }).unwrap();
      toast({
        title: "Success",
        description: "Agency staff member updated successfully",
      });
      setShowAddUserModal(false);
      setEditingStaff(null);
    } catch (err: any) {
      console.error("Failed to update staff:", err);
      toast({
        title: "Error",
        description: err?.data?.error || "Failed to update staff member",
        variant: "destructive",
      });
      throw err; // Re-throw so modal stays open
    }
  };

  const handleEditClick = (staff: AgencyStaffMember) => {
    setEditingStaff(staff);
    setShowAddUserModal(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setSelectedStaff({ id, name });
    setShowDeleteDialog(true);
  };

  const handleResetPasswordClick = (id: string, name: string) => {
    setSelectedStaff({ id, name });
    setShowResetPasswordDialog(true);
  };

  const handleDeactivateClick = (id: string, name: string) => {
    setSelectedStaff({ id, name });
    setShowDeactivateDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedStaff) return;

    try {
      await deleteStaff(selectedStaff.id).unwrap();
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      setShowDeleteDialog(false);
      setSelectedStaff(null);
    } catch (err: any) {
      console.error("Failed to delete staff:", err);
      toast({
        title: "Error",
        description: err?.data?.error || "Failed to delete staff member",
        variant: "destructive",
      });
    }
  };

  const confirmResetPassword = async () => {
    if (!selectedStaff) return;

    try {
      const result = await resetPassword(selectedStaff.id).unwrap();
      toast({
        title: "Success",
        description: result.message || `Password reset link sent to ${selectedStaff.name}`,
      });
      setShowResetPasswordDialog(false);
      setSelectedStaff(null);
    } catch (err: any) {
      console.error("Failed to send reset password link:", err);
      toast({
        title: "Error",
        description: err?.data?.error || "Failed to send password reset link",
        variant: "destructive",
      });
    }
  };

  const confirmDeactivate = async () => {
    if (!selectedStaff) return;

    try {
      const result = await toggleActive(selectedStaff.id).unwrap();
      toast({
        title: "Success",
        description: result.message || `${selectedStaff.name} has been ${result.data.isActive ? 'activated' : 'deactivated'}`,
      });
      setShowDeactivateDialog(false);
      setSelectedStaff(null);
    } catch (err: any) {
      console.error("Failed to toggle staff status:", err);
      toast({
        title: "Error",
        description: err?.data?.error || "Failed to update staff status",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = data?.data || [];
  const hasUsers = !isLoading && filteredUsers.length > 0;
  const isEmpty = !isLoading && filteredUsers.length === 0;

  return (
    <div className="space-y-6">
      <div className="shadow-sm rounded-[16px] bg-[#f7f7f7] p-5">
        {/* Header with Search and New User Button */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-shrink-0 space-y-1">
            <h2 className="text-[24px] font-semibold leading-[1.3] text-[#10141a]">
              Internal Agency Users
            </h2>
            <p className="text-[12px] text-[#808081]">
              The list of internal agency team members and their user levels.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-[280px] md:w-[320px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#a0a0a1]" />
              <Input
                type="text"
                placeholder="Search users by name or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-full border border-[#e0e0e0] bg-white pl-10 text-[14px] placeholder:text-[#a0a0a1] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
              />
            </div>

            <Button
              onClick={() => {
                setEditingStaff(null);
                setShowAddUserModal(true);
              }}
              disabled={isCreating || isUpdating}
              className="h-10 rounded-full px-5 text-[14px] font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" />
              New User
            </Button>
          </div>
        </div>

        {/* Error State */}
        {!!error && (
          <div className="mt-6 rounded-[16px] border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-[14px] text-red-600">
              Failed to load staff members. Please try again.
            </p>
          </div>
        )}

        {/* Users List */}
        <div className="mt-6 space-y-3">
          {/* Loading state with skeletons */}
          {isLoading && (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-6 rounded-[16px] border border-[#f0f0f0] bg-white p-5"
                >
                  <div className="flex min-w-0 flex-shrink-0 items-center gap-4">
                    <Skeleton className="h-[50px] w-[50px] rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-32 rounded-full" />
                      <Skeleton className="h-3 w-40 rounded-full" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-2 w-20 rounded-full" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-14 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Skeleton className="h-9 w-28 rounded-full" />
                    <Skeleton className="h-9 w-24 rounded-full" />
                    <Skeleton className="h-9 w-32 rounded-full" />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#e0e0e0] bg-white px-6 py-10 text-center">
              <h3 className="mb-2 text-[16px] font-semibold text-[#10141a]">
                No internal users yet
              </h3>
              <p className="mb-4 max-w-md text-[13px] text-[#808081]">
                Get started by adding your first internal agency team member. You can assign user
                levels to control what they can see and do in CareOnboard.
              </p>
              <Button
                onClick={() => setShowAddUserModal(true)}
                className="rounded-full px-5 text-[14px] font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add first user
              </Button>
            </div>
          )}

          {/* Populated list */}
          {hasUsers &&
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col items-start gap-4 rounded-[16px] border border-[#f0f0f0] bg-white p-5 md:flex-row md:items-center md:justify-between"
              >
                {/* First Column: Avatar and Name */}
                <div className="flex min-w-0 flex-shrink-0 items-center gap-4">
                  <Avatar className="w-12 h-14 rounded-[8px]">
                    <AvatarImage
                      src={validateImageUrl(user?.avatar) || undefined}
                      alt={user.name}
                      className="rounded-[8px]"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] text-[#10141a] text-[16px] font-semibold rounded-[8px]">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="truncate text-[16px] font-semibold text-[#10141a]">
                      {user.name}
                    </h3>
                    <p className="truncate text-[12px] text-[#808081]">{user.email}</p>
                  </div>
                </div>

                {/* Second Column: User Levels */}
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#4b5563]">
                    User Levels
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.accessList.map((level) => (
                      <span
                        key={level}
                        className="rounded-full bg-[#f5f5f5] px-3 py-1 text-[11px] font-medium text-[#525253]"
                      >
                        {level}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Third Column: Action Buttons */}
                <div className="flex w-full flex-shrink-0 flex-wrap items-center gap-2 md:w-auto md:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleEditClick(user)}
                    disabled={isUpdating}
                    className="h-9 rounded-full px-4 text-[13px] font-normal text-[#4b5563]"
                  >
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleResetPasswordClick(user.id, user.name)}
                    className="h-9 rounded-full px-4 text-[13px] font-normal text-[#4b5563]"
                  >
                    Reset Password
                  </Button>
                  {user.isActive ? (
                    <Button
                      variant="secondary"
                      onClick={() => handleDeactivateClick(user.id, user.name)}
                      className="h-9 rounded-full px-4 text-[13px] font-normal text-[#111827]"
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleDeactivateClick(user.id, user.name)}
                      className="h-9 rounded-full px-4 text-[13px] font-normal text-green-600 border-green-600 hover:bg-green-50"
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteClick(user.id, user.name)}
                    disabled={isDeleting}
                    className="h-9 rounded-full px-4 text-[13px] font-normal"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete User
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <AddNewUserModal
        open={showAddUserModal}
        onClose={() => {
          setShowAddUserModal(false);
          setEditingStaff(null);
        }}
        mode={editingStaff ? "edit" : "create"}
        initialData={
          editingStaff
            ? {
              name: editingStaff.name,
              email: editingStaff.email,
              password: "",
              phone: editingStaff.phone || "",
              accessList: editingStaff.accessList,
            }
            : undefined
        }
        onSave={editingStaff ? handleUpdateStaff : handleCreateStaff}
      />


      {/* Delete Confirmation Dialog */}
      <ConfirmDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmDialogContent
          title="Delete User?"
          description={`Are you sure you want to permanently delete ${selectedStaff?.name || 'this user'}? This will remove their account from Firebase Auth and all data from Firestore. This action cannot be undone.`}
          confirmText="Yes, Delete Permanently"
          cancelText="No, Keep It"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isLoading={isDeleting}
          loadingText="Deleting..."
        />
      </ConfirmDialog>

      {/* Reset Password Confirmation Dialog */}
      <ConfirmDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <ConfirmDialogContent
          title="Reset Password?"
          description={`Are you sure you want to reset the password for ${selectedStaff?.name || 'this user'}? A password reset link will be sent to their email address.`}
          confirmText="Yes, Reset Password"
          cancelText="Cancel"
          onConfirm={confirmResetPassword}
          onCancel={() => setShowResetPasswordDialog(false)}
          isLoading={isResettingPassword}
          loadingText="Sending..."
        />
      </ConfirmDialog>

      {/* Activate/Deactivate Confirmation Dialog */}
      <ConfirmDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <ConfirmDialogContent
          title={selectedStaff ? (filteredUsers.find(u => u.id === selectedStaff.id)?.isActive ? "Deactivate User?" : "Activate User?") : "Toggle User Status?"}
          description={selectedStaff ? (filteredUsers.find(u => u.id === selectedStaff.id)?.isActive
            ? `Are you sure you want to deactivate ${selectedStaff.name}? They will no longer be able to access the agency panel.`
            : `Are you sure you want to activate ${selectedStaff.name}? They will be able to access the agency panel again.`)
            : "Are you sure you want to change this user's status?"}
          confirmText={selectedStaff ? (filteredUsers.find(u => u.id === selectedStaff.id)?.isActive ? "Yes, Deactivate" : "Yes, Activate") : "Yes, Continue"}
          cancelText="Cancel"
          onConfirm={confirmDeactivate}
          onCancel={() => setShowDeactivateDialog(false)}
          isLoading={isTogglingActive}
          loadingText="Updating..."
        />
      </ConfirmDialog>
    </div>
  );
}
