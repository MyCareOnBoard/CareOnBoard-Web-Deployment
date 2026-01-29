import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router";
import { router } from "@/routes";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { NewMessageModal } from "@/components/chat/NewMessageModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { useMessaging } from "@/contexts/MessagingContext";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { AgencyContact } from "@/lib/api/userMessaging";
import { getInitials } from "@/lib/utils/string-utils";

type FilterTab = 'all' | 'dsp' | 'administration' | 'agency';

export default function AgencySupportPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const messaging = useMessaging();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
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

  const handleCreateConversation = useCallback(async (selectedUserIds: string[]) => {
    if (selectedUserIds.length === 0) return;

    try {
      const newConversation = await messaging.createConversation(selectedUserIds);
      if (newConversation) {
        setIsNewMessageModalOpen(false);
      }
    } catch (error: any) {
      // Error already handled in context
    }
  }, [messaging]);

  const handleDeleteConversation = useCallback(async () => {
    if (!messaging.currentConversation) return;

    try {
      await messaging.deleteConversation(messaging.currentConversation.id);
      messaging.selectConversation(null);
    } catch (error: any) {
      // Error already handled in context
    }
  }, [messaging]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!messaging.currentConversation) return;
    await messaging.sendMessage(messaging.currentConversation.id, content);
  }, [messaging]);

  // Handle conversation selection on mobile
  const handleSelectConversation = useCallback((id: string) => {
    messaging.selectConversation(id);
    setShowChatView(true);
    router.navigate(`/agency/support/${id}`);
  }, [messaging]);

  // Handle back button on mobile chat view
  const handleBackToList = useCallback(() => {
    setShowChatView(false);
    messaging.selectConversation(null);
    router.navigate("/agency/support");
  }, [messaging]);

  // Memoize contacts for NewMessageModal to prevent re-renders
  const mappedContacts = useMemo(() =>
    contacts.map(contact => ({
      id: contact.uid,
      name: contact.name,
      role: contact.role,
      agency: contact.agencyName,
      avatar: getInitials(contact.name),
      image: contact.avatar
    })), [contacts]);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-160px)] min-h-0">
        {/* Top Header with New Message Button */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e5e7eb] flex-shrink-0">
          <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-[#10141a]">Support</h1>
          <Button
            onClick={() => setIsNewMessageModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-medium text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Message</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
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
              filterTab={activeTab}
              onFilterChange={(tab: "all" | "dsp" | "administration" | "agency") => setActiveTab(tab as FilterTab)}
            />
          </div>

          {/* Right Panel - Chat Area */}
          <ChatPanel
            conversation={messaging.currentConversation}
            messages={messaging.currentMessages}
            currentUserId={user?.uid}
            loading={messaging.loading}
            showChatView={showChatView}
            onBackToList={handleBackToList}
            onSendMessage={handleSendMessage}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </div>
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        open={isNewMessageModalOpen}
        onOpenChange={setIsNewMessageModalOpen}
        isLoadingContacts={loadingContacts}
        users={mappedContacts}
        onStartChat={handleCreateConversation}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ConfirmDialogContent
          title="Delete Conversation"
          description="Are you sure you want to delete this conversation? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteConversation}
          onCancel={() => setIsDeleteDialogOpen(false)}
        />
      </ConfirmDialog>
    </>
  );
}