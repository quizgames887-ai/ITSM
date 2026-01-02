"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";

const TICKET_CATEGORIES = ["IT Support", "HR", "Finance", "Facilities", "Security", "Other"];

export default function TicketsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (id) setUserId(id);
    if (role) setUserRole(role);
  }, []);

  // Temporary: Use existing parameters until Convex syncs userId/userRole
  // TODO: Switch back to userId/userRole once Convex dev server syncs
  const tickets = useQuery(
    api.tickets.list,
    userId && userRole
      ? userRole === "admin"
        ? {} // Admin sees all tickets
        : userRole === "agent"
        ? {
            // Agent: Fetch all, then filter client-side by tab
            // This is temporary - will use userId/userRole once Convex syncs
            createdBy: userId as Id<"users">, // Fetch created tickets, assigned will be filtered client-side
          }
        : {
            // User: Only tickets they created
            createdBy: userId as Id<"users">,
          }
      : "skip"
  );
  
  // For agents, we need to also fetch assigned tickets and merge
  const assignedTickets = useQuery(
    api.tickets.list,
    userId && userRole === "agent"
      ? {
          assignedTo: userId as Id<"users">,
        }
      : "skip"
  );
  
  // Merge tickets for agents (created + assigned)
  const allAgentTickets = userRole === "agent" && tickets && assignedTickets
    ? [...(tickets || []), ...(assignedTickets || [])].filter(
        (ticket, index, self) => index === self.findIndex((t) => t._id === ticket._id)
      ) // Remove duplicates
    : tickets;
  const users = useQuery(api.users.list, {});
  const createTicket = useMutation(api.tickets.create);
  
  const { success, error: showError } = useToastContext();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tab state for agents: "created" (My Tickets) or "assigned" (Assigned to Me)
  const [activeTab, setActiveTab] = useState<"created" | "assigned">("created");
  
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    type: "incident" as "incident" | "service_request" | "inquiry",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    urgency: "medium" as "low" | "medium" | "high",
    category: "IT Support",
  });

  const currentUserId = userId;

  if (tickets === undefined || (userRole === "agent" && assignedTickets === undefined)) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  // Get user name by ID
  const getUserName = (userId: string | null) => {
    if (!userId || !users) return "Unassigned";
    const user = users.find((u) => u._id === userId);
    return user?.name || "Unknown";
  };

  // Filter tickets based on role and tab
  let ticketsToDisplay = allAgentTickets || tickets;
  
  // For agents, filter by tab (created vs assigned)
  if (userRole === "agent" && userId && ticketsToDisplay) {
    if (activeTab === "created") {
      // Show only tickets created by the agent
      ticketsToDisplay = ticketsToDisplay.filter((ticket) => ticket.createdBy === userId);
    } else if (activeTab === "assigned") {
      // Show only tickets assigned to the agent
      ticketsToDisplay = ticketsToDisplay.filter((ticket) => ticket.assignedTo === userId);
    }
  }
  
  // Apply status and priority filters
  const filteredTickets = ticketsToDisplay.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    return true;
  });

  // Status badge colors
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: "bg-blue-100 text-blue-700 border-blue-200",
      in_progress: "bg-amber-100 text-amber-700 border-amber-200",
      on_hold: "bg-orange-100 text-orange-700 border-orange-200",
      resolved: "bg-green-100 text-green-700 border-green-200",
      closed: "bg-slate-100 text-slate-600 border-slate-200",
    };
    const labels: Record<string, string> = {
      new: "New",
      in_progress: "In Progress",
      on_hold: "On Hold",
      resolved: "Resolved",
      closed: "Closed",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.new}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Priority badge colors
  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: "bg-slate-100 text-slate-600 border-slate-200",
      medium: "bg-blue-100 text-blue-700 border-blue-200",
      high: "bg-orange-100 text-orange-700 border-orange-200",
      critical: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${styles[priority] || styles.medium}`}>
        {priority}
      </span>
    );
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim()) {
      showError("Ticket title is required");
      return;
    }
    if (!newTicket.description.trim()) {
      showError("Ticket description is required");
      return;
    }
    if (!currentUserId) {
      showError("You must be logged in to create a ticket");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTicket({
        title: newTicket.title.trim(),
        description: newTicket.description.trim(),
        type: newTicket.type,
        priority: newTicket.priority,
        urgency: newTicket.urgency,
        category: newTicket.category,
        createdBy: currentUserId as Id<"users">,
      });
      
      success("Ticket created successfully!");
      setShowCreateForm(false);
      setNewTicket({
        title: "",
        description: "",
        type: "incident",
        priority: "medium",
        urgency: "medium",
        category: "IT Support",
      });
    } catch (err: any) {
      showError(err.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-600">
            Manage and track all your support tickets
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Ticket
        </Button>
      </div>

      {/* Create Ticket Form */}
      {showCreateForm && (
        <Card padding="lg" className="border-2 border-blue-200 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-lg">Create New Ticket</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <Input
              label="Title"
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              placeholder="Brief summary of the issue"
            />
            
            <Textarea
              label="Description"
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              placeholder="Provide detailed information about your request..."
              rows={4}
            />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select
                label="Type"
                value={newTicket.type}
                onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value as any })}
                options={[
                  { value: "incident", label: "Incident" },
                  { value: "service_request", label: "Service Request" },
                  { value: "inquiry", label: "Inquiry" },
                ]}
              />
              
              <Select
                label="Priority"
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "critical", label: "Critical" },
                ]}
              />
              
              <Select
                label="Urgency"
                value={newTicket.urgency}
                onChange={(e) => setNewTicket({ ...newTicket, urgency: e.target.value as any })}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
              
              <Select
                label="Category"
                value={newTicket.category}
                onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                options={TICKET_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="gradient" 
                onClick={handleCreateTicket}
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Ticket"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs for Agents */}
      {userRole === "agent" && (
        <div className="border-b border-slate-200">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("created")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "created"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              My Tickets
            </button>
            <button
              onClick={() => setActiveTab("assigned")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "assigned"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Assigned to Me
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <div className="ml-auto text-sm text-slate-500">
          {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      {filteredTickets.length === 0 ? (
        <Card hover padding="lg">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            title="No tickets found"
            description={
              (allAgentTickets || tickets)?.length === 0
                ? "Create your first ticket to get started."
                : userRole === "agent" && activeTab === "assigned"
                ? "No tickets are currently assigned to you."
                : userRole === "agent" && activeTab === "created"
                ? "You haven't created any tickets yet."
                : "No tickets match your current filters."
            }
          />
          {(allAgentTickets || tickets)?.length === 0 && (
            <div className="text-center mt-4">
              <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
                Create Your First Ticket
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                    Assignee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/tickets/${ticket._id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {ticket.title}
                        </Link>
                        <span className="text-xs text-slate-500">
                          #TK-{ticket._id.slice(-6).toUpperCase()}
                        </span>
                        {/* Mobile badges */}
                        <div className="flex gap-2 mt-2 sm:hidden">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-600">
                        {getUserName(ticket.assignedTo)}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-slate-600 capitalize">
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-sm text-slate-500">
                        {formatDate(ticket.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/tickets/${ticket._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        View
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Table footer */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
            Showing {filteredTickets.length} of {ticketsToDisplay.length} {userRole === "agent" ? (activeTab === "created" ? "created" : "assigned") : ""} tickets
          </div>
        </Card>
      )}
    </div>
  );
}
