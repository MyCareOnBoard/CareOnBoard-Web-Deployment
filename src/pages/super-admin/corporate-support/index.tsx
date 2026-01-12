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
  otherUserId?: string;
}

export default function CorporateSupportPage() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isAuthenticated, userId } = useAuth();
  const { threads, isLoading: threadsLoading } = useThreads();
  const { users: availableUsers } = useAvailableUsers();
  const { create: createNewThread } = useCreateThread();

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "dsp" | "administration">("all");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const { messages: firebaseMessages, isLoading: messagesLoading } = useMessages(selectedContact);
  const { send: sendMessage, isSending } = useSendMessage(selectedContact);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userCache, setUserCache] = useState<Map<string, ChatUser>>(new Map());

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
    // Hide sidebar on mobile after selecting contact
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || contact.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes("")
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
        <div className="flex items-center gap-3">
          {!showSidebar && selectedContact && (
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-[#f8f9fa] rounded-full transition-colors"
              title="Show conversations"
            >
              <Search className="w-5 h-5 text-[#808081]" />
            </button>
          )}
          <h1 className="text-2xl md:text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Corporate Support
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setNewMessageModalOpen(true)}
            className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full px-4 md:px-6 py-2 md:py-3 h-auto font-semibold shadow-none text-sm md:text-base"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">New Message</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-3 md:gap-6 h-[calc(100vh-220px)] md:h-[calc(100vh-280px)] relative">
        <div className={`${showSidebar ? 'flex' : 'hidden md:flex'} w-full md:w-[400px] bg-[#FFFFFF4D] rounded-2xl border border-[#e5e5e6] flex-col overflow-hidden ${selectedContact && !showSidebar ? 'md:flex' : ''}`}>
          <div className="p-4 md:p-6 border-b border-[#e5e5e6]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#10141a]">Messages</h2>
              <div className="relative flex items-center justify-end min-w-[180px] md:min-w-[240px]">
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "dsp"
                    ? "bg-[#e0f2fe] text-[#2563eb]"
                    : "text-[#808081] hover:bg-[#f8f9fa]"
                }`}
              >
                Agency
              </button>
              <button
                onClick={() => setActiveTab("administration")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "administration"
                    ? "bg-[#e0f2fe] text-[#2563eb]"
                    : "text-[#808081] hover:bg-[#f8f9fa]"
                }`}
              >
                Administration
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-[#808081]">No conversations found</div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleContactSelect(contact.id)}
                    className={`w-full p-4 rounded-xl text-left transition-colors ${
                      selectedContact === contact.id
                        ? "bg-[#e7f0fe] border border-[#c7d7fe]"
                        : "hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e7f0fe] text-[#2563eb] flex items-center justify-center font-semibold">
                        {contact.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-[#10141a]">{contact.name}</p>
                            <p className="text-xs text-[#808081]">{contact.role}</p>
                          </div>
                          <span className="text-xs text-[#808081]">{contact.timestamp}</span>
                        </div>
                        <p className="text-sm text-[#808081] mt-1 line-clamp-1">
                          {contact.lastMessage}
                        </p>
                      </div>
                      {contact.unread && (
                        <span className="ml-auto bg-[#ef4444] text-white text-xs px-2 py-1 rounded-full">
                          {contact.unread}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${!showSidebar || !selectedContact ? 'flex' : 'hidden md:flex'} flex-1 bg-[#FFFFFF4D] rounded-2xl border border-[#e5e5e6] flex-col overflow-hidden`}>
          {messagesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-4 border-[#e5e5e6] border-t-[#2563eb] animate-spin mx-auto mb-4"></div>
                <p className="text-[#808081] text-sm">Loading messages...</p>
              </div>
            </div>
          ) : currentMessages.length > 0 ? (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="max-w-3xl mx-auto space-y-3 md:space-y-4">
                {currentMessages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-2 md:gap-3 ${msg.isOwn ? "flex-row-reverse" : ""}`}>
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#e7f0fe] text-[#2563eb] flex items-center justify-center font-semibold text-sm md:text-base shrink-0">
                      {msg.avatar}
                    </div>
                    <div className={`max-w-[85%] md:max-w-[75%] p-3 md:p-4 rounded-xl ${msg.isOwn ? "bg-[#e7f0fe]" : "bg-white border border-[#e5e5e6]"}`}>
                      <p className="text-sm text-[#10141a]">{msg.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-[#808081]">{msg.isOwn ? "You" : msg.sender}</span>
                        <span className="text-xs text-[#808081]">•</span>
                        <span className="text-xs text-[#808081]">{msg.timestamp}</span>
                        {msg.isOwn && <Check className="w-4 h-4 text-[#2563eb]" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold text-[#10141a]">No messages yet</h3>
                <p className="text-[#808081] mt-2">
                  Select a conversation from the left or create a new message.
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-[#e5e5e6] p-3 md:p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="hidden sm:flex w-10 h-10 items-center justify-center hover:bg-[#f8f9fa] rounded-full transition-colors"
                  title="Attach image"
                >
                  <Image className="w-5 h-5 text-[#808081]" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="hidden sm:flex w-10 h-10 items-center justify-center hover:bg-[#f8f9fa] rounded-full transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5 text-[#808081]" />
                </button>

                <Input
                  type="text"
                  placeholder="Enter message"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 h-10 md:h-12 rounded-full bg-[#f8f9fa] border-0 focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0 text-sm md:text-base"
                />

                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !selectedContact}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white p-0 shrink-0"
                  title="Send message"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFileAttachment}
                  className="hidden"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileAttachment}
                  className="hidden"
                />
              </div>

              {attachedFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-[#f8f9fa] rounded-full px-3 py-1">
                      <span className="text-sm text-[#10141a]">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-[#e5e6e6] rounded-full"
                        title="Remove attachment"
                      >
                        <X className="w-4 h-4 text-[#808081]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                  setContactSearchQuery("");
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
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="h-11 pl-10 pr-10 bg-[#f8f9fa] border-0 rounded-[10px] text-[15px] text-[#10141a] placeholder:text-[#a0a0a1] focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0"
              />
              {contactSearchQuery && (
                <button
                  onClick={() => setContactSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#e5e6e6] rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-[#a0a0a1]" />
                </button>
              )}
            </div>

            {/* User List */}
            <div className="mb-5 max-h-[320px] overflow-y-auto -mx-1 px-1">
              {availableUsers.length > 0 ? (
                <div className="space-y-1">
                  {availableUsers.map((user) => (
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
                  setContactSearchQuery("");
                }}
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
    </div>
  );
}
