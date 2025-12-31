"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, use } from "react";
import Link from "next/link";

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

  if (ticket === undefined || comments === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading ticket...</p>
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
    } catch (error) {
      console.error("Failed to create comment:", error);
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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/tickets">
            <Button variant="ghost" size="sm">
              ← Back to Tickets
            </Button>
          </Link>
        </div>

        <div className="grid gap-6">
          <Card>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {ticket.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}
                  >
                    {ticket.status.replace("_", " ")}
                  </span>
                  <span className="text-sm text-slate-600">
                    Priority: {ticket.priority}
                  </span>
                  <span className="text-sm text-slate-600">
                    Category: {ticket.category}
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
                className="w-48"
              />
            </div>

            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                Description
              </h2>
              <p className="text-slate-700 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Type:</span>{" "}
                  <span className="text-slate-900">
                    {ticket.type.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Urgency:</span>{" "}
                  <span className="text-slate-900">{ticket.urgency}</span>
                </div>
                <div>
                  <span className="text-slate-500">Created:</span>{" "}
                  <span className="text-slate-900">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </div>
                {ticket.resolvedAt && (
                  <div>
                    <span className="text-slate-500">Resolved:</span>{" "}
                    <span className="text-slate-900">
                      {new Date(ticket.resolvedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">
              Comments
            </h2>

            <div className="space-y-4 mb-6">
              {comments.length === 0 ? (
                <p className="text-slate-600">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment._id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-slate-900">
                        User {comment.userId.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="space-y-4">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
              <Button type="submit" disabled={loading || !commentText.trim()}>
                {loading ? "Posting..." : "Post Comment"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
