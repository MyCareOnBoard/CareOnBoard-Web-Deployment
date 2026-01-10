import React, { useState } from "react";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import UserAccessModal from "./UserAccessModal";
import SuccessModal from "./SuccessModal";

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
  const itemsPerPage = 1;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserAccess | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successUserName, setSuccessUserName] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserAccess | null>(null);

  // Mock data - replace with actual API call
  const [userAccesses, setUserAccesses] = useState<UserAccess[]>([
    {
      id: "1",
      role: "Administration",
      name: "Corporate Billing Admin",
      email: "nurnabi@torq.agency",
      accessStages: 4,
      password: "defaultPassword123",
      accessList: [
        "Agency directory",
        "User Access Control",
        "Global Notes Quality",
        "Corporate Support",
      ],
    },
    // Add more mock data as needed
  ]);

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

  const handleConfirmRemove = () => {
    if (userToRemove) {
      setUserAccesses((prev) => prev.filter((user) => user.id !== userToRemove.id));
      setShowRemoveDialog(false);
      setUserToRemove(null);
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

  const handleSaveUser = (data: {
    name: string;
    email: string;
    password: string;
    accessList: string[];
  }) => {
    if (modalMode === "create") {
      const newUser: UserAccess = {
        id: Date.now().toString(),
        role: "Administration",
        name: data.name,
        email: data.email,
        password: data.password,
        accessStages: data.accessList.length,
        accessList: data.accessList,
      };
      setUserAccesses((prev) => [...prev, newUser]);
      
      // Show success modal
      setSuccessUserName(data.name);
      setIsSuccessModalOpen(true);
    } else if (editingUser) {
      setUserAccesses((prev) =>
        prev.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                name: data.name,
                email: data.email,
                password: data.password,
                accessStages: data.accessList.length,
                accessList: data.accessList,
              }
            : user
        )
      );
      
      // Show success modal
      setSuccessUserName(data.name);
      setIsSuccessModalOpen(true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          User Access Control
        </h1>
        <button
          onClick={handleNewAccess}
          className="flex items-center gap-[13px] px-[16px] py-[12px] rounded-[60px] bg-[#2b82ff] backdrop-blur-[22px] hover:bg-[#2775e5] transition-colors cursor-pointer whitespace-nowrap"
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

          {/* User Access List */}
          <div className="space-y-[16px]">
            {paginatedAccesses.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[14px] font-medium text-[#808081]">
                  No user access found.
                </p>
              </div>
            ) : (
              paginatedAccesses.map((access) => (
                <div
                  key={access.id}
                  className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-[16px] backdrop-blur-[20px] rounded-[20px] p-4 lg:p-0"
                >
                  {/* Role Badge */}
                  <div className="flex items-center justify-center px-[10px] py-[10px] rounded-[60px] bg-[rgba(128,128,129,0.05)] border-[0.5px] border-[#525253] shrink-0 w-fit">
                    <p className="text-[12px] font-semibold leading-[normal] text-[#525253] text-center">
                      {access.role}
                    </p>
                  </div>

                  {/* User Info */}
                  <div className="flex flex-col sm:flex-row lg:flex-1 sm:items-center gap-4 sm:gap-6 lg:gap-[64px] min-w-0">
                    <div className="lg:shrink-0">
                      <p className="text-[16px] font-semibold leading-[1.6] text-black break-words">
                        {access.name}
                      </p>
                    </div>

                    <div className="flex-1 sm:flex-initial sm:w-auto lg:w-[139px] lg:shrink-0">
                      <p className="text-[14px] font-medium leading-[1.4] text-[#808081] mb-0">
                        Email
                      </p>
                      <p className="text-[14px] font-medium leading-[1.4] text-[#10141a] break-all">
                        {access.email}
                      </p>
                    </div>

                    <div className="flex-1 sm:flex-initial sm:w-auto lg:w-[129px] lg:shrink-0">
                      <p className="text-[14px] font-medium leading-[1.4] text-[#808081] mb-0">
                        Access
                      </p>
                      <p className="text-[14px] font-medium leading-[1.4] text-black">
                        {access.accessStages} stages
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:shrink-0">
                    {/* Remove Access Button */}
                    <button
                      onClick={() => handleRemoveAccess(access.id)}
                      className="flex items-center justify-center px-[10px] py-[10px] rounded-[60px] bg-[rgba(175,33,14,0.05)] border-[0.5px] border-[#d53411] hover:bg-[rgba(175,33,14,0.1)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <p className="text-[12px] font-semibold leading-[normal] text-[#d53411] text-center">
                        Remove Access
                      </p>
                    </button>

                    {/* Edit User Button */}
                    <button
                      onClick={() => handleEditUser(access.id)}
                      className="flex items-center justify-center px-[10px] py-[10px] rounded-[60px] bg-[rgba(178,178,179,0.1)] border-[0.5px] border-[#b2b2b3] hover:bg-[rgba(178,178,179,0.2)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <p className="text-[12px] font-semibold leading-[normal] text-[#565656] text-center">
                        Edit User
                      </p>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
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
        </div>
      </div>

      {/* User Access Modal */}
      <UserAccessModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        mode={modalMode}
        initialData={
          editingUser
            ? {
                name: editingUser.name,
                email: editingUser.email,
                password: editingUser.password || "",
                accessList: editingUser.accessList || [],
              }
            : undefined
        }
        onSave={handleSaveUser}
      />

      {/* Success Modal */}
      <SuccessModal
        open={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
        userName={successUserName}
      />

      {/* Remove Access Confirmation Dialog */}
      <ConfirmDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <ConfirmDialogContent
          title="Remove Access?"
          description={`Are you sure you want to remove access for ${userToRemove?.name || 'this user'}? This action cannot be undone.`}
          confirmText="Yes, Remove Access"
          cancelText="No, Keep It"
          onConfirm={handleConfirmRemove}
          onCancel={() => setShowRemoveDialog(false)}
        />
      </ConfirmDialog>
    </div>
  );
}
