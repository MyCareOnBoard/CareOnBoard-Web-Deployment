import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, X, Check } from "lucide-react";
import { getInitials, validateImageUrl } from "@/lib/utils/string-utils";

interface User {
  id: string;
  name: string;
  role: string;
  agency?: string;
  avatar: string;
  image?: string;
}

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoadingContacts: boolean;
  users: User[];
  onStartChat: (selectedUserIds: string[]) => void;
}

export default function NewMessageModal({
  open,
  onOpenChange,
  isLoadingContacts,
  users,
  onStartChat,
}: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer (300ms)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(value);
    }, 300);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleCancel();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleStartChat = () => {
    if (selectedUsers.length > 0) {
      onStartChat(selectedUsers);
      setSelectedUsers([]);
      setSearchQuery("");
      setDebouncedSearchQuery("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedUsers([]);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    onOpenChange(false);
  };

  // Filter users by name OR agency name (case-insensitive)
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return users;

    const searchLower = debouncedSearchQuery.toLowerCase().trim();
    return users.filter((user) =>
      user.name.toLowerCase().includes(searchLower) ||
      (user.agency && user.agency.toLowerCase().includes(searchLower))
    );
  }, [users, debouncedSearchQuery]);

  // Group users by agency, with super admins at the end
  const groupedContacts = useMemo(() => {
    const groups: { [key: string]: User[] } = {};
    const superAdmins: User[] = [];

    filteredUsers.forEach((user) => {
      if (user.role === "Super Admin") {
        superAdmins.push(user);
      } else {
        const groupKey = user.agency || "Other";
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(user);
      }
    });

    // Sort agency names alphabetically
    const sortedGroups = Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ name: key, users: groups[key] }));

    // Add super admins at the end if any exist
    if (superAdmins.length > 0) {
      sortedGroups.push({ name: "Super Admins", users: superAdmins });
    }

    return sortedGroups;
  }, [filteredUsers]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[500px] bg-white rounded-[20px] shadow-2xl overflow-hidden">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5">
            <h2 className="text-[18px] font-bold text-[#10141a]">
              New Message
            </h2>
            <button
              onClick={handleCancel}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors"
            >
              <X className="w-5 h-5 text-[#10141a]" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {/* Search Input */}
            <div className="relative mb-5">
              <div className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2">
                <Search className="w-[18px] h-[18px] text-[#a0a0a1]" />
              </div>
              <Input
                type="text"
                placeholder="Search by name or agency"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-11 pl-10 pr-4 bg-[#f5f5f5] border-0 rounded-[10px] text-[14px] text-[#10141a] placeholder:text-[#a0a0a1] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
              />
            </div>

            {/* User List */}
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto space-y-2 mb-5">
              {isLoadingContacts ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-[#e5e7eb] border-t-[#2563eb] animate-spin mx-auto mb-2"></div>
                    <p className="text-[14px] text-[#808081]">Loading contacts...</p>
                  </div>
                </div>
              ) : groupedContacts.length > 0 ? (
                groupedContacts.map((group) => (
                  <div key={group.name} className="mb-4">
                    {/* Group Header */}
                    <div className="px-3 py-2 mb-1">
                      <h3 className="text-[12px] font-semibold text-[#808081] uppercase tracking-wide">
                        {group.name}
                      </h3>
                    </div>
                    {/* Group Users */}
                    {group.users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className="flex items-center justify-between px-3 py-3 hover:bg-[#f5f5f5] rounded-[10px] cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <Avatar className="w-12 h-14 shrink-0 rounded-[8px]">
                            <AvatarImage
                              src={validateImageUrl(user.image) || undefined}
                              alt={user.name}
                              className="rounded-[8px]"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] text-[#10141a] text-[14px] font-semibold rounded-[8px]">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>

                          {/* User Info */}
                          <div className="flex flex-col">
                            <h4 className="text-[15px] font-semibold text-[#10141a] leading-tight mb-0.5">
                              {user.name}
                            </h4>
                            <p className="text-[13px] text-[#808081] leading-tight">
                              {user.role}
                            </p>
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-[4px] border-[1.5px] flex items-center justify-center transition-all ${selectedUsers.includes(user.id)
                            ? "bg-[#2563eb] border-[#2563eb]"
                            : "border-[#d1d5db] group-hover:border-[#a0a0a1]"
                            }`}
                        >
                          {selectedUsers.includes(user.id) && (
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-[200px] text-center text-[#808081] text-[14px]">
                  No contacts found
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCancel}
                className="flex-1 h-12 bg-white hover:bg-[#f5f5f5] text-[#10141a] border border-[#e5e5e6] rounded-full text-[15px] font-medium transition-colors shadow-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartChat}
                disabled={selectedUsers.length === 0}
                className="flex-1 h-12 bg-[#7c9ff5] hover:bg-[#6b8fe5] text-white rounded-full text-[15px] font-medium transition-colors shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Chat
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}