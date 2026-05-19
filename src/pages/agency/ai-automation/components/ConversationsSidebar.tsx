import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { useDeleteConversationMutation, useListConversationsQuery } from "../api";
import { cn } from "@/lib/utils";

interface ConversationsSidebarProps {
  open: boolean;
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function ConversationsSidebar({
  open,
  activeId,
  onClose,
  onSelect,
  onNew,
}: ConversationsSidebarProps) {
  const { data, isLoading } = useListConversationsQuery(undefined, { skip: !open });
  const [deleteConversation] = useDeleteConversationMutation();

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(id).unwrap();
      if (activeId === id) onNew();
    } catch {
      // swallow; toast handled at page level if needed
    }
  };

  function setOpen(open: boolean): void {
    if (!open) {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="right-0 left-auto top-0 h-[100vh] max-h-[100vh] translate-x-0 translate-y-0 w-[95vw] max-w-none sm:max-w-md  m-3 rounded-xl sm:rounded-xl p-4 sm:p-4">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-[18px] sm:text-[20px]">Recent Conversations</DialogTitle>
            <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 hover:bg-muted transition"
          >
            <div className="bg-gray-100 rounded-full p-1 hover:bg-red-200 transition cursor-pointer">
              <X className="h-5 w-5" />
            </div>
            
          </button>
        </DialogHeader>

        {/* New Conversation Button */}
        <Button variant="outline" onClick={onNew} className="flex justify-between w-full rounded-xl my-3 sm:mt-4 text-[13px] border-2 border-gray-400 border-dashed p-5 sm:text-[14px] hover:bg-[#00b4b8] hover:text-white transition cursor-pointer">
          Start a new conversation 
            <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full border">
            <Plus className="h-3 w-3" />
          </button>
        </Button>

        <div className="flex flex-col gap-1 max-h-[90vh] sm:max-h-[90vh] overflow-y-auto -mx-2 px-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="w-full h-14 rounded-xl" />
            ))}

          {!isLoading && (!data?.conversations || data.conversations.length === 0) && (
            <p className="text-[13px] sm:text-[14px] text-[#6b7280] text-center py-8">
              No conversations yet
            </p>
          )}

          {data?.conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              onClick={() => {
                onSelect(conversation.id);
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-[12px] sm:rounded-xl px-3 py-2.5 sm:py-3 text-left transition-colors group",
                activeId === conversation.id
                  ? "bg-[#e0f7f7] text-[#00b4b8]"
                  : "hover:bg-[#f3f4f6] text-[#10141a]"
              )}
            >
              <MessageSquare className="flex-shrink-0 w-4 h-4 opacity-70" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] sm:text-[13px] font-medium truncate">
                  {conversation.title || "New conversation"}
                </p>
                <p className="text-[11px] text-[#6b7280]">
                  {conversation.messageCount} messages
                </p>
              </div>
              <button
                type="button"
                onClick={(event) => handleDelete(event, conversation.id)}
                className="transition-opacity opacity-0 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
