"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToastContext } from "@/contexts/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Link from "next/link";

export default function ApprovalsPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "need_more_info" | null>(null);
  const [comments, setComments] = useState("");
  const { success, error: showError } = useToastContext();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId");
      setCurrentUserId(userId);
    }
  }, []);

  const pendingApprovals = useQuery(
    api.approvals.getPendingForUser,
    currentUserId ? { userId: currentUserId as Id<"users"> } : "skip"
  );

  const approveRequest = useMutation(api.approvals.approve);
  const rejectRequest = useMutation(api.approvals.reject);
  const needMoreInfoRequest = useMutation(api.approvals.needMoreInfo);

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === "need_more_info" && !comments.trim()) {
      showError("Comments are required when requesting more information");
      return;
    }

    try {
      if (actionType === "approve") {
        await approveRequest({
          id: selectedRequest._id,
          approverId: currentUserId as Id<"users">,
          comments: comments.trim() || undefined,
        });
        success("Approval request approved successfully!");
      } else if (actionType === "reject") {
        await rejectRequest({
          id: selectedRequest._id,
          approverId: currentUserId as Id<"users">,
          comments: comments.trim() || undefined,
        });
        success("Approval request rejected.");
      } else if (actionType === "need_more_info") {
        await needMoreInfoRequest({
          id: selectedRequest._id,
          approverId: currentUserId as Id<"users">,
          comments: comments.trim(),
        });
        success("More information requested. The requester has been notified.");
      }

      setSelectedRequest(null);
      setActionType(null);
      setComments("");
    } catch (err: any) {
      showError(err.message || "Failed to process approval request");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
      approved: { label: "Approved", className: "bg-green-100 text-green-700" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
      need_more_info: { label: "Need More Info", className: "bg-blue-100 text-blue-700" },
      skipped: { label: "Skipped", className: "bg-gray-100 text-gray-700" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (pendingApprovals === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Approval Requests</h1>
          <p className="text-slate-600">
            Review and respond to pending approval requests
          </p>
        </div>

        {pendingApprovals.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={
                <svg
                  className="w-12 h-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              title="No pending approvals"
              description="You don't have any pending approval requests at the moment."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((request: any) => (
              <Card key={request._id} padding="lg" hover>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link
                          href={`/tickets/${request.ticketId}`}
                          className="text-lg font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {request.ticket?.title || "Ticket"}
                        </Link>
                        <p className="text-sm text-slate-600 mt-1">
                          Stage: {request.stage?.name || "Unknown Stage"}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    {request.stage?.description && (
                      <p className="text-sm text-slate-600 mb-3">
                        {request.stage.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        Requested: {new Date(request.requestedAt).toLocaleString()}
                      </span>
                      {request.ticket?.category && (
                        <span className="px-2 py-1 bg-slate-100 rounded">
                          {request.ticket.category}
                        </span>
                      )}
                    </div>

                    {request.comments && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Previous Comments:
                        </p>
                        <p className="text-sm text-blue-800">{request.comments}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:w-auto w-full">
                    <Button
                      variant="gradient"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType("approve");
                        setComments("");
                      }}
                      className="w-full sm:w-auto"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType("need_more_info");
                        setComments("");
                      }}
                      className="w-full sm:w-auto border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      Need More Info
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType("reject");
                        setComments("");
                      }}
                      className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Action Modal */}
        {selectedRequest && actionType && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 -m-4 sm:-m-6 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {actionType === "approve"
                    ? "Approve Request"
                    : actionType === "reject"
                    ? "Reject Request"
                    : "Request More Information"}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Ticket:</p>
                  <p className="text-slate-900">{selectedRequest.ticket?.title}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Stage:</p>
                  <p className="text-slate-900">{selectedRequest.stage?.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Comments
                    {actionType === "need_more_info" && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                    {actionType !== "need_more_info" && (
                      <span className="text-slate-400 ml-1">(optional)</span>
                    )}
                  </label>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={
                      actionType === "approve"
                        ? "Add any comments about your approval..."
                        : actionType === "reject"
                        ? "Please provide a reason for rejection..."
                        : "Please specify what additional information is needed..."
                    }
                    rows={4}
                    required={actionType === "need_more_info"}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-200">
                  <Button
                    variant="gradient"
                    onClick={handleAction}
                    className="flex-1 sm:flex-none"
                    disabled={
                      actionType === "need_more_info" && !comments.trim()
                    }
                  >
                    {actionType === "approve"
                      ? "Approve"
                      : actionType === "reject"
                      ? "Reject"
                      : "Request More Info"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(null);
                      setActionType(null);
                      setComments("");
                    }}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
