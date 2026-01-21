import React, { useState, useEffect, useRef } from "react";
import { Search, Image as ImageIcon, Paperclip, Send, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/utils/auth";
import {
  getUserConversations,
  getUserConversationMessages,
  sendUserMessage,
  markUserMessagesAsRead,
  getUserConversationById,
  leaveUserConversation,
  UserConversation,
  UserMessage,
} from "@/lib/api/userMessaging";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<UserConversation | null>(null);
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
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
      // Mark messages as read
      if (selectedConversation.unreadCount > 0) {
        markConversationAsRead(selectedConversation.id);
      }
    }
  }, [selectedConversation?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await getUserConversations();
      if (response.success) {
        setConversations(response.data);
        // Select first conversation by default
        if (response.data.length > 0 && !selectedConversation) {
          setSelectedConversation(response.data[0]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await getUserConversationMessages(conversationId);
      if (response.success) {
        setMessages(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const unreadMessageIds = messages
        .filter((msg) => !msg.isRead && msg.senderId !== user?.id)
        .map((msg) => msg.id);

      if (unreadMessageIds.length > 0) {
        await markUserMessagesAsRead(conversationId, { messageIds: unreadMessageIds });
        
        // Update local state
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          )
        );
      }
    } catch (error: any) {
      console.error("Error marking messages as read:", error);
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      setSendingMessage(true);

      const response = await sendUserMessage(selectedConversation.id, {
        content: messageInput.trim(),
      });

      if (response.success && response.data) {
        // Add new message to local state
        setMessages((prev) => [...prev, response.data!]);

        // Update conversation last message
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  lastMessage: messageInput.trim(),
                  lastMessageAt: new Date().toISOString(),
                  lastMessageSenderId: user?.id,
                }
              : conv
          )
        );

        setMessageInput("");
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
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

  const getParticipantInfo = (conversation: UserConversation) => {
    // Find the other participant (not the current user)
    const otherParticipant = conversation.participants.find(
      (p) => p.uid !== user?.uid
    );
    return otherParticipant || conversation.participants[0];
  };

  const filteredConversations = conversations.filter((conv) => {
    const participant = getParticipantInfo(conv);
    return participant.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

  return (
    <>
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Left Sidebar - Conversations List */}
      <div className="w-full md:w-[380px] border-r border-[#e5e7eb] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[24px] font-semibold text-[#10141a]">Messages</h2>
            
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
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[14px] text-[#808081]">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12">
              <p className="text-[14px] text-[#808081]">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const participant = getParticipantInfo(conversation);
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
                      {conversation.lastMessageAt && (
                        <span className="text-[11px] text-[#808081] flex-shrink-0 ml-2">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#808081] mb-0.5">{participant.role}</p>
                    <p className="text-[13px] text-[#6b7280] line-clamp-2">
                      {conversation.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              );
            })
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
                              {formatTime(message.createdAt)}
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
