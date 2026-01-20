import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, Send, Image as ImageIcon, Paperclip, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import NewMessageModal from "./components/NewMessageModal";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/utils/auth";
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


type FilterTab = 'all' | 'dsp' | 'administration';

export default function AgencySupportPage() {
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
        senderRole: user?.role || "Agency",
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

  // Helper to get initials
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Filter conversations by tab and search
  const filteredConversations = conversations.filter(conv => {
    const participant = getParticipantInfo(conv);
    if (!participant) return false;

    // Filter by tab
    if (activeTab === 'dsp' && participant.role !== 'DSP') return false;
    if (activeTab === 'administration' && participant.role === 'DSP') return false;

    // Filter by search
    if (searchQuery) {
      return participant.name.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-160px)]">
        {/* Top Header with New Message Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h1 className="text-[28px] font-bold text-[#10141a]">Support</h1>
          <Button
            onClick={() => setIsNewMessageModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            New Message
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Conversations List */}
          <div className="w-[360px] flex flex-col border-r border-[#e5e7eb] bg-white">
            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-[#e5e7eb]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808081]" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  className="pl-10 h-10 bg-[#f3f4f6] border-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 px-4 py-3 border-b border-[#e5e7eb]">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#6b7280] hover:bg-[#f3f4f6]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('dsp')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'dsp'
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#6b7280] hover:bg-[#f3f4f6]'
                }`}
              >
                <span className="w-1.5 h-1.5 bg-[#ef4444] rounded-full"></span>
                DSP
              </button>
              <button
                onClick={() => setActiveTab('administration')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'administration'
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#6b7280] hover:bg-[#f3f4f6]'
                }`}
              >
                Administration
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-[#e5e7eb] border-t-[#2563eb] animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-[#808081]">Loading...</p>
                  </div>
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const participant = getParticipantInfo(conv);
                  if (!participant) return null;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full px-4 py-3 flex items-center gap-3 border-b border-[#f3f4f6] transition-colors ${
                        selectedConversation?.id === conv.id
                          ? 'bg-[#eff6ff]'
                          : 'hover:bg-[#f9fafb]'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-sm font-semibold">
                          {participant.avatar ? (
                            <img
                              src={participant.avatar}
                              alt={participant.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(participant.name)
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-baseline justify-between mb-1">
                          <h3 className="font-semibold text-[15px] text-[#10141a] truncate">
                            {participant.name}
                          </h3>
                          {conv.lastMessageAt && (
                            <span className="text-[11px] text-[#808081] ml-2 flex-shrink-0">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#808081] truncate">
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                          {conv.unreadCount}
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Send className="w-12 h-12 text-[#d1d5db] mb-3" />
                  <p className="text-[14px] text-[#808081]">No conversations yet</p>
                  <p className="text-[12px] text-[#9ca3af] mt-1">Start a new message to begin</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Chat Area */}
          <div className="flex-1 flex flex-col bg-[#f9fafb]">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#e5e7eb]">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const participant = getParticipantInfo(selectedConversation);
                      return participant ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-sm font-semibold">
                            {participant.avatar ? (
                              <img
                                src={participant.avatar}
                                alt={participant.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(participant.name)
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[15px] text-[#10141a]">
                              {participant.name}
                            </h3>
                            <p className="text-[13px] text-[#808081]">{participant.role}</p>
                          </div>
                        </>
                      ) : null;
                    })()}
                  </div>
                  <button
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="p-2 hover:bg-[#fef2f2] rounded-lg transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-5 h-5 text-[#ef4444]" />
                  </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {messages.length > 0 ? (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isOwn && (
                            <div className="w-8 h-8 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {msg.senderAvatar ? (
                                <img
                                  src={msg.senderAvatar}
                                  alt={msg.senderName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                getInitials(msg.senderName)
                              )}
                            </div>
                          )}
                          <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                            {!isOwn && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[12px] font-medium text-[#10141a]">
                                  {msg.senderName}
                                </span>
                                <span className="text-[11px] text-[#9ca3af]">
                                  {format(new Date(msg.createdAt), 'h:mm a')}
                                </span>
                              </div>
                            )}
                            <div
                              className={`px-4 py-2.5 rounded-lg ${
                                isOwn
                                  ? 'bg-[#2563eb] text-white'
                                  : 'bg-white text-[#10141a] border border-[#e5e7eb]'
                              }`}
                            >
                              <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            </div>
                            {isOwn && (
                              <span className="text-[11px] text-[#9ca3af] mt-1">
                                {format(new Date(msg.createdAt), 'h:mm a')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Send className="w-12 h-12 text-[#d1d5db] mx-auto mb-3" />
                        <p className="text-[14px] text-[#808081]">No messages yet</p>
                        <p className="text-[12px] text-[#9ca3af] mt-1">Start the conversation</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="px-6 py-4 bg-white border-t border-[#e5e7eb]">
                  <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors">
                      <Paperclip className="w-5 h-5 text-[#6b7280]" />
                    </button>
                    <button className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors">
                      <ImageIcon className="w-5 h-5 text-[#6b7280]" />
                    </button>
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 h-10 border-[#e5e7eb]"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendingMessage}
                      className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
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