import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, Send, Image, Paperclip, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { auth } from "@/lib/firebase";
import {
  useThreads,
  useMessages,
  useAvailableUsers,
  useSendMessage,
  useCreateThread,
  useAuth,
} from "@/lib/chat/chat.hooks";
import type { Thread, Message as FirebaseMessage, ChatUser } from "@/lib/chat/chat.types";
import { seedDatabase } from "@/lib/chat/seed";

/**
 * UI Display Message type
 * Extends Firebase message with UI-specific properties
 */
interface Message {
  id: string;
  sender: string;
  role: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  avatar: string;
  read?: boolean;
  attachments?: { name: string; url: string; type: string }[];
  firebaseId?: string; // Reference to original Firebase message ID
}

/**
 * Contact display type for left sidebar
 * Derived from Firebase Thread data
 */
interface Contact {
  id: string;
  name: string;
  role: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
  hasNotification?: boolean;
  isOnline?: boolean;
  category?: "dsp" | "administration" | "all";
  otherUserId?: string; // UID of the other participant
}

export default function SupportPage() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Firebase Chat Hooks
  const { isAuthenticated, userId } = useAuth();
  const { threads, isLoading: threadsLoading, error: threadsError } = useThreads();
  const { users: availableUsers, isLoading: usersLoading } = useAvailableUsers();
  const { create: createNewThread, isCreating: isCreatingThread } = useCreateThread();

  // Selected contact and message state
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "dsp" | "administration">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Get messages for selected thread
  const { messages: firebaseMessages, isLoading: messagesLoading } = useMessages(selectedContact);
  const { send: sendMessage, isSending } = useSendMessage(selectedContact);

  // Map Firebase threads to UI contacts with user info lookup
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userCache, setUserCache] = useState<Map<string, ChatUser>>(new Map());

  // Convert Firebase message to UI message
  const mapFirebaseMessage = (msg: FirebaseMessage, currentUserId: string | null): Message => {
    const isOwn = msg.senderId === currentUserId;
    const sender = userCache.get(msg.senderId);

    return {
      id: msg.id,
      sender: isOwn ? "You" : sender?.name || "Unknown",
      role: sender?.role || "",
      content: msg.text,
      timestamp: format(msg.createdAt, "hh:mm a"),
      isOwn,
      avatar: isOwn ? "Y" : sender?.avatar || "?",
      firebaseId: msg.id,
    };
  };

  const currentMessages = firebaseMessages.map((msg) => mapFirebaseMessage(msg, userId));

  // Build contacts from threads
  useEffect(() => {
    const buildContacts = async () => {
      if (!userId || threads.length === 0) {
        setContacts([]);
        return;
      }

      const newContacts: Contact[] = [];
      const newUserCache = new Map(userCache);

      for (const thread of threads) {
        // Get the other participant (not current user)
        const otherUserId = thread.participants.find((id) => id !== userId);

        if (!otherUserId) continue;

        // Check cache first, fetch if not cached
        let otherUser = newUserCache.get(otherUserId);
        if (!otherUser) {
          const foundUser = availableUsers.find((u) => u.uid === otherUserId);
          if (foundUser) {
            otherUser = foundUser;
            newUserCache.set(otherUserId, foundUser);
          }
        }

        if (!otherUser) continue;

        const contact: Contact = {
          id: thread.id,
          name: otherUser.name,
          role: otherUser.role,
          avatar: otherUser.avatar,
          lastMessage: thread.lastMessage || "(no messages yet)",
          timestamp: formatDistanceToNow(thread.lastMessageAt, { addSuffix: true }),
          otherUserId,
          category: otherUser.role === "DSP" ? "dsp" : "administration",
        };

        newContacts.push(contact);
      }

      setContacts(newContacts);
      setUserCache(newUserCache);
    };

    buildContacts();
  }, [threads, userId, availableUsers]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && attachedFiles.length === 0) return;
    if (!selectedContact) {
      toast({
        title: "Error",
        description: "Please select a conversation first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendMessage(messageInput.trim());
      setMessageInput("");
      setAttachedFiles([]);

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((file) => file.size <= 10 * 1024 * 1024);

      if (validFiles.length !== fileArray.length) {
        toast({
          title: "File Too Large",
          description: "Some files exceed the 10MB limit.",
          variant: "destructive",
        });
      }

      setAttachedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartChat = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newThreadId = await createNewThread(selectedUsers);
      setSelectedContact(newThreadId);
      setSelectedUsers([]);
      setSearchQuery("");
      setNewMessageModalOpen(false);

      toast({
        title: "Chat Started",
        description: "New conversation started.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create chat";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContact(contactId);
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      await seedDatabase();
      toast({
        title: "Success",
        description: "Test data seeded successfully! Refresh to see the conversations.",
      });
      // Refresh threads after a short delay to allow Firestore to sync
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to seed database";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || contact.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedContactData = contacts.find((c) => c.id === selectedContact);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  // Show auth error if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900">Authentication Required</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Please log in to access the messaging feature.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (threadsLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#e5e5e6] border-t-[#2563eb] animate-spin mx-auto mb-4"></div>
          <p className="text-[#808081]">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Message
          </h1>
        </div>
        <div className="flex gap-2">
          {/* Temporary seed button for testing */}
          <Button
            onClick={handleSeedDatabase}
            disabled={isSeeding}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6 py-3 h-auto font-semibold shadow-none text-sm"
            title="Add dummy conversations for testing"
          >
            {isSeeding ? "Seeding..." : "🌱 Seed Test Data"}
          </Button>
          <Button
            onClick={() => setNewMessageModalOpen(true)}
            className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-none"
          >
            <Plus className="w-5 h-5" />
            New Message
          </Button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-280px)]">
        {/* Left Sidebar - Contacts List */}
        <div className="w-[400px] bg-[#FFFFFF4D] rounded-2xl border border-[#e5e5e6] flex flex-col overflow-hidden">
          {/* Messages Header */}
          <div className="p-6 border-b border-[#e5e5e6]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#10141a]">Messages</h2>
              
              {/* Collapsible Search */}
              <div className="relative flex items-center justify-end min-w-[240px]">
                {!isSearchExpanded && !contactSearchQuery && (
                  <button
                    onClick={() => {
                      setIsSearchExpanded(true);
                      setTimeout(() => {
                        searchInputRef.current?.focus();
                      }, 100);
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-[#f8f9fa] rounded-full transition-colors"
                  >
                    <Search className="w-5 h-5 text-[#808081]" />
                  </button>
                )}
                
                {(isSearchExpanded || contactSearchQuery) && (
                  <div className="relative w-[240px] animate-in fade-in slide-in-from-right-2 duration-300">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081] pointer-events-none z-10" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search here"
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      onBlur={() => {
                        setTimeout(() => {
                          if (!contactSearchQuery) {
                            setIsSearchExpanded(false);
                          }
                        }, 150);
                      }}
                      className="w-full pl-10 pr-10 h-10 border-0 rounded-full bg-[#f8f9fa] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
                    />
                    {contactSearchQuery && (
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setContactSearchQuery("");
                          setIsSearchExpanded(false);
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[#e5e6e6] rounded-full transition-colors z-10"
                      >
                        <X className="w-4 h-4 text-[#808081]" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-[#e0f2fe] text-[#2563eb]"
                    : "text-[#808081] hover:bg-[#f8f9fa]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("dsp")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "dsp"
                    ? "bg-[#e0f2fe] text-[#2563eb]"
                    : "text-[#808081] hover:bg-[#f8f9fa]"
                }`}
              >
                <span className="w-2 h-2 bg-[#ef4444] rounded-full"></span>
                DSP
              </button>
              <button
                onClick={() => setActiveTab("administration")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "administration"
                    ? "bg-[#e0f2fe] text-[#2563eb]"
                    : "text-[#808081] hover:bg-[#f8f9fa]"
                }`}
              >
                <span className="w-2 h-2 bg-[#a0a0a1] rounded-full"></span>
                Administration
              </button>
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleContactSelect(contact.id)}
                  className={`w-full p-4 flex items-center gap-3 border-b border-[#e5e5e6] transition-all ${
                    selectedContact === contact.id 
                      ? "bg-[#e0f2fe] hover:bg-[#bae6fd]" 
                      : "hover:bg-[#f8f9fa] active:bg-[#f0f0f1]"
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center text-[#10141a] font-semibold">
                      {contact.avatar}
                    </div>
                    {contact.hasNotification && (
                      <span className="absolute top-0 left-0 w-3 h-3 bg-[#ef4444] rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-[#10141a] truncate">{contact.name}</h3>
                      <span className="text-xs text-[#808081] shrink-0 ml-2">{contact.timestamp}</span>
                    </div>
                    <p className="text-sm text-[#808081] truncate">{contact.lastMessage || contact.role}</p>
                  </div>
                  {contact.unread && contact.unread > 0 && (
                    <div className="w-6 h-6 rounded-full bg-[#ef4444] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {contact.unread}
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#808081] p-4">
                <Send className="w-12 h-12 mb-4 opacity-50" />
                <p>No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="flex-1 bg-white rounded-2xl border border-[#e5e5e6] flex flex-col overflow-hidden">
          {selectedContactData ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-[#e5e5e6] flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center text-[#10141a] font-semibold">
                  {selectedContactData.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-[#10141a]">
                    {selectedContactData.name}
                  </h3>
                  <p className="text-sm text-[#808081]">{selectedContactData.role}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-[#e5e5e6] border-t-[#2563eb] animate-spin mx-auto mb-2"></div>
                      <p className="text-[#808081] text-sm">Loading messages...</p>
                    </div>
                  </div>
                ) : currentMessages.length > 0 ? (
                  currentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.isOwn ? "justify-end" : ""}`}
                    >
                      {!message.isOwn && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center text-[#10141a] font-semibold shrink-0">
                          {message.avatar}
                        </div>
                      )}
                      <div className={`flex flex-col ${message.isOwn ? "items-end" : ""} max-w-[70%]`}>
                        {!message.isOwn && (
                          <span className="text-sm font-semibold text-[#10141a] mb-1">
                            {message.sender}
                          </span>
                        )}
                        <div
                          className={`px-4 py-3 rounded-2xl ${
                            message.isOwn
                              ? "bg-[#dbeafe] text-[#10141a]"
                              : "bg-[#f8f9fa] text-[#10141a]"
                          }`}
                        >
                          {message.content && (
                            <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                          )}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className={`${message.content ? "mt-2" : ""} space-y-2`}>
                              {message.attachments.map((attachment, index) => (
                                <div key={index}>
                                  {attachment.type.startsWith("image/") ? (
                                    <img
                                      src={attachment.url}
                                      alt={attachment.name}
                                      className="max-w-full rounded-lg"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-[#e5e5e6]">
                                      <Paperclip className="w-4 h-4 text-[#808081]" />
                                      <span className="text-xs text-[#10141a] truncate max-w-[200px]">
                                        {attachment.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#808081]">
                            {message.timestamp}
                          </span>
                          {message.isOwn && (
                            <Check className="w-3 h-3 text-[#808081]" />
                          )}
                        </div>
                      </div>
                      {message.isOwn && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center text-[#10141a] font-semibold shrink-0">
                          {message.avatar}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#808081]">
                    <Send className="w-12 h-12 mb-4 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attached Files Preview */}
              {attachedFiles.length > 0 && (
                <div className="px-6 py-3 border-t border-[#e5e5e6] bg-[#f8f9fa]">
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#e5e5e6]"
                      >
                        {file.type.startsWith("image/") ? (
                          <Image className="w-4 h-4 text-[#808081]" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-[#808081]" />
                        )}
                        <span className="text-xs text-[#10141a] max-w-[150px] truncate">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-[#ef4444] hover:text-[#dc2626] ml-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-6 border-t border-[#e5e5e6]">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
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
                      disabled={isSending}
                      className="pr-20 border-[#e5e5e6] rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563eb] disabled:bg-[#f8f9fa]"
                    />
                    <div className="absolute flex items-center gap-2 transform -translate-y-1/2 right-3 top-1/2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileAttachment}
                        className="hidden"
                      />
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isSending}
                        className="p-1 hover:bg-[#f8f9fa] rounded transition-colors disabled:opacity-50"
                      >
                        <Image className="w-5 h-5 text-[#808081]" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileAttachment}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending}
                        className="p-1 hover:bg-[#f8f9fa] rounded transition-colors disabled:opacity-50"
                      >
                        <Paperclip className="w-5 h-5 text-[#808081]" />
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!messageInput.trim() && attachedFiles.length === 0) || isSending}
                    className="w-10 h-10 p-0 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full shadow-none disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#808081]">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      <Dialog open={newMessageModalOpen} onOpenChange={setNewMessageModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-white rounded-[24px] border-0 shadow-lg">
          <div className="px-6 pt-6 pb-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <DialogTitle className="text-[20px] font-bold text-[#10141a] leading-tight">
                New Message
              </DialogTitle>
              <button
                onClick={() => {
                  setNewMessageModalOpen(false);
                  setSelectedUsers([]);
                  setSearchQuery("");
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f8f9fa] transition-colors"
              >
                <X className="w-5 h-5 text-[#10141a]" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-5">
              <div className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2">
                <Search className="w-[18px] h-[18px] text-[#a0a0a1]" />
              </div>
              <Input
                type="text"
                placeholder="Search here"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-10 pr-10 bg-[#f8f9fa] border-0 rounded-[10px] text-[15px] text-[#10141a] placeholder:text-[#a0a0a1] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#e5e6e6] rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-[#a0a0a1]" />
                </button>
              )}
            </div>

            {/* User List */}
            <div className="mb-5 max-h-[320px] overflow-y-auto -mx-1 px-1">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-[#e5e5e6] border-t-[#2563eb] animate-spin mx-auto mb-2"></div>
                    <p className="text-[#808081] text-sm">Loading users...</p>
                  </div>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.uid}
                      onClick={() => toggleUserSelection(user.uid)}
                      className="flex items-center justify-between px-3 py-3 hover:bg-[#f8f9fa] rounded-[10px] cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center shrink-0">
                          <span className="text-[15px] font-semibold text-[#10141a]">
                            {user.avatar}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-[15px] font-semibold text-[#10141a] leading-tight mb-0.5">
                            {user.name}
                          </h4>
                          <p className="text-[13px] text-[#808081] leading-tight">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-[4px] border-[1.5px] flex items-center justify-center transition-all ${
                          selectedUsers.includes(user.uid)
                            ? "bg-[#2563eb] border-[#2563eb]"
                            : "border-[#d1d5db] group-hover:border-[#a0a0a1]"
                        }`}
                      >
                        {selectedUsers.includes(user.uid) && (
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-[#808081]">
                  <Search className="w-12 h-12 mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-1">
              <Button
                onClick={() => {
                  setNewMessageModalOpen(false);
                  setSelectedUsers([]);
                  setSearchQuery("");
                }}
                className="flex-1 h-12 bg-transparent hover:bg-[#f8f9fa] text-[#808081] hover:text-[#10141a] border border-[#e5e5e6] rounded-full text-[15px] font-medium transition-colors shadow-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartChat}
                disabled={selectedUsers.length === 0 || isCreatingThread}
                className="flex-1 h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full text-[15px] font-medium transition-colors shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingThread ? "Creating..." : "Start Chat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}