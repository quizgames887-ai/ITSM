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
  
  const isAgentOrAdmin = currentUser?.role === "agent" || currentUser?.role === "admin";
  
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

  const [commentText, setCommentText] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<"internal" | "external">("external");
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

          {/* Form Fields - Dynamic Display */}
          {ticketFormWithFields && ticketFormWithFields.fields ? (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Form Details
              </h2>
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
                
                {/* System Fields */}
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
                  <div className="bg-green-50 rounded-xl p-4">
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
          ) : (
            /* Fallback to old display if form not found */
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          )}

          {/* SLA Details Section */}
          {ticket.slaDeadline && (() => {
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
            
            return (
              <div className={`mt-4 rounded-xl p-5 border-2 ${statusBg}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-slate-900">Service Level Agreement (SLA)</h3>
                    </div>
                    <div className="space-y-2">
                      {policy && (
                        <div>
                          <span className="text-xs text-slate-600">Policy: </span>
                          <span className="text-sm font-medium text-slate-900">{policy.name}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-slate-600">Deadline: </span>
                        <span className="text-sm font-medium text-slate-900">
                          {new Date(deadline).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${statusTextColor} ${statusBg.replace('bg-', 'bg-').replace('-50', '-100')} border`}>
                          {isOverdue ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : isUrgent ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          {statusText}
                        </span>
                      </div>
                      {policy && (
                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
                          <div>
                            <span className="text-xs text-slate-500">Response Time: </span>
                            <span className="text-sm font-medium text-slate-900">
                              {policy.responseTime < 60 
                                ? `${policy.responseTime}m`
                                : policy.responseTime < 1440
                                ? `${Math.floor(policy.responseTime / 60)}h`
                                : `${Math.floor(policy.responseTime / 1440)}d`
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Resolution Time: </span>
                            <span className="text-sm font-medium text-slate-900">
                              {policy.resolutionTime < 60 
                                ? `${policy.resolutionTime}m`
                                : policy.resolutionTime < 1440
                                ? `${Math.floor(policy.resolutionTime / 60)}h`
                                : `${Math.floor(policy.resolutionTime / 1440)}d`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
            <span className="text-sm font-normal text-slate-500">({filteredComments?.length || 0})</span>
          </h2>
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
            {isAgentOrAdmin && (
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
