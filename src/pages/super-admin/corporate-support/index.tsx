import React, { useState, useEffect, useRef } from "react";
import { Search, Image as ImageIcon, Paperclip, Send, Plus, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NewMessageModal from "./components/NewMessageModal";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import {
  getUserConversations,
  getUserConversationMessages,
  sendUserMessage,
  markUserMessagesAsRead,
  createUserConversation,
  getUserContacts,
  getUserConversationById,
  leaveUserConversation,
  UserConversation,
  UserMessage,
  ConversationParticipant,
  AgencyContact,
} from "@/lib/api/userMessaging";

type FilterTab = 'all' | 'agency' | 'administration';

export default function SuperAdminCorporateSupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<UserConversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contacts, setContacts] = useState<AgencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch contacts when modal opens
  useEffect(() => {
    if (isNewMessageModalOpen) {
      fetchContacts();
    }
  }, [isNewMessageModalOpen]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await getUserConversations();
      setConversations(response.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const response = await getUserContacts();
      setContacts(response.data || []);
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

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await getUserConversationMessages(conversationId);
      setMessages(response.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const unreadMessages = messages.filter(msg => 
        msg.senderId !== user?.id && !msg.isRead
      );
      
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id);
        await markUserMessagesAsRead(conversationId, { messageIds });
        
        // Update local state
        setMessages(prev => 
          prev.map(msg => 
            messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
          )
        );
        
        // Update conversation unread count
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        );
      }
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleRefreshConversation = async (conversationId: string) => {
    try {
      const response = await getUserConversationById(conversationId);
      setConversations(prev =>
        prev.map(conv => conv.id === conversationId ? response.data : conv)
      );
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(response.data);
      }
    } catch (error: any) {
      console.error('Failed to refresh conversation:', error);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation || deletingConversation) return;

    try {
      setDeletingConversation(true);
      await leaveUserConversation(selectedConversation.id);

      // Remove from list
      setConversations(prev => prev.filter(conv => conv.id !== selectedConversation.id));
      
      // Clear selection
      setSelectedConversation(null);
      setMessages([]);
      setIsDeleteDialogOpen(false);

      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive",
      });
    } finally {
      setDeletingConversation(false);
    }
  };

  const handleCreateConversation = async (selectedUserIds: string[]) => {
    if (selectedUserIds.length === 0 || creatingConversation) return;

    try {
      setCreatingConversation(true);

      // Create conversation
      const conversationResponse = await createUserConversation({
        participantIds: selectedUserIds,
      });

      // Add new conversation to list
      const newConversation = conversationResponse.data;
      setConversations(prev => [newConversation, ...prev]);

      // Select the new conversation
      setSelectedConversation(newConversation);

      // Modal will be closed by NewMessageModal component

      toast({
        title: "Success",
        description: "Conversation created successfully",
      });

      // Fetch messages for the new conversation
      fetchMessages(newConversation.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create conversation",
        variant: "destructive",
      });
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;

    const messageText = messageInput.trim();
    setMessageInput("");
    
    try {
      setSendingMessage(true);
      
      // Optimistic UI update
      const tempMessage: UserMessage = {
        id: `temp-${Date.now()}`,
        conversationId: selectedConversation.id,
        senderId: user?.id || "",
        senderName: user?.fullName || "You",
        senderRole: user?.role || "Super Admin",
        content: messageText,
        readBy: [user?.id || ""],
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Send to API
      const response = await sendUserMessage(selectedConversation.id, {
        content: messageText,
      });
      
      // Replace temp message with real one
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessage.id ? response.data : msg
        )
      );
      
      // Update conversation's last message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                lastMessage: messageText,
                lastMessageAt: new Date().toISOString(),
                lastMessageSenderId: user?.id,
              }
            : conv
        )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith("temp-")));
      setMessageInput(messageText); // Restore input
    } finally {
      setSendingMessage(false);
    }
  };

  // Helper to get participant info (not the current user)
  const getParticipantInfo = (conversation: UserConversation): ConversationParticipant | null => {
    return conversation.participants.find(p => p.uid !== user?.id) || null;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const handleSearchExpand = () => {
    setIsSearchExpanded(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSearchCollapse = () => {
    if (!searchQuery) {
      setIsSearchExpanded(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!e.target.value) {
      setIsSearchExpanded(false);
    }
  };

  const filteredByTab = conversations.filter((conv) => {
    if (activeTab === 'all') return true;
    const participant = getParticipantInfo(conv);
    if (!participant) return false;
    if (activeTab === 'agency') return participant.role.toLowerCase().includes('agency');
    if (activeTab === 'administration') return !participant.role.toLowerCase().includes('agency');
    return true;
  });

  const filteredConversations = filteredByTab.filter((conv) => {
    const participant = getParticipantInfo(conv);
    return participant?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-160px)]">
        {/* Top Header with New Message Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h1 className="text-[28px] font-bold text-[#10141a]">Corporate Support</h1>
          <Button
            onClick={() => setIsNewMessageModalOpen(true)}
            className="bg-[#00b8d4] hover:bg-[#00a5c0] text-white gap-2"
          >
            <Plus className="w-5 h-5" />
            New Message
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden bg-white shadow-sm rounded-2xl">
          {/* Left Sidebar - Conversations List */}
          <div className="w-full md:w-[380px] border-r border-[#e5e7eb] flex flex-col">
            {/* Header with Search */}
            <div className="p-6 border-b border-[#e5e7eb]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold text-[#10141a]">Corporate Support</h2>
                
                {/* Search - Expandable */}
                {!isSearchExpanded ? (
                  <button
                    onClick={handleSearchExpand}
                    className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors"
                    title="Search conversations"
                  >
                    <Search className="w-5 h-5 text-[#808081]" />
                  </button>
                ) : (
                  <div className="relative flex-1 ml-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808081]" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onBlur={handleSearchCollapse}
                      className="pl-10 pr-3"
                    />
                  </div>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-[#00b8d4] text-white'
                      : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('agency')}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors flex items-center gap-1 ${
                    activeTab === 'agency'
                      ? 'bg-[#00b8d4] text-white'
                      : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                  }`}
                >
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Agency
                </button>
                <button
                  onClick={() => setActiveTab('administration')}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                    activeTab === 'administration'
                      ? 'bg-[#00b8d4] text-white'
                      : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                  }`}
                >
                  Administration
                </button>
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[14px] text-[#808081]">Loading conversations...</p>
            </div>
          ) : filteredConversations.map((conversation) => {
            const participant = getParticipantInfo(conversation);
            if (!participant) return null;

            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`flex items-start gap-3 p-4 cursor-pointer transition-colors border-b border-[#f3f4f6] ${
                  selectedConversation?.id === conversation.id
                    ? "bg-[#e0f7fa] border-l-4 border-l-[#00b8d4]"
                    : "hover:bg-[#f9fafb]"
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-[16px] font-semibold">
                    {participant.avatar ? (
                      <img
                        src={participant.avatar}
                        alt={participant.name}
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      getInitials(participant.name)
                    )}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ef4444] rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white font-semibold">
                        {conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[15px] font-semibold text-[#10141a] truncate">
                      {participant.name}
                    </h3>
                    <span className="text-[11px] text-[#808081] flex-shrink-0 ml-2">
                      {conversation.lastMessageAt ? formatTime(new Date(conversation.lastMessageAt)) : ''}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#808081] mb-0.5">{participant.role}</p>
                  <p className="text-[13px] text-[#6b7280] line-clamp-2">
                    {conversation.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-12">
              <p className="text-[14px] text-[#808081]">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex flex-col flex-1">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const participant = getParticipantInfo(selectedConversation);
                  if (!participant) return null;
                  
                  return (
                    <>
                      <div className="w-12 h-12 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-[16px] font-semibold flex-shrink-0">
                        {participant.avatar ? (
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="object-cover w-full h-full rounded-full"
                          />
                        ) : (
                          getInitials(participant.name)
                        )}
                      </div>
                      <div>
                        <h3 className="text-[18px] font-semibold text-[#10141a]">
                          {participant.name}
                        </h3>
                        <p className="text-[13px] text-[#808081]">
                          {participant.role}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-2 hover:bg-[#fef2f2] text-[#ef4444] rounded-lg transition-colors"
                title="Delete conversation"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#f9fafb]">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isSentByUser = message.senderId === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSentByUser ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2 max-w-[70%] ${isSentByUser ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Avatar */}
                        {!isSentByUser && (
                          <div className="w-10 h-10 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-[14px] font-semibold flex-shrink-0">
                            {message.senderAvatar ? (
                              <img
                                src={message.senderAvatar}
                                alt={message.senderName}
                                className="object-cover w-full h-full rounded-full"
                              />
                            ) : (
                              getInitials(message.senderName)
                            )}
                          </div>
                        )}

                        {isSentByUser && (
                          <div className="w-10 h-10 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-[14px] font-semibold flex-shrink-0">
                            {user?.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt="You"
                                className="object-cover w-full h-full rounded-full"
                              />
                            ) : (
                              getInitials(user?.fullName || "You")
                            )}
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className="flex flex-col">
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isSentByUser
                                ? "bg-[#dbeafe] text-[#10141a]"
                                : "bg-white text-[#10141a] shadow-sm"
                            }`}
                          >
                            <p className="text-[14px] leading-relaxed">{message.content}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isSentByUser ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="text-[11px] text-[#808081]">
                              {isSentByUser ? "You" : message.senderName}
                            </span>
                            <span className="text-[11px] text-[#808081]">•</span>
                            <span className="text-[11px] text-[#808081]">
                              {formatTime(new Date(message.createdAt))}
                            </span>
                            {isSentByUser && message.isRead && (
                              <>
                                <span className="text-[11px] text-[#808081]">•</span>
                                <span className="text-[11px] text-[#00b8d4]">✓</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-[#e5e7eb] bg-white">
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="Enter message"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                  disabled={sendingMessage}
                />
                <button
                  type="button"
                  className="p-2.5 text-[#808081] hover:text-[#00b8d4] transition-colors"
                  title="Attach image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2.5 text-[#808081] hover:text-[#00b8d4] transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="p-2.5 bg-[#00b8d4] text-white rounded-full hover:bg-[#00a5c0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-[16px] text-[#808081]">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  </div>
    
  {/* New Message Modal */}
      <NewMessageModal
        open={isNewMessageModalOpen}
        onOpenChange={setIsNewMessageModalOpen}
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
              disabled={deletingConversation}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConversation}
              disabled={deletingConversation}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              {deletingConversation ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
