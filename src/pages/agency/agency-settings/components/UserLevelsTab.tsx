import { useState } from "react";
import { Plus, Trash2, Pencil, Ellipsis, UsersRound, KeyRound, UserRoundX, UserRoundCheck, UserCheck, UserX, ShieldUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AddNewUserModal from "../user-levels/AddNewUserModal";
import ClientAssignmentDrawer from "../user-levels/ClientAssignmentDrawer";
import CoordinatorAssignmentDrawer from "../user-levels/CoordinatorAssignmentDrawer";
import {
  useListAgencyStaffQuery,
  useDeleteAgencyStaffMutation,
  useCreateAgencyStaffMutation,
  useUpdateAgencyStaffMutation,
  useResetPasswordMutation,
  useToggleActiveMutation,
  useAssignStaffCoordinatorsMutation,
  useAssignStaffClientsMutation,
  type CreateAgencyStaffRequest,
  type UpdateAgencyStaffRequest,
  type AgencyStaffMember,
  type StaffFormValues,
} from "@/lib/api/agency-staff";
import { useToast } from "@/hooks/use-toast";
import { useStaffLabels } from "@/hooks/useStaffLabels";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { getInitials } from "@/lib/utils/string-utils";
import { validateImageUrl } from "@/lib/utils/string-utils";
import { AgencyPageHeader, AgencyStatCard } from "@/components/agency/AgencyShell";
import { WorkforceIcon } from "@/components/agency/AgencyIcons";
import {
  AgencyListCard, AgencyPagination, AgencyPill, AgencySearchField, agencyMenuContent, agencyMenuItem, agencyPrimaryButton,
  agencyRowMenuButton, agencyTd, agencyTh, agencyTheadRow, agencyTr,
} from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types/user.types";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

export default function InternalUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AgencyStaffMember | null>(null);
  const [assignmentStaff, setAssignmentStaff] = useState<AgencyStaffMember | null>(null);
  const [clientAssignmentStaff, setClientAssignmentStaff] = useState<AgencyStaffMember | null>(null);
  const { user: signedInUser } = useAuth();
  const activeMode = useEffectiveAgencyMode();
  const isAgencyOwner = signedInUser?.userType === UserType.AGENCY;
  const agencyClientTypes = signedInUser?.agency?.supportedClientTypes ?? ["ddd", "hha"];
  // DDD/HHA programs whose clients a staff member can be given; empty without Client Management.
  const clientModesFor = (staff: AgencyStaffMember) => staff.accessList.includes("Client Management")
    ? (staff.agencyModes?.length ? staff.agencyModes : ["ddd", "hha"] as const)
      .filter((mode): mode is "ddd" | "hha" => mode !== "sc" && agencyClientTypes.includes(mode))
    : [];

  // Confirmation dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { toast } = useToast();

  const { labels } = useStaffLabels();
  const accessLabel = (key: string) => {
    if (key === "Scheduling") return "Shift Management";
    if (key === "DSP Management") return `${labels.title} Management`;
    return key;
  };

  // Fetch staff members with search
  const { data, isLoading, error } = useListAgencyStaffQuery({
    page: 1,
    limit: 50,
    search: searchQuery,
  });

  // Mutations
  const [createStaff, { isLoading: isCreating }] = useCreateAgencyStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateAgencyStaffMutation();
  const [assignStaffCoordinators] = useAssignStaffCoordinatorsMutation();
  const [assignStaffClients] = useAssignStaffClientsMutation();
  const [deleteStaff, { isLoading: isDeleting }] = useDeleteAgencyStaffMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();
  const [toggleActive, { isLoading: isTogglingActive }] = useToggleActiveMutation();

  const handleCreateStaff = async (staffData: StaffFormValues) => {
    try {
      // Create-mode gating guarantees the HR fields are present, so this is safe.
      const result = await createStaff(staffData as CreateAgencyStaffRequest).unwrap();
      toast({
        title: result.emailSent === false ? "Staff added — email unconfirmed" : "Staff member added",
        description: result.message,
        variant: result.emailSent === false ? "warning" : "default",
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

  const handleUpdateStaff = async (staffData: StaffFormValues) => {
    if (!editingStaff) return;

    try {
      const updateData: UpdateAgencyStaffRequest = {
        name: staffData.name,
        phone: staffData.phone,
        accessList: staffData.accessList,
        agencyModes: staffData.agencyModes,
        role: staffData.role,
        employmentType: staffData.employmentType,
        billingType: staffData.billingType,
        billingRate: staffData.billingRate,
      };

      // Only include password if it was changed
      if (staffData.password) {
        updateData.password = staffData.password;
      }

      await updateStaff({ id: editingStaff.id, data: updateData }).unwrap();
      toast({
        title: "Changes saved",
        description: "Staff member updated successfully.",
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
        title: "Staff member removed",
        description: "Their account has been permanently deleted.",
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

  const totalStaff = data?.pagination?.total ?? filteredUsers.length;
  const activeStaff = filteredUsers.filter((user) => user.isActive).length;
  const inactiveStaff = filteredUsers.length - activeStaff;
  const statValue = (value: number) => (isLoading ? "—" : value);
  const chip = "inline-flex h-6 items-center whitespace-nowrap rounded-[6px] border border-[#e4e7ea] px-2 text-[12px] text-[#2a3138] dark:border-white/15 dark:text-[#c9d1d4]";

  return (
    <div className="min-w-0 pb-6">
      <AgencyPageHeader
        icon={ShieldUser}
        title="Staff management"
        description="Add staff and manage their access to the agency dashboard."
        actions={<>
          <AgencySearchField
            label="Search staff"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full sm:w-[280px]"
          />
          <button
            type="button"
            onClick={() => {
              setEditingStaff(null);
              setShowAddUserModal(true);
            }}
            disabled={isCreating || isUpdating}
            className={agencyPrimaryButton}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add staff member
          </button>
        </>}
      />

      {/* Summary */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <AgencyStatCard icon={WorkforceIcon} label="Staff members" value={statValue(totalStaff)} footnote="Staff who can access the agency dashboard." />
        <AgencyStatCard icon={UserCheck} label="Active" value={statValue(activeStaff)} footnote="Can sign in and use the dashboard." />
        <AgencyStatCard icon={UserX} label="Inactive" value={statValue(inactiveStaff)} footnote="Deactivated; they cannot sign in." />
      </div>

      <AgencyListCard label="Staff members" className="mt-5">
        <div className="p-4">
          <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Staff members</h2>
          <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Assign access levels to control what each person can see and do.</p>
        </div>

        {/* Error State */}
        {!!error && (
          <div role="alert" className="border-t border-[#eceef0] px-6 py-10 text-center text-[14px] text-[#b42318] dark:border-white/10 dark:text-[#f8a1a1]">
            Could not load staff members. Please try again.
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div role="status" aria-label="Loading staff members" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} aria-hidden="true" className="h-[66px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !error && (
          <div className="flex flex-col items-center justify-center border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
            <h3 className="mb-2 text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
              No staff members yet
            </h3>
            <p className="mb-4 max-w-md text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
              Add your first staff member to get started. Assign access levels to control what each person can see and do.
            </p>
            <button type="button" onClick={() => setShowAddUserModal(true)} className={agencyPrimaryButton}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add first staff member
            </button>
          </div>
        )}

        {/* Populated list */}
        {hasUsers && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>Staff member</th>
                  <th scope="col" className={agencyTh}>Role</th>
                  <th scope="col" className={agencyTh}>Access</th>
                  <th scope="col" className={agencyTh}>Assigned</th>
                  <th scope="col" className={agencyTh}>Status</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const showCoordinators = (activeMode === "sc" || activeMode === null) && user.agencyModes?.includes("sc");
                  const showClients = activeMode !== "sc" && clientModesFor(user).length > 0;
                  return (
                  <tr key={user.id} className={agencyTr}>
                    <td className={agencyTd}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage
                            src={validateImageUrl(user?.avatar) || undefined}
                            alt={user.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-[#e0f3f3] text-[13px] font-medium text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[#10141a] dark:text-[#f4f6f7]">{user.name}</p>
                          <p className="truncate text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={agencyTd}>{user.role || "—"}</td>
                    <td className={cn(agencyTd, "max-w-[340px]")}>
                      <div className="flex flex-wrap gap-1.5">
                        {user.agencyModes?.map((m) => (
                          <AgencyPill key={m} tone="teal" className="uppercase">{m}</AgencyPill>
                        ))}
                        {user.accessList.map((level) => (
                          <span key={level} className={chip}>{accessLabel(level)}</span>
                        ))}
                      </div>
                    </td>
                    <td className={cn(agencyTd, "whitespace-nowrap text-[13px]")}>
                      {showCoordinators && <p>{user.managedCoordinatorIds?.length || 0} coordinators assigned</p>}
                      {showClients && <p>{user.managedClientIds?.length || 0} client{user.managedClientIds?.length === 1 ? "" : "s"} assigned</p>}
                      {!showCoordinators && !showClients && <span className="text-[#6b737a]">—</span>}
                    </td>
                    <td className={agencyTd}>
                      <AgencyPill tone={user.isActive ? "green" : "grey"}>{user.isActive ? "Active" : "Inactive"}</AgencyPill>
                    </td>
                    <td className={cn(agencyTd, "text-right")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label={`Actions for ${user.name}`} className={cn(agencyRowMenuButton, "ml-auto")}>
                        <Ellipsis aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className={cn(agencyMenuContent, "w-60 max-w-[calc(100vw-2rem)]")}>
                      <DropdownMenuLabel className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b737a]">Staff actions</DropdownMenuLabel>
                      <DropdownMenuItem className={agencyMenuItem} disabled={isUpdating} onSelect={() => handleEditClick(user)}>
                        <Pencil aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" /> Edit staff member
                      </DropdownMenuItem>
                      {/* DDD/HHA: pick the clients staff with Client Management manage. SC: pick coordinators. */}
                      {isAgencyOwner && activeMode !== "sc" && clientModesFor(user).length > 0 && <DropdownMenuItem className={agencyMenuItem} onSelect={() => setClientAssignmentStaff(user)}>
                        <UsersRound aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />
                        Manage clients
                      </DropdownMenuItem>}
                      {isAgencyOwner && (activeMode === "sc" || (activeMode === null && user.agencyModes?.includes("sc"))) && <DropdownMenuItem className={agencyMenuItem} onSelect={() => setAssignmentStaff(user)}>
                        <UsersRound aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />
                        Manage coordinators
                      </DropdownMenuItem>}
                      <DropdownMenuItem className={agencyMenuItem} onSelect={() => handleResetPasswordClick(user.id, user.name)}>
                        <KeyRound aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" /> Reset password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 bg-[#eceef0] dark:bg-white/10" />
                      <DropdownMenuItem className={cn(agencyMenuItem, user.isActive ? "text-[#7a5800] focus:!bg-[#fcf5dc] focus:!text-[#7a5800]" : "text-[#007679]")} onSelect={() => handleDeactivateClick(user.id, user.name)}>
                        {user.isActive ? <UserRoundX aria-hidden="true" className="h-4 w-4" /> : <UserRoundCheck aria-hidden="true" className="h-4 w-4" />}
                        {user.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" className={cn(agencyMenuItem, "text-[#b42318] focus:!bg-[#fdf2f1] focus:!text-[#b42318] [&_svg]:!text-current")} disabled={isDeleting} onSelect={() => handleDeleteClick(user.id, user.name)}>
                        <Trash2 aria-hidden="true" className="h-4 w-4" /> Delete staff member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasUsers && (
          <AgencyPagination
            summary={`Showing ${filteredUsers.length} of ${totalStaff} staff member${totalStaff === 1 ? "" : "s"}`}
            page={1}
            pages={1}
            onPage={() => {}}
          />
        )}
      </AgencyListCard>

      {assignmentStaff && <CoordinatorAssignmentDrawer
        key={assignmentStaff.id}
        staffName={assignmentStaff.name}
        agencyId={assignmentStaff.agencyId}
        assignedIds={assignmentStaff.managedCoordinatorIds || []}
        canAssign={assignmentStaff.agencyModes?.includes("sc") || false}
        onClose={() => setAssignmentStaff(null)}
        onSave={async (coordinatorIds, expectedCoordinatorIds) => {
          await assignStaffCoordinators({ id: assignmentStaff.id, coordinatorIds, expectedCoordinatorIds }).unwrap();
          toast({ title: "Assignments saved", description: `${assignmentStaff.name}'s coordinators were updated.` });
        }}
      />}

      {clientAssignmentStaff && <ClientAssignmentDrawer
        key={clientAssignmentStaff.id}
        staffName={clientAssignmentStaff.name}
        agencyId={clientAssignmentStaff.agencyId}
        modes={clientModesFor(clientAssignmentStaff)}
        assignedIds={clientAssignmentStaff.managedClientIds || []}
        canAssign={clientModesFor(clientAssignmentStaff).length > 0}
        onClose={() => setClientAssignmentStaff(null)}
        onSave={async (clientIds, expectedClientIds) => {
          await assignStaffClients({ id: clientAssignmentStaff.id, clientIds, expectedClientIds }).unwrap();
          toast({ title: "Assignments saved", description: `${clientAssignmentStaff.name}'s clients were updated.` });
        }}
      />}

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
              agencyModes: editingStaff.agencyModes,
              role: editingStaff.role,
              employmentType: editingStaff.employmentType,
              billingType: editingStaff.billingType,
              billingRate: editingStaff.billingRate,
            }
            : undefined
        }
        onSave={editingStaff ? handleUpdateStaff : handleCreateStaff}
      />


      {/* Delete Confirmation Dialog */}
      <ConfirmDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmDialogContent
          title="Delete staff member?"
          description={`Permanently delete ${selectedStaff?.name || "this staff member"}? Their account and all associated data will be removed. This cannot be undone.`}
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
          title="Reset password?"
          description={`Send a password reset link to ${selectedStaff?.name || "this staff member"}? The link will be sent to their email address.`}
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
          title={selectedStaff ? (filteredUsers.find(u => u.id === selectedStaff.id)?.isActive ? "Deactivate staff member?" : "Activate staff member?") : "Change status?"}
          description={selectedStaff ? (filteredUsers.find(u => u.id === selectedStaff.id)?.isActive
            ? `Deactivate ${selectedStaff.name}? They will no longer be able to sign in or access the agency dashboard.`
            : `Activate ${selectedStaff.name}? They will be able to sign in and access the agency dashboard again.`)
            : "Change this staff member's status?"}
          confirmText={selectedStaff ? (filteredUsers.find(u => u.id === selectedStaff.id)?.isActive ? "Deactivate" : "Activate") : "Continue"}
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
