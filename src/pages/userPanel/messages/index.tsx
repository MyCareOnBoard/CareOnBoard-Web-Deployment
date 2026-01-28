import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { router } from "@/routes";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { useMessaging } from "@/contexts/MessagingContext";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ConversationHeader } from "@/components/chat/ConversationHeader";
import { getUserContacts, AgencyContact } from "@/lib/api/userMessaging";
import NewMessageModal from "./components/NewMessageModal";
import { getInitials } from "@/lib/utils/string-utils";

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const messaging = useMessaging();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [contacts, setContacts] = useState<AgencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showChatView, setShowChatView] = useState(false); // Mobile: toggle between list and chat

  // Track which messages have been marked as read to avoid duplicate calls
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Load conversation from URL parameter
  useEffect(() => {
    if (conversationId && conversationId !== messaging.currentConversation?.id) {
      messaging.selectConversation(conversationId);
    } else if (!conversationId && messaging.currentConversation) {
      // Clear selection if no conversationId in URL
      messaging.selectConversation(null);
    }
  }, [conversationId, messaging.currentConversation?.id]);

  // Fetch contacts when modal opens
  useEffect(() => {
    if (isNewMessageModalOpen) {
      fetchContacts();
    }
  }, [isNewMessageModalOpen]);

  // Show chat view when conversation is selected (for mobile)
  useEffect(() => {
    if (messaging.currentConversation && window.innerWidth < 1024) {
      setShowChatView(true);
    }
  }, [messaging.currentConversation?.id]);

  // Mark messages as read when conversation is selected (optimized)
  useEffect(() => {
    if (!messaging.currentConversation || !user?.uid) return;

    // Reset marked set when conversation changes
    markedAsReadRef.current.clear();
  }, [messaging.currentConversation?.id, user?.uid]);

  useEffect(() => {
    if (!messaging.currentConversation || messaging.currentMessages.length === 0 || !user?.uid) return;

    const unreadMessageIds = messaging.currentMessages
      .filter((msg) =>
        msg.senderId !== user.uid &&
        !msg.isRead &&
        !markedAsReadRef.current.has(msg.id) // Skip already marked
      )
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      // Mark as processed immediately to avoid race conditions
      unreadMessageIds.forEach(id => markedAsReadRef.current.add(id));
      messaging.markAsRead(messaging.currentConversation.id, unreadMessageIds);
    }
  }, [messaging.currentConversation?.id, messaging.currentMessages.length, user?.uid]);

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const contactsData = await messaging.getContacts();
      setContacts(contactsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleCreateConversation = async (selectedUserIds: string[]) => {
    if (selectedUserIds.length === 0) return;

    try {
      const newConversation = await messaging.createConversation(selectedUserIds);
      if (newConversation) {
        setIsNewMessageModalOpen(false);
      }
    } catch (error: any) {
      // Error already handled in context
    }
  };

  const handleDeleteConversation = async () => {
    if (!messaging.currentConversation) return;

    try {
      await messaging.deleteConversation(messaging.currentConversation.id);
      messaging.selectConversation(null);
    } catch (error: any) {
      // Error already handled in context
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!messaging.currentConversation?.id) {
      toast({
        title: "Error",
        description: "No conversation selected",
        variant: "destructive",
      });
      return;
    }
    await messaging.sendMessage(messaging.currentConversation.id, content);
  };

  // Handle conversation selection on mobile
  const handleSelectConversation = (id: string) => {
    messaging.selectConversation(id);
    setShowChatView(true); // Show chat view on mobile
    // Navigate to conversation URL
    router.navigate(`/user-panel/messages/${id}`);
  };

  // Handle back button on mobile chat view
  const handleBackToList = () => {
    setShowChatView(false);
    messaging.selectConversation(null);
    // Navigate back to base messages route
    router.navigate("/user-panel/messages");
  };

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-160px)] min-h-0">
        {/* Top Header with New Message Button */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e5e7eb] flex-shrink-0">
          <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-[#10141a]">Messages</h1>
          <Button
            onClick={() => setIsNewMessageModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[#00b8d4] hover:bg-[#00a5c0] text-white rounded-lg font-medium text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Message</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden bg-white shadow-sm rounded-2xl min-h-0">
          {/* Left Panel - Conversations List */}
          <div className={`${showChatView ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-[380px] xl:w-[420px] border-r border-[#e5e7eb] flex-shrink-0`}>
            <ConversationList
              conversations={messaging.conversations}
              selectedConversationId={messaging.currentConversation?.id || null}
              onSelectConversation={handleSelectConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              loading={messaging.loading}
              currentUserId={user?.uid}
            />
          </div>

          {/* Right Panel - Chat Area */}
          <div className={`${showChatView ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-[#f9fafb] min-w-0`}>
            {messaging.currentConversation ? (
              <>
                {/* Chat Header with Back Button on Mobile */}
                <div className="flex-shrink-0">
                  <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[#e5e7eb] bg-white">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToList}
                      className="p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    <span className="text-sm font-medium text-[#10141a]">Back to Conversations</span>
                  </div>
                  <ConversationHeader
                    conversation={messaging.currentConversation}
                    currentUserId={user?.uid}
                    onDelete={() => setIsDeleteDialogOpen(true)}
                  />
                </div>

                {/* Messages Area */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MessageList
                    messages={messaging.currentMessages}
                    currentUserId={user?.uid}
                    loading={messaging.loading}
                  />
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0">
                  <MessageInput
                    onSend={(content) => handleSendMessage(content)}
                    disabled={messaging.loading}
                    placeholder="Type a message..."
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center flex-1">
                <p className="text-[14px] sm:text-[16px] text-[#808081] px-4 text-center">Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        open={isNewMessageModalOpen}
        onOpenChange={setIsNewMessageModalOpen}
        isLoadingContacts={loadingContacts}
        users={contacts.map(contact => ({
          id: contact.uid,
          name: contact.name,
          role: contact.role,
          avatar: getInitials(contact.name),
          image: contact.avatar
        }))}
        onStartChat={handleCreateConversation}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-semibold">Delete Conversation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[14px] text-[#6b7280]">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConversation}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
