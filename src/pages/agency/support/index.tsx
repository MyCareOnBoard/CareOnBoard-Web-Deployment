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
  firebaseId?: string;
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
        const otherUserId = thread.participants.find((id) => id !== userId);
        if (!otherUserId) continue;

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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact) return;

    try {
      await sendMessage(messageInput.trim());
      setMessageInput("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleStartChat = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No User Selected",
        description: "Please select a user to message.",
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

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="max-w-md p-6 border border-yellow-200 rounded-lg bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900">Authentication Required</h3>
              <p className="mt-1 text-sm text-yellow-800">
                Please log in to access the messaging feature.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (threadsLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#e5e5e6] border-t-[#3b82f6] animate-spin mx-auto mb-4"></div>
          <p className="text-[#6b7280]">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Messages
          </h1>
        </div>
        <div>
          <Button
            onClick={() => setNewMessageModalOpen(true)}
            className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Message
          </Button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-280px)]">
        {/* Left Sidebar - Contacts List */}
        <div className="w-[380px] bg-[#f5f5f5] rounded-3xl flex flex-col overflow-hidden shadow-sm">
          {/* Messages Header */}
          <div className="p-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[22px] font-semibold text-[#10141a]">Messages</h2>
              <button
                onClick={() => {
                  setIsSearchExpanded(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="flex items-center justify-center transition-colors rounded-full w-9 h-9 hover:bg-white"
              >
                <Search className="w-5 h-5 text-[#6b7280]" />
              </button>
            </div>

            {/* Collapsible Search */}
            {isSearchExpanded && (
              <div className="mb-4 duration-300 animate-in fade-in slide-in-from-top-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none z-10" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search messages..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    onBlur={() => {
                      setTimeout(() => {
                        if (!contactSearchQuery) {
                          setIsSearchExpanded(false);
                        }
                      }, 150);
                    }}
                    className="w-full pl-9 pr-9 h-10 border-0 rounded-xl bg-white focus-visible:ring-1 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-0 text-sm"
                  />
                  {contactSearchQuery && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setContactSearchQuery("");
                        setIsSearchExpanded(false);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[#f3f4f6] rounded-full transition-colors z-10"
                    >
                      <X className="w-4 h-4 text-[#6b7280]" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-[#dbeafe] text-[#1e40af]"
                    : "text-[#6b7280] hover:bg-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("dsp")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "dsp"
                    ? "bg-[#dbeafe] text-[#1e40af]"
                    : "text-[#6b7280] hover:bg-white"
                }`}
              >
                <span className="w-1.5 h-1.5 bg-[#ef4444] rounded-full"></span>
                DSP
              </button>
              <button
                onClick={() => setActiveTab("administration")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "administration"
                    ? "bg-[#dbeafe] text-[#1e40af]"
                    : "text-[#6b7280] hover:bg-white"
                }`}
              >
                <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full"></span>
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
                  className={`w-full px-5 py-3 flex items-center gap-3 transition-all ${
                    selectedContact === contact.id 
                      ? "bg-[#dbeafe]" 
                      : "hover:bg-white"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=e5e7eb&color=374151`}
                      alt={contact.name}
                      className="object-cover w-12 h-12 rounded-full"
                    />
                    {contact.hasNotification && (
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ef4444] rounded-full border-2 border-[#f5f5f5]"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-start justify-between mb-0.5">
                      <h3 className="font-semibold text-[15px] text-[#111827] truncate">{contact.name}</h3>
                      <span className="text-[11px] text-[#6b7280] shrink-0 ml-2">{contact.timestamp}</span>
                    </div>
                    <p className="text-[13px] text-[#6b7280] truncate">{contact.role}</p>
                  </div>
                  {contact.unread && contact.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                      {contact.unread}
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#6b7280] p-4">
                <Send className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="flex-1 bg-[#f9fafb] rounded-3xl flex flex-col overflow-hidden shadow-sm">
          {selectedContactData ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 bg-white border-b border-[#e5e7eb] flex items-center gap-3">
                <img
                  src={selectedContactData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContactData.name)}&background=e5e7eb&color=374151`}
                  alt={selectedContactData.name}
                  className="object-cover rounded-full w-11 h-11"
                />
                <div>
                  <h3 className="font-semibold text-[15px] text-[#111827]">
                    {selectedContactData.name}
                  </h3>
                  <p className="text-[13px] text-[#6b7280]">{selectedContactData.role}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-[#f9fafb]">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-[#e5e7eb] border-t-[#3b82f6] animate-spin mx-auto mb-2"></div>
                      <p className="text-[#6b7280] text-sm">Loading messages...</p>
                    </div>
                  </div>
                ) : currentMessages.length > 0 ? (
                  currentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2.5 ${message.isOwn ? "justify-end" : ""}`}
                    >
                      {!message.isOwn && (
                        <img
                          src={selectedContactData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContactData.name)}&background=e5e7eb&color=374151`}
                          alt={message.sender}
                          className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
                        />
                      )}
                      <div className={`flex flex-col ${message.isOwn ? "items-end" : ""} max-w-[65%]`}>
                        {!message.isOwn && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-medium text-[#111827]">
                              {message.sender}
                            </span>
                            <span className="text-[11px] text-[#9ca3af]">
                              {message.timestamp}
                            </span>
                          </div>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            message.isOwn
                              ? "bg-[#dbeafe] text-[#111827]"
                              : "bg-white text-[#111827] shadow-sm"
                          }`}
                        >
                          {message.content && (
                            <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
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
                                    <div className="flex items-center gap-2 p-2 bg-[#f9fafb] rounded-lg border border-[#e5e7eb]">
                                      <Paperclip className="w-4 h-4 text-[#6b7280]" />
                                      <span className="text-xs text-[#111827] truncate max-w-[200px]">
                                        {attachment.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {message.isOwn && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-[#9ca3af]">
                              {message.timestamp}
                            </span>
                            <Check className="w-3.5 h-3.5 text-[#3b82f6]" />
                          </div>
                        )}
                      </div>
                      {message.isOwn && (
                        <img
                          src={message.avatar || `https://ui-avatars.com/api/?name=You&background=3b82f6&color=ffffff`}
                          alt="You"
                          className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#9ca3af]">
                    <Send className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-[14px]">No messages yet. Start the conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attached Files Preview */}
              {attachedFiles.length > 0 && (
                <div className="px-6 py-3 bg-white border-t border-[#e5e7eb]">
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-[#f9fafb] px-3 py-2 rounded-lg border border-[#e5e7eb]"
                      >
                        {file.type.startsWith("image/") ? (
                          <Image className="w-4 h-4 text-[#6b7280]" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-[#6b7280]" />
                        )}
                        <span className="text-xs text-[#111827] max-w-[150px] truncate">
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
              <div className="p-5 bg-white border-t border-[#e5e7eb]">
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
                      className="pr-20 h-11 border-[#e5e7eb] rounded-xl focus-visible:ring-1 focus-visible:ring-[#3b82f6] focus-visible:border-[#3b82f6] disabled:bg-[#f9fafb] text-[14px]"
                    />
                    <div className="absolute flex items-center gap-1.5 transform -translate-y-1/2 right-3 top-1/2">
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
                        className="p-1.5 hover:bg-[#f3f4f6] rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Image className="w-4.5 h-4.5 text-[#6b7280]" />
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
                        className="p-1.5 hover:bg-[#f3f4f6] rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Paperclip className="w-4.5 h-4.5 text-[#6b7280]" />
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!messageInput.trim() && attachedFiles.length === 0) || isSending}
                    className="w-11 h-11 p-0 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-full shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
                    ) : (
                      <Send className="w-4.5 h-4.5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#9ca3af]">
              <p className="text-[14px]">Select a conversation to start messaging</p>
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
                    <div className="w-6 h-6 rounded-full border-2 border-[#e5e7eb] border-t-[#3b82f6] animate-spin mx-auto mb-2"></div>
                    <p className="text-[#6b7280] text-sm">Loading users...</p>
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
                          <p className="text-[13px] text-[#6b7280] leading-tight">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-[4px] border-[1.5px] flex items-center justify-center transition-all ${
                          selectedUsers.includes(user.uid)
                            ? "bg-[#3b82f6] border-[#3b82f6]"
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
                <div className="flex flex-col items-center justify-center py-8 text-[#6b7280]">
                  <Search className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-sm">No users found</p>
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
                className="flex-1 h-12 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-full text-[15px] font-medium transition-colors shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
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