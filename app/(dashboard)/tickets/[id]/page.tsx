"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TicketAudit } from "@/components/tickets/TicketAudit";
import { useState, use, useMemo, useEffect } from "react";
import Link from "next/link";
import { useToastContext } from "@/contexts/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const ticketId = id as Id<"tickets">;
  const ticket = useQuery(api.tickets.get, { id: ticketId });
  const users = useQuery(api.users.list, {});
  
  // Get current user ID and role
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId");
      const userRole = localStorage.getItem("userRole");
      setCurrentUserId(userId);
      setCurrentUserRole(userRole);
    }
  }, []);
  
  // Fetch comments with user ID for filtering
  // Use "skip" if currentUserId is not loaded yet to ensure proper filtering
  const comments = useQuery(
    api.comments.listByTicket, 
    currentUserId === null 
      ? "skip" // Skip query until userId is loaded
      : currentUserId 
        ? { ticketId, userId: currentUserId as Id<"users"> }
        : { ticketId }
  );
  
  // Get current user object
  const currentUser = useMemo(() => {
    if (!currentUserId || !users) return null;
    return users.find((u) => u._id === currentUserId);
  }, [currentUserId, users]);
  
  // Only show visibility selector to agents and admins, not to regular users
  const isAgentOrAdmin = currentUser?.role === "agent" || currentUser?.role === "admin";
  const isEndUser = currentUser?.role === "user" || (!currentUser && currentUserId !== null);
  
  // Filter comments client-side based on visibility and user role
  const filteredComments = useMemo(() => {
    if (!comments) return [];
    
    // Get user role - default to "user" if not loaded yet (safer to hide internal comments)
    const userRole = currentUser?.role || null;
    const canSeeInternal = userRole === "agent" || userRole === "admin";
    
    return comments.filter((comment: any) => {
      // Default to external for backward compatibility with old comments
      const visibility = comment.visibility ?? "external";
      
      // External comments visible to all
      if (visibility === "external") {
        return true;
      }
      // Internal comments only visible to agents and admins
      if (visibility === "internal") {
        return canSeeInternal;
      }
      // Default: hide if visibility is unknown and user is not agent/admin
      return canSeeInternal;
    });
  }, [comments, currentUser]);
  const slaPolicies = useQuery(api.sla.list, {});
  const updateTicket = useMutation(api.tickets.update);
  const createComment = useMutation(api.comments.create);
  
  // Calculate SLA details
  const slaDetails = useMemo(() => {
    if (!ticket?.slaDeadline) return null;
    
    const now = Date.now();
    const deadline = ticket.slaDeadline;
    const diff = deadline - now;
    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const isOverdue = diff < 0;
    const isUrgent = diff >= 0 && diff < 60 * 60 * 1000; // Less than 1 hour
    
    const policy = slaPolicies?.find(p => p.priority === ticket.priority && p.enabled);
    
    let statusText = "";
    let statusBg = "";
    let statusTextColor = "";
    
    if (isOverdue) {
      const overdueHours = Math.floor(Math.abs(diffMinutes) / 60);
      const overdueDays = Math.floor(overdueHours / 24);
      if (overdueDays > 0) {
        statusText = `${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`;
      } else if (overdueHours > 0) {
        statusText = `${overdueHours} hour${overdueHours > 1 ? 's' : ''} overdue`;
      } else {
        statusText = `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) > 1 ? 's' : ''} overdue`;
      }
      statusBg = "bg-red-50 border-red-200";
      statusTextColor = "text-red-700";
    } else if (isUrgent) {
      if (diffMinutes < 60) {
        statusText = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
      } else {
        statusText = `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
      }
      statusBg = "bg-orange-50 border-orange-200";
      statusTextColor = "text-orange-700";
    } else {
      if (diffDays > 0) {
        statusText = `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
      } else if (diffHours > 0) {
        statusText = `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
      } else {
        statusText = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
      }
      statusBg = "bg-green-50 border-green-200";
      statusTextColor = "text-green-700";
    }
    
    return {
      deadline,
      policy,
      statusText,
      statusBg,
      statusTextColor,
      isOverdue,
      isUrgent,
    };
  }, [ticket?.slaDeadline, ticket?.priority, slaPolicies]);
  
  // Fetch all forms to find the ticket form
  const forms = useQuery(api.forms.list, {});
  const ticketForm = useMemo(() => {
    if (!forms) return null;
    return forms.find((form) => form.name.toLowerCase().includes("ticket"));
  }, [forms]);
  
  // Fetch ticket form with fields
  const ticketFormWithFields = useQuery(
    api.forms.get,
    ticketForm ? { id: ticketForm._id } : "skip"
  );

  // Fetch approval requests for this ticket
  // Handle case where the function might not be synced to Convex backend yet
  const approvalsApi = (api as any).approvals;
  const approvalRequests = useQuery(
    approvalsApi?.getByTicket || "skip",
    approvalsApi?.getByTicket ? { ticketId } : "skip"
  ) as any[] | undefined;

  // Approval mutations - handle case where functions might not be synced yet
  const approveRequest = useMutation(approvalsApi?.approve);
  const rejectRequest = useMutation(approvalsApi?.reject);
  const needMoreInfoRequest = useMutation(approvalsApi?.needMoreInfo);

  const [commentText, setCommentText] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<"internal" | "external">("external");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState<any>(null);
  const [approvalActionType, setApprovalActionType] = useState<"approve" | "reject" | "need_more_info" | null>(null);
  const [approvalComments, setApprovalComments] = useState("");
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

  // Get creator information
  const getCreatorInfo = () => {
    if (!ticket.createdBy || !users) return null;
    const user = users.find((u) => u._id === ticket.createdBy);
    if (!user) return null;
    return {
      name: user.name || "Unknown",
      email: user.email || "",
      phone: (user as any).phone || "",
      location: (user as any).location || "",
      jobTitle: (user as any).jobTitle || "",
    };
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
      // Regular users can only create external comments
      const visibility = isAgentOrAdmin ? commentVisibility : "external";
      
      try {
        await createComment({
          ticketId,
          userId: userId as any,
          content: commentText,
          visibility: visibility,
        });
      } catch (error: any) {
        // If visibility parameter is rejected (server hasn't synced), try without it
        if (error.message?.includes("visibility") || error.message?.includes("extra field")) {
          console.warn("Server doesn't support visibility yet, creating comment without it");
          await createComment({
            ticketId,
            userId: userId as any,
            content: commentText,
          } as any);
        } else {
          throw error;
        }
      }
      
      setCommentText("");
      setCommentVisibility("external"); // Reset to external after posting
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
    need_approval: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    in_progress: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    on_hold: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    resolved: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    closed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
    rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
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
    need_approval: "Need Approval",
    in_progress: "In Progress",
    on_hold: "On Hold",
    resolved: "Resolved",
    closed: "Closed",
    rejected: "Rejected",
  };

  const handleApprovalAction = async () => {
    if (!selectedApprovalRequest || !approvalActionType || !currentUserId) return;

    if (approvalActionType === "need_more_info" && !approvalComments.trim()) {
      showError("Comments are required when requesting more information");
      return;
    }

    try {
      if (approvalActionType === "approve") {
        await approveRequest({
          id: selectedApprovalRequest._id,
          approverId: currentUserId as Id<"users">,
          comments: approvalComments.trim() || undefined,
        });
        success("Approval request approved successfully!");
      } else if (approvalActionType === "reject") {
        await rejectRequest({
          id: selectedApprovalRequest._id,
          approverId: currentUserId as Id<"users">,
          comments: approvalComments.trim() || undefined,
        });
        success("Approval request rejected.");
      } else if (approvalActionType === "need_more_info") {
        await needMoreInfoRequest({
          id: selectedApprovalRequest._id,
          approverId: currentUserId as Id<"users">,
          comments: approvalComments.trim(),
        });
        success("More information requested. The requester has been notified.");
      }

      setSelectedApprovalRequest(null);
      setApprovalActionType(null);
      setApprovalComments("");
    } catch (err: any) {
      showError(err.message || "Failed to process approval request");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header with Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              href="/tickets" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tickets
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 uppercase tracking-wider">
                Ticket Details
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
      {/* Main Ticket Card */}
      <Card padding="none" className="overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200">
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
                onChange={(e) => {
                  // Prevent manual changes to system-managed statuses
                  if (e.target.value === "need_approval" || e.target.value === "rejected") {
                    showError("This status is system-managed and cannot be changed manually");
                    return;
                  }
                  handleStatusChange(e.target.value);
                }}
                options={[
                  { value: "new", label: "New" },
                  { value: "need_approval", label: "Need Approval" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "on_hold", label: "On Hold" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                  { value: "rejected", label: "Rejected" },
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

          {/* Approval Status Section */}
          {ticket.requiresApproval && approvalRequests !== undefined && approvalRequests !== null && (
            <div className="mb-8 pb-8 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">Approval Status</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Overall Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ticket.approvalStatus === "approved" ? "bg-green-100 text-green-700" :
                    ticket.approvalStatus === "rejected" ? "bg-red-100 text-red-700" :
                    ticket.approvalStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {ticket.approvalStatus === "approved" ? "Approved" :
                     ticket.approvalStatus === "rejected" ? "Rejected" :
                     ticket.approvalStatus === "pending" ? "Pending" : "Not Required"}
                  </span>
                </div>
                {approvalRequests && approvalRequests.length > 0 && (
                  <div className="space-y-2">
                    {approvalRequests.map((request: any) => {
                      const isCurrentUserApprover = currentUserId && request.approverId === currentUserId;
                      const isPending = request.status === "pending";
                      const canTakeAction = isCurrentUserApprover && isPending;

                      return (
                        <div key={request._id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">
                                {request.stage?.name || "Unknown Stage"}
                              </p>
                              {request.stage?.description && (
                                <p className="text-xs text-slate-600 mt-1">
                                  {request.stage.description}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              request.status === "approved" ? "bg-green-100 text-green-700" :
                              request.status === "rejected" ? "bg-red-100 text-red-700" :
                              request.status === "need_more_info" ? "bg-blue-100 text-blue-700" :
                              request.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {request.status === "approved" ? "Approved" :
                               request.status === "rejected" ? "Rejected" :
                               request.status === "need_more_info" ? "Need More Info" :
                               request.status === "pending" ? "Pending" : request.status}
                            </span>
                          </div>
                          
                          {/* Approval Action Buttons - Only show if current user is the approver and status is pending */}
                          {canTakeAction && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-xs font-medium text-slate-700 mb-2">Your Action Required:</p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="gradient"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApprovalRequest(request);
                                    setApprovalActionType("approve");
                                    setApprovalComments("");
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApprovalRequest(request);
                                    setApprovalActionType("need_more_info");
                                    setApprovalComments("");
                                  }}
                                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                >
                                  Need More Info
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApprovalRequest(request);
                                    setApprovalActionType("reject");
                                    setApprovalComments("");
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}

                          {request.comments && (
                            <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                              <p className="text-xs font-medium text-slate-700 mb-1">Comments:</p>
                              <p className="text-xs text-slate-600">{request.comments}</p>
                            </div>
                          )}
                          {request.respondedAt && (
                            <p className="text-xs text-slate-500 mt-2">
                              Responded: {new Date(request.respondedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Fields - Dynamic Display */}
          {ticketFormWithFields && ticketFormWithFields.fields ? (
            <div className="mb-8 pb-8 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">Form Details</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ticketFormWithFields.fields.map((field) => {
                  const formData = ticket.formData || {};
                  
                  // Get value from ticket object for standard fields, otherwise from formData
                  let fieldValue: any = null;
                  if (field.name === "title") {
                    fieldValue = ticket.title;
                  } else if (field.name === "description") {
                    fieldValue = ticket.description;
                  } else if (field.name === "type") {
                    // Map ticket type to form display value
                    const typeMap: Record<string, string> = {
                      "incident": "Incident",
                      "service_request": "Service Request",
                      "inquiry": "Inquiry",
                    };
                    fieldValue = typeMap[ticket.type] || ticket.type;
                  } else if (field.name === "priority") {
                    // Map ticket priority to form display value
                    const priorityMap: Record<string, string> = {
                      "low": "Low",
                      "medium": "Medium",
                      "high": "High",
                      "critical": "Critical",
                    };
                    fieldValue = priorityMap[ticket.priority] || ticket.priority;
                  } else if (field.name === "urgency") {
                    // Map ticket urgency to form display value
                    const urgencyMap: Record<string, string> = {
                      "low": "Low",
                      "medium": "Medium",
                      "high": "High",
                    };
                    fieldValue = urgencyMap[ticket.urgency] || ticket.urgency;
                  } else if (field.name === "category") {
                    fieldValue = ticket.category;
                  } else {
                    // Custom field - get from formData
                    fieldValue = formData[field.name];
                  }
                  
                  // Skip if field value is empty and field is not required
                  if ((fieldValue === null || fieldValue === undefined || fieldValue === "") && !field.required) {
                    return null;
                  }
                  
                  // Format the value based on field type
                  let displayValue: string = "";
                  if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
                    displayValue = "—";
                  } else if (field.fieldType === "checkbox") {
                    displayValue = fieldValue ? "Yes" : "No";
                  } else if (field.fieldType === "date" && fieldValue) {
                    try {
                      displayValue = new Date(fieldValue).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    } catch {
                      displayValue = String(fieldValue);
                    }
                  } else {
                    displayValue = String(fieldValue);
                  }
                  
                  return (
                    <div key={field._id} className="bg-slate-50 rounded-xl p-4">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 break-words">
                        {displayValue}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Fallback to old display if form not found */
            <>
              <div className="mb-8 pb-8 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">Ticket Information</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Type</span>
                    <p className="text-sm font-semibold text-slate-900 capitalize">{ticket.type.replace("_", " ")}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Urgency</span>
                    <p className="text-sm font-semibold text-slate-900 capitalize">{ticket.urgency}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SLA Details Section */}
          {slaDetails && (
              <div className="mb-8 pb-8 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">Service Level Agreement (SLA)</h2>
                </div>
                <div className={`rounded-xl p-5 border-2 ${slaDetails.statusBg}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="space-y-2">
                        {slaDetails.policy && (
                          <div>
                            <span className="text-xs text-slate-600">Policy: </span>
                            <span className="text-sm font-medium text-slate-900">{slaDetails.policy.name}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-slate-600">Deadline: </span>
                          <span className="text-sm font-medium text-slate-900">
                            {new Date(slaDetails.deadline).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${slaDetails.statusTextColor} ${slaDetails.statusBg.replace('bg-', 'bg-').replace('-50', '-100')} border`}>
                            {slaDetails.isOverdue ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : slaDetails.isUrgent ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {slaDetails.statusText}
                          </span>
                        </div>
                        {slaDetails.policy && (
                          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
                            <div>
                              <span className="text-xs text-slate-500">Response Time: </span>
                              <span className="text-sm font-medium text-slate-900">
                                {slaDetails.policy.responseTime < 60 
                                  ? `${slaDetails.policy.responseTime}m`
                                  : slaDetails.policy.responseTime < 1440
                                  ? `${Math.floor(slaDetails.policy.responseTime / 60)}h`
                                  : `${Math.floor(slaDetails.policy.responseTime / 1440)}d`
                                }
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500">Resolution Time: </span>
                              <span className="text-sm font-medium text-slate-900">
                                {slaDetails.policy.resolutionTime < 60 
                                  ? `${slaDetails.policy.resolutionTime}m`
                                  : slaDetails.policy.resolutionTime < 1440
                                  ? `${Math.floor(slaDetails.policy.resolutionTime / 60)}h`
                                  : `${Math.floor(slaDetails.policy.resolutionTime / 1440)}d`
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </Card>

              {/* Comments Card */}
      <Card padding="none" className="border border-slate-200">
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Comments</h2>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              {filteredComments?.length || 0}
            </span>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="space-y-4 mb-8">
            {!filteredComments || filteredComments.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">💬</span>
                <p className="text-slate-600 text-sm">No comments yet</p>
                <p className="text-slate-400 text-xs mt-1">Be the first to add a comment</p>
              </div>
            ) : (
              filteredComments.map((comment: any, index) => {
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
                        <UserAvatar
                          userId={comment.userId as Id<"users"> | null}
                          name={comment.userName || "Unknown"}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {comment.userName || "Unknown User"}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs text-blue-600 font-normal">(You)</span>
                            )}
                            {comment.visibility === "internal" && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                Internal
                              </span>
                            )}
                          </div>
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
            {/* Only show visibility selector to agents and admins - hidden from end users */}
            {currentUser && isAgentOrAdmin && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Visibility:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCommentVisibility("external")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      commentVisibility === "external"
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    External
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentVisibility("internal")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      commentVisibility === "internal"
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Internal
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  {commentVisibility === "internal" 
                    ? "Only agents and admins can see this"
                    : "Visible to everyone"}
                </span>
              </div>
            )}
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
      <Card padding="none" className="border border-slate-200">
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Activity History</h2>
          </div>
        </div>
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <TicketAudit ticketId={ticketId} />
        </div>
      </Card>
          </div>

          {/* Right Sidebar - Requester Information */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Requester Information Card */}
              {getCreatorInfo() && (
                <Card padding="md" className="border border-slate-200">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Requester</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <UserAvatar
                        userId={ticket.createdBy}
                        name={getCreatorInfo()?.name || "Unknown"}
                        size="md"
                      />
                      <div>
                        <p className="text-base font-semibold text-slate-900">{getCreatorInfo()?.name}</p>
                        {getCreatorInfo()?.jobTitle && (
                          <p className="text-xs text-slate-500 mt-0.5">{getCreatorInfo()?.jobTitle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    {getCreatorInfo()?.email && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 block mb-1">Email</span>
                        <a 
                          href={`mailto:${getCreatorInfo()?.email}`} 
                          className="text-sm text-slate-700 hover:text-slate-900 break-all"
                        >
                          {getCreatorInfo()?.email}
                        </a>
                      </div>
                    )}
                    {getCreatorInfo()?.phone && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 block mb-1">Phone</span>
                        <a 
                          href={`tel:${getCreatorInfo()?.phone}`} 
                          className="text-sm text-slate-700 hover:text-slate-900"
                        >
                          {getCreatorInfo()?.phone}
                        </a>
                      </div>
                    )}
                    {getCreatorInfo()?.location && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 block mb-1">Location</span>
                        <p className="text-sm text-slate-700">{getCreatorInfo()?.location}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Assignee & Dates Card */}
              <Card padding="md" className="border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Details</h3>
                <div className="space-y-4">
                  {/* Assignee */}
                  <div>
                    <span className="text-xs font-medium text-slate-500 block mb-1">Assignee</span>
                    <p className="text-sm font-medium text-slate-900">{getAssigneeName()}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    {/* Created Date */}
                    <div>
                      <span className="text-xs font-medium text-slate-500 block mb-1">Created</span>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(ticket.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    
                    {/* Updated Date */}
                    <div>
                      <span className="text-xs font-medium text-slate-500 block mb-1">Last Updated</span>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(ticket.updatedAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    
                    {/* Resolved Date */}
                    {ticket.resolvedAt && (
                      <div>
                        <span className="text-xs font-medium text-green-600 block mb-1">Resolved</span>
                        <p className="text-sm font-medium text-green-900">
                          {new Date(ticket.resolvedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-green-600 mt-0.5">
                          {new Date(ticket.resolvedAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

      {/* Approval Action Modal */}
      {selectedApprovalRequest && approvalActionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 -m-4 sm:-m-6 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {approvalActionType === "approve"
                  ? "Approve Request"
                  : approvalActionType === "reject"
                  ? "Reject Request"
                  : "Request More Information"}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Ticket:</p>
                <p className="text-slate-900">{ticket.title}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Stage:</p>
                <p className="text-slate-900">{selectedApprovalRequest.stage?.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Comments
                  {approvalActionType === "need_more_info" && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                  {approvalActionType !== "need_more_info" && (
                    <span className="text-slate-400 ml-1">(optional)</span>
                  )}
                </label>
                <Textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder={
                    approvalActionType === "approve"
                      ? "Add any comments about your approval..."
                      : approvalActionType === "reject"
                      ? "Please provide a reason for rejection..."
                      : "Please specify what additional information is needed..."
                  }
                  rows={4}
                  required={approvalActionType === "need_more_info"}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-200">
                <Button
                  variant="gradient"
                  onClick={handleApprovalAction}
                  className="flex-1 sm:flex-none"
                  disabled={
                    approvalActionType === "need_more_info" && !approvalComments.trim()
                  }
                >
                  {approvalActionType === "approve"
                    ? "Approve"
                    : approvalActionType === "reject"
                    ? "Reject"
                    : "Request More Info"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedApprovalRequest(null);
                    setApprovalActionType(null);
                    setApprovalComments("");
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
