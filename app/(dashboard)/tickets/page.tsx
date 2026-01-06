"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DynamicForm } from "@/components/forms/DynamicForm";
import { ColumnCustomizer, ColumnConfig } from "@/components/tickets/ColumnCustomizer";
import { ViewManager, SavedView } from "@/components/tickets/ViewManager";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";

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
  const slaPolicies = useQuery(api.sla.list, {});
  const createTicket = useMutation(api.tickets.create);
  const deleteTickets = useMutation(api.tickets.deleteTickets);
  
  // State for selected tickets
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  const { success, error: showError } = useToastContext();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tab state for agents: "created" (My Tickets) or "assigned" (Assigned to Me)
  const [activeTab, setActiveTab] = useState<"created" | "assigned">("created");
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Column customization and view management
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [showViewManager, setShowViewManager] = useState(false);
  const [currentView, setCurrentView] = useState<SavedView | null>(null);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Default columns configuration
  const defaultColumns: ColumnConfig[] = useMemo(() => [
    { id: "select", label: "Select", visible: userRole === "admin", order: 0 },
    { id: "ticket", label: "Ticket", visible: true, order: 1 },
    { id: "description", label: "Description", visible: true, order: 2 },
    { id: "status", label: "Status", visible: true, order: 3 },
    { id: "priority", label: "Priority", visible: true, order: 4 },
    { id: "type", label: "Type", visible: true, order: 5 },
    { id: "assignee", label: "Assignee", visible: true, order: 6 },
    { id: "reporter", label: "Reporter", visible: true, order: 7 },
    { id: "category", label: "Category", visible: true, order: 8 },
    { id: "created", label: "Created", visible: true, order: 9 },
    { id: "updated", label: "Last Updated", visible: true, order: 10 },
    { id: "sla", label: "SLA", visible: true, order: 11 },
    { id: "action", label: "Action", visible: true, order: 12 },
  ], [userRole]);
  
  const [columns, setColumns] = useState<ColumnConfig[]>(() => defaultColumns);
  
  // Update columns when userRole changes
  useEffect(() => {
    if (userRole && !currentView) {
      setColumns(defaultColumns);
    }
  }, [userRole, defaultColumns, currentView]);
  
  // Load saved view on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedViewId = localStorage.getItem("ticketViewId");
      if (savedViewId && savedViewId !== "default") {
        try {
          const stored = localStorage.getItem("ticketViews");
          if (stored) {
            const views: SavedView[] = JSON.parse(stored);
            const view = views.find((v) => v.id === savedViewId);
            if (view) {
              setCurrentView(view);
              setColumns(view.columns);
              setStatusFilter(view.filters.status);
              setPriorityFilter(view.filters.priority);
              if (view.sortBy) setSortBy(view.sortBy);
              if (view.sortOrder) setSortOrder(view.sortOrder);
            }
          }
        } catch (error) {
          console.error("Failed to load saved view:", error);
        }
      }
    }
  }, []);
  
  // Reset selected tickets when filters change
  useEffect(() => {
    setSelectedTickets(new Set());
  }, [statusFilter, priorityFilter, activeTab, currentPage]);

  // Reset to page 1 when filters change (must be before any conditional returns)
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, activeTab]);
  
  // Helper function to map form field values to ticket creation format
  const mapFormDataToTicket = (formData: Record<string, any>) => {
    // Map type from form value to ticket format
    const typeMap: Record<string, "incident" | "service_request" | "inquiry"> = {
      "Incident": "incident",
      "Service Request": "service_request",
      "Inquiry": "inquiry",
      "incident": "incident",
      "service_request": "service_request",
      "inquiry": "inquiry",
    };
    
    // Map priority from form value to ticket format
    const priorityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
      "Low": "low",
      "Medium": "medium",
      "High": "high",
      "Critical": "critical",
      "low": "low",
      "medium": "medium",
      "high": "high",
      "critical": "critical",
    };
    
    // Map urgency from form value to ticket format
    const urgencyMap: Record<string, "low" | "medium" | "high"> = {
      "Low": "low",
      "Medium": "medium",
      "High": "high",
      "low": "low",
      "medium": "medium",
      "high": "high",
    };
    
    return {
      title: formData.title || "",
      description: formData.description || "",
      type: typeMap[formData.type] || "incident",
      priority: priorityMap[formData.priority] || "medium",
      urgency: urgencyMap[formData.urgency] || "medium",
      category: formData.category || "IT Support",
    };
  };

  const currentUserId = userId;

  // Calculate KPI metrics for agents and admins
  // Use all tickets (not filtered by tab) for KPIs
  // IMPORTANT: This hook must be called before any early returns to maintain hooks order
  const kpiMetrics = useMemo(() => {
    if ((userRole !== "agent" && userRole !== "admin") || !tickets) {
      return null;
    }

    // For KPIs, use all tickets (not filtered by tab)
    const allTickets = (allAgentTickets || tickets) || [];
    
    // Basic counts
    const total = allTickets.length;
    const newTickets = allTickets.filter((t) => t.status === "new").length;
    const inProgress = allTickets.filter((t) => t.status === "in_progress").length;
    const openTickets = newTickets + inProgress;
    const resolved = allTickets.filter((t) => t.status === "resolved").length;
    const closed = allTickets.filter((t) => t.status === "closed").length;
    const onHold = allTickets.filter((t) => t.status === "on_hold").length;
    
    // Priority counts
    const critical = allTickets.filter((t) => t.priority === "critical").length;
    const high = allTickets.filter((t) => t.priority === "high").length;
    const medium = allTickets.filter((t) => t.priority === "medium").length;
    const low = allTickets.filter((t) => t.priority === "low").length;
    
    // Resolution metrics
    const resolvedTickets = allTickets.filter((t) => t.resolvedAt !== null);
    const avgResolutionTime = resolvedTickets.length > 0
      ? Math.round(
          resolvedTickets.reduce((sum, t) => {
            if (t.resolvedAt && t.createdAt) {
              return sum + (t.resolvedAt - t.createdAt);
            }
            return sum;
          }, 0) / resolvedTickets.length / (1000 * 60 * 60 * 24) // Convert to days
        )
      : 0;
    
    // Unassigned tickets
    const unassigned = allTickets.filter((t) => t.assignedTo === null).length;
    
    return {
      total,
      newTickets,
      inProgress,
      openTickets,
      resolved,
      closed,
      onHold,
      critical,
      high,
      medium,
      low,
      avgResolutionTime,
      unassigned,
    };
  }, [allAgentTickets, tickets, assignedTickets, userRole]);

  // Get visible columns sorted by order - MUST be before any early returns
  const visibleColumns = useMemo(() => {
    return columns
      .filter((col) => col.visible)
      .sort((a, b) => a.order - b.order);
  }, [columns]);

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
  let filteredTickets = ticketsToDisplay.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    return true;
  });
  
  // Apply sorting
  filteredTickets = [...filteredTickets].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case "title":
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "priority":
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case "createdAt":
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      case "updatedAt":
        aValue = a.updatedAt;
        bValue = b.updatedAt;
        break;
      case "category":
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      default:
        aValue = a.createdAt;
        bValue = b.createdAt;
    }
    
    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

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
  
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? "Just now" : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days}d ago`;
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };
  
  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      incident: "bg-red-100 text-red-700 border-red-200",
      service_request: "bg-blue-100 text-blue-700 border-blue-200",
      inquiry: "bg-purple-100 text-purple-700 border-purple-200",
    };
    const labels: Record<string, string> = {
      incident: "Incident",
      service_request: "Service Request",
      inquiry: "Inquiry",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${styles[type] || styles.incident}`}>
        {labels[type] || type}
      </span>
    );
  };
  
  // View management handlers
  const handleViewSelect = (view: SavedView) => {
    setCurrentView(view);
    setColumns(view.columns);
    setStatusFilter(view.filters.status);
    setPriorityFilter(view.filters.priority);
    if (view.sortBy) setSortBy(view.sortBy);
    if (view.sortOrder) setSortOrder(view.sortOrder);
    localStorage.setItem("ticketViewId", view.id);
    setShowViewManager(false);
  };
  
  const handleViewSave = (view: SavedView) => {
    setCurrentView(view);
    localStorage.setItem("ticketViewId", view.id);
    success("View saved successfully");
  };
  
  const handleViewDelete = (viewId: string) => {
    if (currentView?.id === viewId) {
      setCurrentView(null);
      setColumns(defaultColumns);
      localStorage.removeItem("ticketViewId");
    }
    success("View deleted successfully");
  };
  
  const handleColumnsChange = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    if (currentView) {
      const updatedView = { ...currentView, columns: newColumns };
      setCurrentView(updatedView);
      // Update in localStorage
      try {
        const stored = localStorage.getItem("ticketViews");
        if (stored) {
          const views: SavedView[] = JSON.parse(stored);
          const updatedViews = views.map((v) => (v.id === updatedView.id ? updatedView : v));
          localStorage.setItem("ticketViews", JSON.stringify(updatedViews));
        }
      } catch (error) {
        console.error("Failed to update view:", error);
      }
    }
  };
  
  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(columnId);
      setSortOrder("asc");
    }
  };
  
  const getSortIcon = (columnId: string) => {
    if (sortBy !== columnId) {
      return (
        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === "asc" ? (
      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };
  
  // Helper function to get SLA status
  const getSLAStatus = (ticket: any) => {
    if (!ticket.slaDeadline) return null;
    
    const now = Date.now();
    const deadline = ticket.slaDeadline;
    const diff = deadline - now;
    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const isOverdue = diff < 0;
    const isUrgent = diff >= 0 && diff < 60 * 60 * 1000; // Less than 1 hour remaining
    
    // Get SLA policy name
    const policy = slaPolicies?.find(p => p.priority === ticket.priority && p.enabled);
    
    let statusText = "";
    let statusColor = "";
    
    if (isOverdue) {
      const overdueHours = Math.floor(Math.abs(diffMinutes) / 60);
      const overdueDays = Math.floor(overdueHours / 24);
      if (overdueDays > 0) {
        statusText = `${overdueDays}d overdue`;
      } else if (overdueHours > 0) {
        statusText = `${overdueHours}h overdue`;
      } else {
        statusText = `${Math.abs(diffMinutes)}m overdue`;
      }
      statusColor = "text-red-600 bg-red-50 border-red-200";
    } else if (isUrgent) {
      if (diffMinutes < 60) {
        statusText = `${diffMinutes}m left`;
      } else {
        statusText = `${diffHours}h left`;
      }
      statusColor = "text-orange-600 bg-orange-50 border-orange-200";
    } else {
      if (diffDays > 0) {
        statusText = `${diffDays}d left`;
      } else if (diffHours > 0) {
        statusText = `${diffHours}h left`;
      } else {
        statusText = `${diffMinutes}m left`;
      }
      statusColor = "text-green-600 bg-green-50 border-green-200";
    }
    
    return {
      text: statusText,
      color: statusColor,
      isOverdue,
      isUrgent,
      policyName: policy?.name || null,
      deadline: deadline,
    };
  };

  // Handle ticket selection
  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTickets.size === paginatedTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(paginatedTickets.map((t) => t._id)));
    }
  };

  // Handle delete selected tickets
  const handleDeleteSelected = async () => {
    if (!userId || userRole !== "admin") {
      showError("Only admins can delete tickets");
      return;
    }

    if (selectedTickets.size === 0) {
      showError("No tickets selected");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedTickets.size} ticket${selectedTickets.size > 1 ? "s" : ""}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteTickets({
        ids: Array.from(selectedTickets) as Id<"tickets">[],
        userId: userId as Id<"users">,
      });
      
      success(`Successfully deleted ${result.deleted} ticket${result.deleted > 1 ? "s" : ""}`);
      setSelectedTickets(new Set());
    } catch (err: any) {
      showError(err.message || "Failed to delete tickets");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateTicket = async (formData: Record<string, any>) => {
    if (!currentUserId) {
      showError("You must be logged in to create a ticket");
      return;
    }

    // Map form data to ticket format
    const ticketData = mapFormDataToTicket(formData);
    
    if (!ticketData.title.trim()) {
      showError("Ticket title is required");
      return;
    }
    if (!ticketData.description.trim()) {
      showError("Ticket description is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTicket({
        title: ticketData.title.trim(),
        description: ticketData.description.trim(),
        type: ticketData.type,
        priority: ticketData.priority,
        urgency: ticketData.urgency,
        category: ticketData.category,
        createdBy: currentUserId as Id<"users">,
        formData: formData, // Pass all form data including custom fields
      });
      
      success("Ticket created successfully!");
      setShowCreateForm(false);
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
          +
        </Button>
      </div>

      {/* KPI Dashboard for Agents and Admins */}
      {(userRole === "agent" || userRole === "admin") && kpiMetrics && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Ticket Overview</h2>
          </div>
          
          {/* Main KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatsCard
              title="Total Tickets"
              value={kpiMetrics.total}
              color="default"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StatsCard
              title="Open"
              value={kpiMetrics.openTickets}
              color="blue"
              onClick={() => {
                setStatusFilter("new");
                setPriorityFilter("all");
              }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatsCard
              title="In Progress"
              value={kpiMetrics.inProgress}
              color="yellow"
              onClick={() => {
                setStatusFilter("in_progress");
                setPriorityFilter("all");
              }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            />
            <StatsCard
              title="Resolved"
              value={kpiMetrics.resolved}
              color="green"
              onClick={() => {
                setStatusFilter("resolved");
                setPriorityFilter("all");
              }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatsCard
              title="Critical"
              value={kpiMetrics.critical}
              color="red"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("critical");
              }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <StatsCard
              title="Unassigned"
              value={kpiMetrics.unassigned}
              color="yellow"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card 
              padding="sm" 
              className="text-center cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => {
                setStatusFilter("new");
                setPriorityFilter("all");
              }}
            >
              <div className="text-xl font-bold text-blue-600">{kpiMetrics.newTickets}</div>
              <div className="text-xs text-slate-500 mt-1">New</div>
            </Card>
            <Card 
              padding="sm" 
              className="text-center cursor-pointer hover:bg-orange-50 transition-colors"
              onClick={() => {
                setStatusFilter("on_hold");
                setPriorityFilter("all");
              }}
            >
              <div className="text-xl font-bold text-orange-600">{kpiMetrics.onHold}</div>
              <div className="text-xs text-slate-500 mt-1">On Hold</div>
            </Card>
            <Card 
              padding="sm" 
              className="text-center cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => {
                setStatusFilter("closed");
                setPriorityFilter("all");
              }}
            >
              <div className="text-xl font-bold text-slate-600">{kpiMetrics.closed}</div>
              <div className="text-xs text-slate-500 mt-1">Closed</div>
            </Card>
            <Card 
              padding="sm" 
              className="text-center cursor-pointer hover:bg-red-50 transition-colors"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("high");
              }}
            >
              <div className="text-xl font-bold text-red-600">{kpiMetrics.high}</div>
              <div className="text-xs text-slate-500 mt-1">High Priority</div>
            </Card>
            <Card 
              padding="sm" 
              className="text-center cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("medium");
              }}
            >
              <div className="text-xl font-bold text-blue-600">{kpiMetrics.medium}</div>
              <div className="text-xs text-slate-500 mt-1">Medium Priority</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-xl font-bold text-slate-600">
                {kpiMetrics.avgResolutionTime > 0 ? `${kpiMetrics.avgResolutionTime}d` : "N/A"}
              </div>
              <div className="text-xs text-slate-500 mt-1">Avg Resolution</div>
            </Card>
          </div>
        </div>
      )}

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
          
          {ticketFormWithFields && ticketFormWithFields.fields ? (
            <div className="space-y-4">
              <DynamicForm
                fields={ticketFormWithFields.fields}
                onSubmit={handleCreateTicket}
                submitLabel={isSubmitting ? "Creating..." : "Create Ticket"}
                loading={isSubmitting}
              />
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : ticketFormWithFields === undefined ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-slate-500">Loading form...</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">Ticket form not found. Please create a ticket form first.</p>
              <div className="flex gap-2 justify-center">
                <Link href="/forms">
                  <Button variant="gradient">Go to Forms</Button>
                </Link>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
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

      {/* Filters and Bulk Actions */}
      <div className="flex flex-wrap gap-3 items-center">
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
        
        {/* View Management */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnCustomizer(true)}
            className="relative text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 hover:border-slate-300 transition-all group"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {columns.filter(c => !c.visible).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>
                )}
              </div>
              <span className="font-medium">Columns</span>
              {columns.filter(c => !c.visible).length > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                  {columns.filter(c => !c.visible).length} hidden
                </span>
              )}
            </div>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowViewManager(true)}
            className="relative text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 hover:border-slate-300 transition-all group"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="w-4 h-4 text-slate-600 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                {currentView && currentView.id !== "default" && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full border border-white"></span>
                )}
              </div>
              <span className="font-medium">Views</span>
              {currentView && currentView.id !== "default" ? (
                <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                  {currentView.name}
                </span>
              ) : (
                <span className="text-xs text-slate-500">Default</span>
              )}
            </div>
          </Button>
        </div>
        
        {userRole === "admin" && selectedTickets.size > 0 && (
          <Button
            variant="outline"
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isDeleting ? "Deleting..." : `Delete ${selectedTickets.size} Selected`}
          </Button>
        )}
        <div className="ml-auto text-sm text-slate-500">
          {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
          {userRole === "admin" && selectedTickets.size > 0 && (
            <span className="ml-2 text-blue-600 font-medium">
              ({selectedTickets.size} selected)
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      {paginatedTickets.length === 0 && filteredTickets.length > 0 ? (
        <Card padding="lg">
          <div className="text-center text-slate-600">
            No tickets on this page. Please navigate to another page.
          </div>
        </Card>
      ) : filteredTickets.length === 0 ? (
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
                  {visibleColumns.map((column) => {
                    if (column.id === "select" && userRole !== "admin") return null;
                    const isSortable = ["title", "status", "priority", "createdAt", "updatedAt", "category"].includes(column.id);
                    return (
                      <th
                        key={column.id}
                        className={`px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider ${
                          column.id === "action" ? "text-right" : "text-left"
                        } ${column.id === "select" ? "w-12" : ""}`}
                      >
                        {isSortable ? (
                          <button
                            onClick={() => handleSort(column.id)}
                            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                          >
                            {column.label}
                            {getSortIcon(column.id)}
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedTickets.has(ticket._id) ? "bg-blue-50" : ""
                    }`}
                  >
                    {visibleColumns.map((column) => {
                      if (column.id === "select") {
                        if (userRole !== "admin") return null;
                        return (
                          <td key={column.id} className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedTickets.has(ticket._id)}
                              onChange={() => handleSelectTicket(ticket._id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                        );
                      }
                      
                      if (column.id === "ticket") {
                        return (
                          <td key={column.id} className="px-4 py-4">
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
                            </div>
                          </td>
                        );
                      }
                      
                      if (column.id === "description") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            <p className="text-sm text-slate-600 line-clamp-2 max-w-md">
                              {ticket.description || "No description"}
                            </p>
                          </td>
                        );
                      }
                      
                      if (column.id === "status") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            {getStatusBadge(ticket.status)}
                          </td>
                        );
                      }
                      
                      if (column.id === "priority") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            {getPriorityBadge(ticket.priority)}
                          </td>
                        );
                      }
                      
                      if (column.id === "type") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            {getTypeBadge(ticket.type)}
                          </td>
                        );
                      }
                      
                      if (column.id === "assignee") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            <span className="text-sm text-slate-600">
                              {getUserName(ticket.assignedTo)}
                            </span>
                          </td>
                        );
                      }
                      
                      if (column.id === "reporter") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            <span className="text-sm text-slate-600">
                              {getUserName(ticket.createdBy)}
                            </span>
                          </td>
                        );
                      }
                      
                      if (column.id === "category") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            <span className="text-sm text-slate-600 capitalize">
                              {ticket.category}
                            </span>
                          </td>
                        );
                      }
                      
                      if (column.id === "created") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-500">
                                {formatDate(ticket.createdAt)}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDateTime(ticket.createdAt)}
                              </span>
                            </div>
                          </td>
                        );
                      }
                      
                      if (column.id === "updated") {
                        return (
                          <td key={column.id} className="px-4 py-4">
                            <span className="text-sm text-slate-500">
                              {formatDateTime(ticket.updatedAt)}
                            </span>
                          </td>
                        );
                      }
                      
                      if (column.id === "sla") {
                        const slaStatus = getSLAStatus(ticket);
                        return (
                          <td key={column.id} className="px-4 py-4">
                            {!slaStatus ? (
                              <span className="text-xs text-slate-400">No SLA</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${slaStatus.color}`}>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {slaStatus.text}
                                </span>
                                {slaStatus.policyName && (
                                  <span className="text-xs text-slate-500 truncate max-w-[120px]" title={slaStatus.policyName}>
                                    {slaStatus.policyName}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      }
                      
                      if (column.id === "action") {
                        return (
                          <td key={column.id} className="px-4 py-4 text-right">
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
                        );
                      }
                      
                      return null;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} tickets
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </Button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Table footer */}
          {totalPages <= 1 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
              Showing {filteredTickets.length} of {ticketsToDisplay.length} {userRole === "agent" ? (activeTab === "created" ? "created" : "assigned") : ""} tickets
            </div>
          )}
        </Card>
      )}
      
      {/* Column Customizer Modal */}
      {showColumnCustomizer && (
        <ColumnCustomizer
          columns={columns}
          onColumnsChange={handleColumnsChange}
          onClose={() => setShowColumnCustomizer(false)}
        />
      )}
      
      {/* View Manager Modal */}
      {showViewManager && (
        <ViewManager
          currentView={currentView}
          onViewSelect={handleViewSelect}
          onViewSave={handleViewSave}
          onViewDelete={handleViewDelete}
          onClose={() => setShowViewManager(false)}
          currentColumns={columns}
          currentFilters={{
            status: statusFilter,
            priority: priorityFilter,
          }}
          currentSort={{
            by: sortBy,
            order: sortOrder,
          }}
        />
      )}
    </div>
  );
}
