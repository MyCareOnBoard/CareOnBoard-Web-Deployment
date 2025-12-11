import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, X, Check } from "lucide-react";

interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  image?: string;
}

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onStartChat: (selectedUserIds: string[]) => void;
}

export default function NewMessageModal({
  open,
  onOpenChange,
  users,
  onStartChat,
}: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

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
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedUsers([]);
    setSearchQuery("");
    onOpenChange(false);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white rounded-[24px] border-0 shadow-lg">
        <div className="pt-3 pb-5">
          {/* Header */}
          <div className="flex justify-between mb-5">
            <DialogTitle className="text-[20px] font-bold text-[#10141a] leading-tight">
              New Message
            </DialogTitle>
            <button
              onClick={handleCancel}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f8f9fa] transition-colors"
            >
              <X className="w-5 h-5 text-[#10141a]" />
            </button>
          </div>

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
              className="h-11 pl-10 pr-4 bg-[#f8f9fa] border-0 rounded-[10px] text-[15px] text-[#10141a] placeholder:text-[#a0a0a1] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
            />
          </div>

          {/* User List */}
          <div className="mb-5 max-h-[320px] overflow-y-auto -mx-1 px-1">
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  className="flex items-center justify-between px-1 py-3 hover:bg-[#f8f9fa] rounded-[10px] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0 w-11 h-11">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="object-cover w-full h-full rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-linear-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center">
                          <span className="text-[15px] font-semibold text-[#10141a]">
                            {user.avatar}
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
                      selectedUsers.includes(user.id)
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
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleCancel}
              className="flex-1 h-12 bg-transparent hover:bg-[#f8f9fa] text-[#808081] hover:text-[#10141a] border border-[#e5e5e6] rounded-full text-[15px] font-medium transition-colors shadow-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartChat}
              disabled={selectedUsers.length === 0}
              className="flex-1 h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full text-[15px] font-medium transition-colors shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}