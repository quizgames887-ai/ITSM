"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToastContext } from "@/contexts/ToastContext";

// Attachment item component
function AttachmentItem({ storageId, isCurrentUser }: { storageId: Id<"_storage"> | string; isCurrentUser: boolean }) {
  const attachmentUrl = useQuery(
    api.chat.getStorageUrl,
    { storageId: storageId as Id<"_storage"> }
  );

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm transition-all hover:shadow-md ${
        isCurrentUser
          ? "bg-blue-600/90 text-white border-blue-500"
          : "bg-white text-slate-700 border-slate-300"
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {attachmentUrl ? (
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium hover:underline"
        >
          Download
        </a>
      ) : (
        <span className="text-xs">Loading...</span>
      )}
    </div>
  );
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: Id<"users">;
  currentUserRole: "user" | "agent" | "admin";
}

export function ChatModal({ isOpen, onClose, currentUserId, currentUserRole }: ChatModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"users"> | null>(null);
  const [showAgentSelector, setShowAgentSelector] = useState(true);
  
  const messages = useQuery(
    api.chat.getMessages,
    isOpen 
      ? { 
          userId: currentUserId,
          receiverId: selectedAgentId ?? undefined,
        } 
      : "skip"
  );
  const sendMessage = useMutation(api.chat.sendMessage);
  const markAsRead = useMutation(api.chat.markAsRead);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const users = useQuery(api.users.list, {});
  const availableAgents = useQuery(
    api.users.getAvailableAgents,
    isOpen && currentUserRole === "user" ? {} : "skip"
  );

  const { success, error: showError } = useToastContext();
  
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentIds, setAttachmentIds] = useState<Id<"_storage">[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Mark messages as read when modal opens or messages change
  useEffect(() => {
    if (isOpen && messages && messages.length > 0) {
      markAsRead({ 
        userId: currentUserId,
        receiverId: selectedAgentId ?? undefined,
      }).catch(console.error);
    }
  }, [messages, isOpen, currentUserId, selectedAgentId, markAsRead]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessageText("");
      setAttachmentIds([]);
      setSelectedAgentId(null);
      setShowAgentSelector(true);
    }
  }, [isOpen]);
  
  // Get selected agent details
  const selectedAgent = selectedAgentId 
    ? users?.find(u => u._id === selectedAgentId)
    : null;

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachmentIds.length === 0) return;

    setSending(true);
    try {
      await sendMessage({
        senderId: currentUserId,
        receiverId: selectedAgentId ?? undefined,
        content: messageText.trim(),
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        // No ticketId = general chat or direct conversation
      });
      setMessageText("");
      setAttachmentIds([]);
      success("Message sent!");
    } catch (err: any) {
      showError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showError("File size must be less than 10MB");
      return;
    }

    setUploadingAttachment(true);
    try {
      const uploadUrl = await generateUploadUrl();
      if (!uploadUrl || typeof uploadUrl !== "string") {
        throw new Error("Failed to generate upload URL");
      }

      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload file");
      }

      const responseData = await uploadResult.json();
      const storageId = responseData?.storageId;
      if (!storageId) {
        throw new Error("Failed to get storage ID");
      }

      setAttachmentIds([...attachmentIds, storageId as Id<"_storage">]);
      success("File attached!");
    } catch (err: any) {
      showError(err.message || "Failed to upload file");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachmentIds(attachmentIds.filter((_, i) => i !== index));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col border border-slate-200/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.894 7.553a2 2 0 00-1.447-1.447L13.5 4.5l-1.5-3h-4l-1.5 3-5.947 1.606A2 2 0 003 6.947V19a2 2 0 002 2h14a2 2 0 002-2V6.947a2 2 0 00-.106-1.394z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {selectedAgent ? (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 truncate">{selectedAgent.name}</h2>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online"></span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    {selectedAgent.role === "admin" ? "Administrator" : "Support Agent"}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900">Team Chat</h2>
                  <p className="text-xs text-slate-600 font-medium">Real-time messaging with your team</p>
                </>
              )}
            </div>
            {selectedAgent && (
              <button
                onClick={() => {
                  setSelectedAgentId(null);
                  setShowAgentSelector(true);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-all duration-200 text-xs font-medium"
                title="Change agent"
              >
                Change
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-all duration-200 hover:scale-110 flex-shrink-0 ml-2"
            title="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Agent Selector (for users only) */}
        {currentUserRole === "user" && showAgentSelector && !selectedAgentId && (
          <div className="px-6 py-4 border-b border-slate-200 bg-white">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Select an agent to chat with</h3>
            {availableAgents && availableAgents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {availableAgents.map((agent) => (
                  <button
                    key={agent._id}
                    onClick={() => {
                      setSelectedAgentId(agent._id);
                      setShowAgentSelector(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
                  >
                    <div className="relative">
                      <UserAvatar
                        userId={agent._id}
                        name={agent.name}
                        size="sm"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{agent.name}</p>
                        {agent.role === "admin" && (
                          <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{agent.email}</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 mb-2">No agents available at the moment</p>
                <p className="text-xs text-slate-400">You can still send a message and an agent will respond when available</p>
                <button
                  onClick={() => setShowAgentSelector(false)}
                  className="mt-3 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Continue to general chat
                </button>
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white">
          {messages && messages.length > 0 ? (
            messages.map((message) => {
              const isCurrentUser = message.senderId === currentUserId;
              const isAgentOrAdmin = message.senderRole === "agent" || message.senderRole === "admin";

              return (
                <div
                  key={message._id}
                  className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}
                >
                  <div className="flex-shrink-0">
                    <UserAvatar
                      userId={message.senderId}
                      name={message.senderName}
                      size="sm"
                      className="ring-2 ring-white shadow-md"
                    />
                  </div>
                  <div className={`flex-1 max-w-[75%] ${isCurrentUser ? "items-end flex flex-col" : ""}`}>
                    <div className={`rounded-2xl p-4 shadow-sm ${
                      isCurrentUser
                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                        : isAgentOrAdmin
                        ? "bg-white border-2 border-slate-200 shadow-md"
                        : "bg-white border border-slate-200"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold ${
                          isCurrentUser ? "text-blue-50" : "text-slate-800"
                        }`}>
                          {message.senderName}
                        </span>
                        {isAgentOrAdmin && !isCurrentUser && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            message.senderRole === "admin" 
                              ? "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border border-purple-300"
                              : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-300"
                          }`}>
                            {message.senderRole === "admin" ? "Admin" : "Agent"}
                          </span>
                        )}
                        <span className={`text-xs font-medium ${
                          isCurrentUser ? "text-blue-100" : "text-slate-500"
                        }`}>
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                        isCurrentUser ? "text-white" : "text-slate-900"
                      }`}>
                        {message.content}
                      </p>
                      {message.attachmentIds && message.attachmentIds.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.attachmentIds.map((attachmentId, idx) => (
                            <AttachmentItem key={idx} storageId={attachmentId} isCurrentUser={isCurrentUser} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.894 7.553a2 2 0 00-1.447-1.447L13.5 4.5l-1.5-3h-4l-1.5 3-5.947 1.606A2 2 0 003 6.947V19a2 2 0 002 2h14a2 2 0 002-2V6.947a2 2 0 00-.106-1.394z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No messages yet</h3>
              <p className="text-sm text-slate-500">Start a conversation with your team</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment Preview */}
        {attachmentIds.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-600 mr-1">Attachments:</span>
              {attachmentIds.map((id, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-slate-200 rounded-xl text-xs shadow-sm hover:shadow-md transition-shadow"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-slate-700 font-medium">File {index + 1}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-0.5 transition-colors"
                    title="Remove attachment"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttachment}
              className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 disabled:opacity-50 hover:scale-105"
              title="Attach file"
            >
              {uploadingAttachment ? (
                <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 min-h-[60px] max-h-[120px] resize-none border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || (!messageText.trim() && attachmentIds.length === 0)}
              loading={sending}
              variant="gradient"
              size="sm"
              className="px-6 py-2.5 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
