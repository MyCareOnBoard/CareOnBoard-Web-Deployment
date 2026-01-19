import React, { useState, useEffect, useRef } from "react";
import { Search, Image as ImageIcon, Paperclip, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/utils/auth";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export default function AgencyMessagesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock conversations - Replace with actual API call
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      participantId: "dsp-1",
      participantName: "Jenny Wilson",
      participantRole: "DSP",
      lastMessage: "Thank you! I've found your results, here are your lab results and don't hesitate to contact us if you have any further questions.",
      lastMessageTime: new Date("2026-01-19T09:46:00"),
      unreadCount: 1,
      messages: [
        {
          id: "1",
          senderId: user?.id || "agency",
          senderName: "You",
          text: "Hello, Jacob! Let me check. Could you please provide your test reference number or date of the test?",
          timestamp: new Date("2026-01-19T09:35:00"),
          isRead: true,
        },
        {
          id: "2",
          senderId: "dsp-1",
          senderName: "Jenny Wilson",
          text: "Sure, the test was done on November 15th, and my reference number is (#123451.",
          timestamp: new Date("2026-01-19T09:40:00"),
          isRead: true,
        },
      ],
    },
    {
      id: "2",
      participantId: "dsp-2",
      participantName: "Jacob Jones",
      participantRole: "DSP",
      lastMessage: "Sure, the test was done on November 15th, and my reference number is (#123451.",
      lastMessageTime: new Date("2026-01-19T09:40:00"),
      unreadCount: 0,
      messages: [
        {
          id: "1",
          senderId: user?.id || "agency",
          senderName: "You",
          text: "Hello, Jacob! Let me check. Could you please provide your test reference number or date of the test?",
          timestamp: new Date("2026-01-19T09:35:00"),
          isRead: true,
        },
        {
          id: "2",
          senderId: "dsp-2",
          senderName: "Jacob Jones",
          text: "Sure, the test was done on November 15th, and my reference number is (#123451.",
          timestamp: new Date("2026-01-19T09:40:00"),
          isRead: true,
        },
        {
          id: "3",
          senderId: user?.id || "agency",
          senderName: "You",
          text: "Thank you! I've found your results, here are your lab results and don't hesitate to contact us if you have any further questions.",
          timestamp: new Date("2026-01-19T09:42:00"),
          isRead: true,
        },
      ],
    },
  ]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages]);

  // Select first conversation by default
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations]);

  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user?.id || "agency",
      senderName: "You",
      text: messageInput,
      timestamp: new Date(),
      isRead: false,
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: messageInput,
              lastMessageTime: new Date(),
            }
          : conv
      )
    );

    setSelectedConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, newMessage],
          }
        : null
    );

    setMessageInput("");
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

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Left Sidebar - Conversations List */}
      <div className="w-full md:w-[380px] border-r border-[#e5e7eb] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#e5e7eb]">
          <h2 className="text-[24px] font-semibold text-[#10141a] mb-4">Messages</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808081]" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
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
                  {conversation.participantAvatar ? (
                    <img
                      src={conversation.participantAvatar}
                      alt={conversation.participantName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(conversation.participantName)
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
                    {conversation.participantName}
                  </h3>
                  <span className="text-[11px] text-[#808081] flex-shrink-0 ml-2">
                    {formatTime(conversation.lastMessageTime)}
                  </span>
                </div>
                <p className="text-[13px] text-[#808081] mb-0.5">{conversation.participantRole}</p>
                <p className="text-[13px] text-[#6b7280] line-clamp-2">
                  {conversation.lastMessage}
                </p>
              </div>
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-[14px] text-[#808081]">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-[#e5e7eb] flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#00b8d4] text-white flex items-center justify-center text-[16px] font-semibold flex-shrink-0">
                {selectedConversation.participantAvatar ? (
                  <img
                    src={selectedConversation.participantAvatar}
                    alt={selectedConversation.participantName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(selectedConversation.participantName)
                )}
              </div>
              <div>
                <h3 className="text-[18px] font-semibold text-[#10141a]">
                  {selectedConversation.participantName}
                </h3>
                <p className="text-[13px] text-[#808081]">
                  {selectedConversation.participantRole}
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#f9fafb]">
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => {
                  const isSentByUser = message.senderId === (user?.id || "agency");

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
                                className="w-full h-full rounded-full object-cover"
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
                                className="w-full h-full rounded-full object-cover"
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
                            <p className="text-[14px] leading-relaxed">{message.text}</p>
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
                              {formatTime(message.timestamp)}
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
                  disabled={!messageInput.trim()}
                  className="p-2.5 bg-[#00b8d4] text-white rounded-full hover:bg-[#00a5c0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[16px] text-[#808081]">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
