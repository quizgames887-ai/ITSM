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
  const users = useQuery(api.users.list, {});
  const updateTicket = useMutation(api.tickets.update);
  const createComment = useMutation(api.comments.create);

  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { success, error: showError } = useToastContext();

  if (ticket === undefined || comments === undefined) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded w-32"></div>
        <div className="h-80 bg-slate-200 rounded-2xl"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card padding="lg">
          <div className="text-center py-8 px-12">
            <span className="text-5xl mb-4 block">🎫</span>
            <p className="text-slate-600 mb-6">Ticket not found</p>
            <Link href="/tickets">
              <Button variant="gradient">Back to Tickets</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Get assignee name
  const getAssigneeName = () => {
    if (!ticket.assignedTo || !users) return "Unassigned";
    const user = users.find((u) => u._id === ticket.assignedTo);
    return user?.name || "Unknown";
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateTicket({
        id: ticketId,
        status: newStatus as any,
      });
      success("Status updated successfully!");
    } catch (error) {
      console.error("Failed to update status:", error);
      showError("Failed to update status");
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

  const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
    new: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    in_progress: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    on_hold: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    resolved: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    closed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
  };

  const priorityStyles: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
    medium: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  };

  const statusStyle = statusStyles[ticket.status] || statusStyles.new;
  const priorityStyle = priorityStyles[ticket.priority] || priorityStyles.medium;

  const statusLabels: Record<string, string> = {
    new: "New",
    in_progress: "In Progress",
    on_hold: "On Hold",
    resolved: "Resolved",
    closed: "Closed",
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href="/tickets" 
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Tickets
      </Link>

      {/* Main Ticket Card */}
      <Card padding="none" className="overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                  #TK-{ticket._id.slice(-6).toUpperCase()}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
                {ticket.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                  {statusLabels[ticket.status]}
                </span>
                <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border capitalize ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                  {ticket.priority} Priority
                </span>
                <span className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 bg-white text-slate-600 capitalize">
                  {ticket.category}
                </span>
              </div>
            </div>
            <div className="lg:ml-6">
              <label className="block text-xs font-medium text-slate-500 mb-2">Update Status</label>
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
                className="w-full lg:w-48"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {/* Description */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Description
            </h2>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
              {ticket.description}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Type</span>
              <p className="text-sm font-semibold text-slate-900 capitalize">{ticket.type.replace("_", " ")}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Urgency</span>
              <p className="text-sm font-semibold text-slate-900 capitalize">{ticket.urgency}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Assignee</span>
              <p className="text-sm font-semibold text-slate-900">{getAssigneeName()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Created</span>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            {ticket.resolvedAt && (
              <div className="bg-green-50 rounded-xl p-4 col-span-2 lg:col-span-1">
                <span className="text-xs font-medium text-green-600 uppercase tracking-wide block mb-1">Resolved</span>
                <p className="text-sm font-semibold text-green-900">
                  {new Date(ticket.resolvedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Comments Card */}
      <Card padding="none">
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Comments
            <span className="text-sm font-normal text-slate-500">({comments.length})</span>
          </h2>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="space-y-4 mb-8">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">💬</span>
                <p className="text-slate-600 text-sm">No comments yet</p>
                <p className="text-slate-400 text-xs mt-1">Be the first to add a comment</p>
              </div>
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
                    className={`p-5 rounded-xl border transition-all ${
                      isCurrentUser
                        ? "bg-blue-50/50 border-blue-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                          {getInitials(comment.userName || "Unknown")}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-slate-900">
                            {comment.userName || "Unknown User"}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">(You)</span>
                            )}
                          </span>
                          {comment.userEmail && (
                            <span className="block text-xs text-slate-500">{comment.userEmail}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pl-12">
                      {comment.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleCommentSubmit} className="space-y-4 border-t border-slate-200 pt-6">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="gradient"
                disabled={loading || !commentText.trim()}
                loading={loading}
              >
                {loading ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Audit History Card */}
      <Card padding="none">
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Activity History
          </h2>
        </div>
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <TicketAudit ticketId={ticketId} />
        </div>
      </Card>
    </div>
  );
}
