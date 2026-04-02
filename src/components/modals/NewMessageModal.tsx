import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Check } from "lucide-react";

interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  image?: string;
  uid?: string;
  email?: string;
}

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onStartChat: (selectedUser: User) => void;
  loading?: boolean;
}

export default function NewMessageModal({
  open,
  onOpenChange,
  users,
  onStartChat,
  loading = false,
}: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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

  const handleStartChat = () => {
    if (selectedUser) {
      onStartChat(selectedUser);
      setSelectedUser(null);
      setSearchQuery("");
    }
  };

  const handleCancel = () => {
    setSelectedUser(null);
    setSearchQuery("");
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                placeholder="Search here"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-10 pr-4 bg-[#f5f5f5] border-0 rounded-[10px] text-[14px] text-[#10141a] placeholder:text-[#a0a0a1] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
              />
            </div>

            {/* User List */}
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto space-y-2 mb-5">
              {loading ? (
                <div className="flex items-center justify-center h-[200px] text-center text-[#808081] text-[14px]">
                  Loading contacts...
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="flex items-center justify-between px-3 py-3 hover:bg-[#f5f5f5] rounded-[10px] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative w-12 h-12 shrink-0">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="object-cover w-full h-full rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00b8d4] to-[#0095b3] flex items-center justify-center">
                            <span className="text-[14px] font-semibold text-white">
                              {getInitials(user.name)}
                            </span>
                          </div>
                        )}
                      </div>

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
                      className={`w-5 h-5 rounded-[4px] border-[1.5px] flex items-center justify-center transition-all ${
                        selectedUser?.id === user.id
                          ? "bg-[#2563eb] border-[#2563eb]"
                          : "border-[#d1d5db] group-hover:border-[#a0a0a1]"
                      }`}
                    >
                      {selectedUser?.id === user.id && (
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      )}
                    </div>
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
                disabled={!selectedUser}
                className="flex-1 h-12 bg-[#00b8d4] hover:bg-[#00a5c0] text-white rounded-full text-[15px] font-medium transition-colors shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
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