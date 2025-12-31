"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TicketAudit } from "@/components/tickets/TicketAudit";
import { useState, use } from "react";
import Link from "next/link";
import { useToastContext } from "@/contexts/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const ticketId = id as Id<"tickets">;
  const ticket = useQuery(api.tickets.get, { id: ticketId });
  const comments = useQuery(api.comments.listByTicket, { ticketId });
  const updateTicket = useMutation(api.tickets.update);
  const createComment = useMutation(api.comments.create);

  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { success, error: showError } = useToastContext();

  if (ticket === undefined || comments === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded-xl"></div>
            <div className="h-48 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-600 mb-4">Ticket not found</p>
            <Link href="/tickets">
              <Button>Back to Tickets</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateTicket({
        id: ticketId,
        status: newStatus as any,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("Not authenticated");
      }
      await createComment({
        ticketId,
        userId: userId as any,
        content: commentText,
      });
      setCommentText("");
      success("Comment posted successfully!");
    } catch (error: any) {
      const errorMessage = error.message || "Failed to post comment";
      console.error("Failed to create comment:", error);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    on_hold: "bg-orange-100 text-orange-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-slate-100 text-slate-800",
  };

  const statusColor =
    statusColors[ticket.status as keyof typeof statusColors] ||
    "bg-slate-100 text-slate-800";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Link href="/tickets" className="block mb-4">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              <span className="hidden sm:inline">← Back to Tickets</span>
              <span className="sm:hidden">← Back</span>
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:gap-6">
          <Card hover padding="md sm:lg" className="border-l-4 border-l-indigo-500">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div className="flex-1 w-full">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3 break-words">
                  {ticket.title}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border ${statusColor} border-current/20 transition-all hover:scale-105`}
                  >
                    {ticket.status.replace("_", " ")}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-600 flex items-center gap-1">
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    {ticket.priority}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-600 flex items-center gap-1">
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {ticket.category}
                  </span>
                </div>
              </div>
              <Select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                options={[
                  { value: "new", label: "New" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "on_hold", label: "On Hold" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                ]}
                className="w-full sm:w-48"
              />
            </div>

            <div className="prose max-w-none">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Description
              </h2>
              <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
                {ticket.description}
              </p>
            </div>

            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">
                    Type
                  </span>
                  <p className="text-slate-900 font-medium mt-1">
                    {ticket.type.replace("_", " ")}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">
                    Urgency
                  </span>
                  <p className="text-slate-900 font-medium mt-1">
                    {ticket.urgency}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">
                    Created
                  </span>
                  <p className="text-slate-900 font-medium mt-1">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>
                {ticket.resolvedAt && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <span className="text-xs text-green-600 uppercase tracking-wide">
                      Resolved
                    </span>
                    <p className="text-green-900 font-medium mt-1">
                      {new Date(ticket.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card hover padding="lg">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Comments
            </h2>

            <div className="space-y-4 mb-6">
              {comments.length === 0 ? (
                <EmptyState
                  icon={
                    <svg
                      className="w-12 h-12 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  }
                  title="No comments yet"
                  description="Be the first to add a comment. Share updates, ask questions, or provide additional information."
                />
              ) : (
                comments.map((comment: any, index) => {
                  const getInitials = (name: string) => {
                    return name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                  };

                  const currentUserId = localStorage.getItem("userId");
                  const isCurrentUser = comment.userId === currentUserId;

                  return (
                    <div
                      key={comment._id}
                      className={`p-4 rounded-lg border transition-all animate-fade-in hover:shadow-md ${
                        isCurrentUser
                          ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 border-l-4"
                          : "bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-200 hover:border-indigo-200 hover:border-l-4"
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all hover:scale-110">
                          {getInitials(comment.userName || "Unknown")}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {comment.userName || "Unknown User"}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-indigo-600 font-normal">
                                (You)
                              </span>
                            )}
                          </span>
                          {comment.userEmail && (
                            <span className="text-xs text-slate-500 break-all">
                              {comment.userEmail}
                            </span>
                          )}
                        </div>
                      </div>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="space-y-4 border-t border-slate-200 pt-4 sm:pt-6">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
              <Button
                type="submit"
                variant="gradient"
                disabled={loading || !commentText.trim()}
                loading={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Posting..." : "Post Comment"}
              </Button>
            </form>
          </Card>

          {/* Audit History */}
          <Card>
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">
              Audit History
            </h2>
            <TicketAudit ticketId={ticketId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
