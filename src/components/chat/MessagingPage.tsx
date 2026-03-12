/**
 * Unified Messaging Page Component
 * A reusable messaging page component for user, agency, and super-admin panels
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router";
import { router } from "@/routes";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { useMessaging } from "@/contexts/MessagingContext";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { AgencyContact } from "@/lib/api/userMessaging";
import { NewMessageModal } from "@/components/chat/NewMessageModal";
import { getInitials } from "@/lib/utils/string-utils";

export type FilterTab = "all" | "dsp" | "staff" | "administration" | "agency";

export interface MessagingPageProps {
    /** Page title displayed in the header */
    pageTitle: string;
    /** Base path for routing (e.g., "/agency/support") */
    basePath: string;
    /** Primary button color (default: "#00b8d4") */
    buttonColor?: string;
    /** Additional container classes */
    containerClassName?: string;
    /** Whether to show filter tabs (DSP, Administration, etc.) */
    showFilterTabs?: boolean;
    /** Whether to show agency name alongside role in conversation list */
    showAgencyName?: boolean;
}

export function MessagingPage({
    pageTitle,
    basePath,
    buttonColor = "#00b8d4",
    containerClassName = "",
    showFilterTabs = false,
    showAgencyName = false,
}: MessagingPageProps) {
    const { conversationId } = useParams<{ conversationId?: string }>();
    const { user } = useAuth();
    const { toast } = useToast();
    const messaging = useMessaging();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
    const [contacts, setContacts] = useState<AgencyContact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showChatView, setShowChatView] = useState(false);

    // Track which messages have been marked as read to avoid duplicate calls
    const markedAsReadRef = useRef<Set<string>>(new Set());

    // Load conversation from URL parameter
    useEffect(() => {
        if (conversationId && conversationId !== messaging.currentConversation?.id) {
            messaging.selectConversation(conversationId);
        } else if (!conversationId && messaging.currentConversation) {
            messaging.selectConversation(null);
        }
    }, [conversationId, messaging.currentConversation?.id]);

    // Memoized fetch contacts function
    const fetchContacts = useCallback(async () => {
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
    }, [messaging, toast]);

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

    // Reset marked set when conversation changes
    useEffect(() => {
        if (!messaging.currentConversation || !user?.uid) return;
        markedAsReadRef.current.clear();
    }, [messaging.currentConversation?.id, user?.uid]);

    // Mark messages as read
    useEffect(() => {
        if (!messaging.currentConversation || messaging.currentMessages.length === 0 || !user?.uid) return;

        const unreadMessageIds = messaging.currentMessages
            .filter((msg) =>
                msg.senderId !== user.uid &&
                !msg.isRead &&
                !markedAsReadRef.current.has(msg.id)
            )
            .map((msg) => msg.id);

        if (unreadMessageIds.length > 0) {
            unreadMessageIds.forEach(id => markedAsReadRef.current.add(id));
            messaging.markAsRead(messaging.currentConversation.id, unreadMessageIds);
        }
    }, [messaging.currentConversation?.id, messaging.currentMessages.length, user?.uid]);

    const handleSelectConversation = useCallback((id: string) => {
        messaging.selectConversation(id);
        setShowChatView(true);
        router.navigate(`${basePath}/${id}`);
    }, [messaging, basePath]);

    const handleCreateConversation = useCallback(async (selectedUserIds: string[]) => {
        if (selectedUserIds.length === 0) return;

        try {
            const newConversation = await messaging.createConversation(selectedUserIds);
            if (newConversation) {
                handleSelectConversation(newConversation.id);
            }
        } catch (error: any) {
            // Error already handled in context
        } finally {
            setIsNewMessageModalOpen(false);
        }
    }, [messaging, handleSelectConversation]);

    const handleDeleteConversation = useCallback(async () => {
        if (!messaging.currentConversation) return;

        try {
            setIsDeleting(true);
            await messaging.deleteConversation(messaging.currentConversation.id);
            messaging.selectConversation(null);
            router.navigate(basePath);
        } catch (error: any) {
            // Error already handled in context
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    }, [messaging, basePath, router]);

    const handleSendMessage = useCallback(async (content: string, attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>) => {
        if (!messaging.currentConversation?.id) {
            toast({
                title: "Error",
                description: "No conversation selected",
                variant: "destructive",
            });
            return;
        }
        await messaging.sendMessage(messaging.currentConversation.id, content, attachments);
    }, [messaging, toast]);

    const handleBackToList = useCallback(() => {
        setShowChatView(false);
        messaging.selectConversation(null);
        router.navigate(basePath);
    }, [messaging, basePath]);

    // Memoized filter change handler
    const handleFilterChange = useCallback((tab: FilterTab) => {
        setActiveTab(tab);
    }, []);

    // Memoized delete dialog handlers
    const handleOpenDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(true);
    }, []);

    const handleCloseDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(false);
    }, []);

    // Memoize contacts for NewMessageModal
    const mappedContacts = useMemo(() =>
        contacts.map(contact => ({
            id: contact.uid,
            name: contact.name,
            role: contact.role,
            agency: contact?.agencyName,
            avatar: getInitials(contact.name),
            image: contact.avatar
        })), [contacts]);

    // Generate button hover color (slightly darker)
    const buttonHoverColor = useMemo(() => {
        // Simple darkening by reducing brightness
        const hex = buttonColor.replace("#", "");
        const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 20);
        const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 20);
        const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 20);
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }, [buttonColor]);

    return (
        <>
            <div className="flex flex-col h-[calc(100vh-160px)] min-h-0">
                {/* Top Header with New Message Button */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e5e7eb] flex-shrink-0">
                    <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-[#10141a]">{pageTitle}</h1>
                    <Button
                        onClick={() => setIsNewMessageModalOpen(true)}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-white rounded-lg font-medium text-sm sm:text-base"
                        style={{
                            backgroundColor: buttonColor,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = buttonHoverColor)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = buttonColor)}
                    >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">New Message</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                </div>

                <div className={`flex flex-1 overflow-hidden min-h-0 ${containerClassName}`}>
                    {/* Left Panel - Conversations List */}
                    <div className={`${showChatView ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-[380px] xl:w-[420px] border-r border-[#e5e7eb] flex-shrink-0`}>
                        <ConversationList
                            conversations={messaging.conversations}
                            selectedConversationId={messaging.currentConversation?.id || null}
                            onSelectConversation={handleSelectConversation}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            loading={messaging.conversationsLoading}
                            currentUserId={user?.uid}
                            filterTab={showFilterTabs ? activeTab : undefined}
                            onFilterChange={showFilterTabs ? handleFilterChange : undefined}
                            showAgencyName={showAgencyName}
                        />
                    </div>

                    {/* Right Panel - Chat Area */}
                    <ChatPanel
                        conversation={messaging.currentConversation}
                        messages={messaging.currentMessages}
                        currentUserId={user?.uid}
                        loading={messaging.conversationLoading || messaging.messagesLoading}
                        showChatView={showChatView}
                        onBackToList={handleBackToList}
                        onSendMessage={handleSendMessage}
                        onDelete={handleOpenDeleteDialog}
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
                    onCancel={handleCloseDeleteDialog}
                    isLoading={isDeleting}
                    loadingText="Deleting..."
                />
            </ConfirmDialog>
        </>
    );
}
