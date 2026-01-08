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
      className={`inline-flex items-center gap-2 px-2 py-1 rounded ${
        isCurrentUser
          ? "bg-blue-700 text-white"
          : "bg-slate-200 text-slate-700"
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      {attachmentUrl ? (
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline"
        >
          Download
        </a>
      ) : (
        <span className="text-xs">Loading...</span>
      )}
    </div>
  );
}

interface ChatWindowProps {
  ticketId: Id<"tickets">;
  currentUserId: Id<"users">;
  currentUserRole: "user" | "agent" | "admin";
}

export function ChatWindow({ ticketId, currentUserId, currentUserRole }: ChatWindowProps) {
  const messages = useQuery(api.chat.getMessages, { ticketId, userId: currentUserId });
  const sendMessage = useMutation(api.chat.sendMessage);
  const markAsRead = useMutation(api.chat.markAsRead);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);

  const { success, error: showError } = useToastContext();
  
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentIds, setAttachmentIds] = useState<Id<"_storage">[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      markAsRead({ ticketId, userId: currentUserId }).catch(console.error);
    }
  }, [messages, ticketId, currentUserId, markAsRead]);

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachmentIds.length === 0) return;

    setSending(true);
    try {
      await sendMessage({
        ticketId,
        senderId: currentUserId,
        content: messageText.trim(),
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Ticket Chat</h3>
              <p className="text-xs text-slate-500">Real-time messaging</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
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
                  />
                </div>
                <div className={`flex-1 max-w-[70%] ${isCurrentUser ? "items-end" : ""}`}>
                  <div className={`rounded-lg p-3 ${
                    isCurrentUser
                      ? "bg-blue-600 text-white"
                      : isAgentOrAdmin
                      ? "bg-white border border-slate-200"
                      : "bg-slate-100"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${
                        isCurrentUser ? "text-blue-100" : "text-slate-700"
                      }`}>
                        {message.senderName}
                      </span>
                      {isAgentOrAdmin && !isCurrentUser && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                          {message.senderRole === "admin" ? "Admin" : "Agent"}
                        </span>
                      )}
                      <span className={`text-xs ${
                        isCurrentUser ? "text-blue-200" : "text-slate-500"
                      }`}>
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <p className={`text-sm whitespace-pre-wrap ${
                      isCurrentUser ? "text-white" : "text-slate-900"
                    }`}>
                      {message.content}
                    </p>
                    {message.attachmentIds && message.attachmentIds.length > 0 && (
                      <div className="mt-2 space-y-2">
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
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      {attachmentIds.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 flex-wrap">
            {attachmentIds.map((id, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-slate-600">File {index + 1}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex items-end gap-2">
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
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Attach file"
          >
            {uploadingAttachment ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSendMessage}
            disabled={sending || (!messageText.trim() && attachmentIds.length === 0)}
            loading={sending}
            variant="gradient"
            size="sm"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
