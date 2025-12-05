import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, Send, Image, Paperclip, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
}

export default function SupportPage() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedContact, setSelectedContact] = useState<string>("jacob-jones");
  const [activeTab, setActiveTab] = useState<"all" | "dsp" | "administration">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "jenny-wilson",
      name: "Jenny Wilson",
      role: "Poli General Practitioners",
      avatar: "JW",
      lastMessage: "Thanks for the update!",
      timestamp: "09:46 AM",
      hasNotification: true,
      unread: 1,
      category: "dsp",
    },
    {
      id: "jacob-jones",
      name: "Jacob Jones",
      role: "Poli Dermatologi",
      avatar: "JJ",
      lastMessage: "Sure, the test was done on November 15th...",
      timestamp: "09:46 AM",
      category: "dsp",
    },
    {
      id: "ronald-richards",
      name: "Ronald Richards",
      role: "Poli Cardiology",
      avatar: "RR",
      lastMessage: "Can we schedule a meeting?",
      timestamp: "08:46 AM",
      hasNotification: true,
      category: "administration",
    },
    {
      id: "savannah-nguyen",
      name: "Savannah Nguyen",
      role: "Poli Dermatologi",
      avatar: "SN",
      lastMessage: "I'll check that for you.",
      timestamp: "08:36 AM",
      unread: 2,
      category: "dsp",
    },
    {
      id: "arlene-mccoy",
      name: "Arlene McCoy",
      role: "Poli General Practitioners",
      avatar: "AM",
      lastMessage: "Perfect, see you then!",
      timestamp: "07:46 AM",
      hasNotification: true,
      category: "administration",
    },
    {
      id: "esther-howard",
      name: "Esther Howard",
      role: "General Practitioners",
      avatar: "EH",
      lastMessage: "Got it, thanks!",
      timestamp: "07:36 AM",
      category: "all",
    },
    {
      id: "devon-lane",
      name: "Devon Lane",
      role: "Poli Cardiology",
      avatar: "DL",
      lastMessage: "Let me know when you're available.",
      timestamp: "07:16 AM",
      hasNotification: true,
      category: "dsp",
    },
    {
      id: "marvin-mckinney",
      name: "Marvin McKinney",
      role: "Poli Dermatologi",
      avatar: "MM",
      lastMessage: "Sounds good!",
      timestamp: "07:06 AM",
      category: "administration",
    },
  ]);

  const [conversations, setConversations] = useState<{ [key: string]: Message[] }>({
    "jacob-jones": [
      {
        id: "1",
        sender: "You",
        role: "",
        content: "Hello, Jacob! Let me check. Could you please provide your test reference number or date of the test?",
        timestamp: "09:35 AM",
        isOwn: true,
        avatar: "Y",
      },
      {
        id: "2",
        sender: "Jacob Jones",
        role: "",
        content: "Sure, the test was done on November 15th, and my reference number is L#123451",
        timestamp: "09:40 AM",
        isOwn: false,
        avatar: "JJ",
      },
      {
        id: "3",
        sender: "You",
        role: "",
        content: "Thank you! I've found your results, here are your lab results and don't hesitate to contact us if you have any further questions.",
        timestamp: "09:42 AM",
        isOwn: true,
        avatar: "Y",
      },
    ],
  });

  const availableUsers = [
    { id: "brooklyn-simmons", name: "Brooklyn Simmons", role: "DSP", avatar: "BS" },
    { id: "darlene-robertson", name: "Darlene Robertson", role: "Client", avatar: "DR" },
    { id: "bessie-cooper", name: "Bessie Cooper", role: "HR", avatar: "BC" },
    { id: "annette-black", name: "Annette Black", role: "HR", avatar: "AB" },
  ];

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() && attachedFiles.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "You",
      role: "",
      content: messageInput.trim(),
      timestamp: format(new Date(), "hh:mm a"),
      isOwn: true,
      avatar: "Y",
      attachments: attachedFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
      })),
    };

    setConversations((prev) => ({
      ...prev,
      [selectedContact]: [...(prev[selectedContact] || []), newMessage],
    }));

    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === selectedContact
          ? {
              ...contact,
              lastMessage: messageInput.trim() || "Sent an attachment",
              timestamp: format(new Date(), "hh:mm a"),
            }
          : contact
      )
    );

    setMessageInput("");
    setAttachedFiles([]);

    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully.",
    });
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

  const handleStartChat = () => {
    if (selectedUsers.length === 0) return;

    const firstUser = availableUsers.find((u) => u.id === selectedUsers[0]);
    if (firstUser) {
      const existingContact = contacts.find((c) => c.id === firstUser.id);
      
      if (!existingContact) {
        const newContact: Contact = {
          id: firstUser.id,
          name: firstUser.name,
          role: firstUser.role,
          avatar: firstUser.avatar,
          lastMessage: "",
          timestamp: format(new Date(), "hh:mm a"),
          category: "all",
        };
        setContacts((prev) => [newContact, ...prev]);
      }

      setSelectedContact(firstUser.id);
      
      if (!conversations[firstUser.id]) {
        setConversations((prev) => ({
          ...prev,
          [firstUser.id]: [],
        }));
      }
    }

    setSelectedUsers([]);
    setSearchQuery("");
    setNewMessageModalOpen(false);

    toast({
      title: "Chat Started",
      description: `New conversation started.`,
    });
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContact(contactId);
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === contactId
          ? { ...contact, unread: 0, hasNotification: false }
          : contact
      )
    );
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
  const currentMessages = conversations[selectedContact] || [];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Message
          </h1>
        </div>
        <Button
          onClick={() => setNewMessageModalOpen(true)}
          className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-none"
        >
          <Plus className="w-5 h-5" />
          New Message
        </Button>
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
            {filteredContacts.map((contact) => (
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
                    <span className="text-xs text-[#808081] flex-shrink-0 ml-2">{contact.timestamp}</span>
                  </div>
                  <p className="text-sm text-[#808081] truncate">{contact.lastMessage || contact.role}</p>
                </div>
                {contact.unread && contact.unread > 0 && (
                  <div className="w-6 h-6 rounded-full bg-[#ef4444] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {contact.unread}
                  </div>
                )}
              </button>
            ))}
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
                {currentMessages.length > 0 ? (
                  currentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.isOwn ? "justify-end" : ""}`}
                    >
                      {!message.isOwn && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center text-[#10141a] font-semibold flex-shrink-0">
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
                            {message.isOwn ? "You" : message.sender}
                          </span>
                          <span className="text-xs text-[#808081]">{message.timestamp}</span>
                          {message.isOwn && (
                            <Check className="w-3 h-3 text-[#808081]" />
                          )}
                        </div>
                      </div>
                      {message.isOwn && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center text-[#10141a] font-semibold flex-shrink-0">
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
                      className="pr-20 border-[#e5e5e6] rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563eb]"
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
                        className="p-1 hover:bg-[#f8f9fa] rounded transition-colors"
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
                        className="p-1 hover:bg-[#f8f9fa] rounded transition-colors"
                      >
                        <Paperclip className="w-5 h-5 text-[#808081]" />
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() && attachedFiles.length === 0}
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
              {filteredUsers.length > 0 ? (
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className="flex items-center justify-between px-3 py-3 hover:bg-[#f8f9fa] rounded-[10px] cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] flex items-center justify-center flex-shrink-0">
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
                          selectedUsers.includes(user.id)
                            ? "bg-[#2563eb] border-[#2563eb]"
                            : "border-[#d1d5db] group-hover:border-[#a0a0a1]"
                        }`}
                      >
                        {selectedUsers.includes(user.id) && (
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