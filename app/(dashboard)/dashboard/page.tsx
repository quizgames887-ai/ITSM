"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { AnnouncementSlider } from "@/components/dashboard/AnnouncementSlider";
import { useToastContext } from "@/contexts/ToastContext";

// Services will be fetched from the database

// Helper to normalize logoId (handle cases where it might be a string)
function normalizeLogoId(logoId: any): Id<"_storage"> | null {
  if (!logoId) return null;
  if (typeof logoId === "string") {
    try {
      // Try to parse if it's a JSON string
      const parsed = JSON.parse(logoId);
      if (typeof parsed === "object" && parsed.storageId) {
        return parsed.storageId as Id<"_storage">;
      }
      return parsed as Id<"_storage">;
    } catch {
      // If not JSON, treat as direct storage ID
      return logoId as Id<"_storage">;
    }
  }
  return logoId as Id<"_storage">;
}

// Component to handle service logo display with storage URL
function ServiceLogoDisplay({ service, size = "small" }: { service: any; size?: "small" | "medium" | "large" }) {
  const normalizedLogoId = normalizeLogoId(service?.logoId);
  const logoUrl = useQuery(
    api.serviceCatalog.getStorageUrl,
    normalizedLogoId ? { storageId: normalizedLogoId } : "skip"
  );

  const sizeClasses = {
    small: "w-10 h-10 text-lg",
    medium: "w-12 h-12 text-2xl",
    large: "w-16 h-16 text-2xl",
  };

  return (
    <div className={`${sizeClasses[size]} ${service.color} rounded-xl flex items-center justify-center overflow-hidden ${size === "small" ? "group-hover:scale-110 transition-transform mb-2" : size === "large" ? "group-hover:scale-110 transition-transform mb-3" : ""}`}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={service.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{service.icon}</span>
      )}
    </div>
  );
}

const favoriteLinks = [
  { name: "Get Help & Support", icon: "❓", color: "text-purple-500" },
  { name: "My Requests / All Requests", icon: "💜", color: "text-purple-500" },
  { name: "Profile Settings", icon: "⚙️", color: "text-green-500" },
  { name: "Knowledge Base", icon: "📖", color: "text-blue-500" },
  { name: "Services User Guide", icon: "📋", color: "text-amber-500" },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 lg:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 h-64 bg-slate-200 rounded-xl"></div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [suggestionCategory, setSuggestionCategory] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any>(null);
  const [todoForm, setTodoForm] = useState({
    title: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const [showTodoOptions, setShowTodoOptions] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    type: "service_request" as "incident" | "service_request" | "inquiry",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    urgency: "medium" as "low" | "medium" | "high",
  });
  
  // Event management state
  // Initialize selectedDate to today's date
  const getTodayDateStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [viewingEvent, setViewingEvent] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    date: "",
  });

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const role = localStorage.getItem("userRole");
    if (id) setUserId(id);
    if (role) setUserRole(role);
  }, []);

  // Close todo options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTodoOptions) {
        setShowTodoOptions(null);
      }
    };

    if (showTodoOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTodoOptions]);

  // Role-based ticket visibility:
  // - Admin: sees all tickets
  // - Agent: sees tickets they created OR tickets assigned to them
  // - User: sees only tickets they created
  const tickets = useQuery(
    api.tickets.list,
    userId && userRole
      ? {
          userId: userId as Id<"users">,
          userRole: userRole as "user" | "agent" | "admin",
        }
      : "skip"
  );

  // Fetch all users to get assignee names
  const users = useQuery(api.users.list, {});
  
  // Fetch SLA policies for SLA status display
  const slaPolicies = useQuery(api.sla.list, {});
  
  // Fetch service catalog (active services only)
  const services = useQuery(api.serviceCatalog.list, { activeOnly: true });
  
  // Fetch user's favorite service IDs
  const favoriteServiceIds = useQuery(
    (api.serviceCatalog as any).getUserFavoriteIds,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as Id<"serviceCatalog">[] | undefined;
  
  // Fetch user's favorite services with details
  const favoriteServices = useQuery(
    (api.serviceCatalog as any).getUserFavorites,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as any[] | undefined;
  
  // Fetch all active announcements for slider
  const announcements = useQuery(api.announcements.getActive, {});
  
  // Fetch events for selected date (all users can see all events)
  // Using bracket notation to avoid TypeScript errors until Convex syncs
  const events = useQuery(
    (api as any).events?.getByDate,
    selectedDate ? { 
      date: selectedDate
      // Don't filter by userId - all users can see all events
    } : "skip"
  ) as any[] | undefined;

  // Fetch active vote
  const activeVote = useQuery((api as any).votes?.getActive, {}) as any;
  
  // Fetch user's vote for active poll
  const userVote = useQuery(
    (api as any).votes?.getUserVote,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as string | null | undefined;

  // Fetch todos for current user
  const todos = useQuery(
    (api as any).todos?.list,
    userId ? { userId: userId as Id<"users">, limit: 5 } : "skip"
  ) as any[] | undefined;
  
  // Fetch storage URL for selected service logo
  const normalizedSelectedLogoId = selectedService?.logoId 
    ? normalizeLogoId(selectedService.logoId) 
    : null;
  const selectedServiceLogoUrl = useQuery(
    api.serviceCatalog.getStorageUrl,
    normalizedSelectedLogoId ? { storageId: normalizedSelectedLogoId } : "skip"
  );
  
  const router = useRouter();
  const createTicket = useMutation(api.tickets.create);
  const toggleFavorite = useMutation((api.serviceCatalog as any).toggleFavorite);
  const submitVote = useMutation((api as any).votes?.submitVote);
  const submitSuggestion = useMutation((api as any).suggestions?.submit);
  const { success, error: showError } = useToastContext();
  
  // Event management mutations
  // Using bracket notation to avoid TypeScript errors until Convex syncs
  const createEvent = useMutation((api as any).events?.create);
  const updateEvent = useMutation((api as any).events?.update);
  const deleteEvent = useMutation((api as any).events?.remove);
  
  // Get ticket IDs for escalation check (compute after all hooks)
  const ticketIds = tickets ? tickets.map(t => t._id) : [];
  const escalatedTicketIds = useQuery(
    api.audit.getTicketsWithEscalations,
    ticketIds.length > 0 ? { ticketIds } : "skip"
  );

  // Early return check - must be after ALL hooks
  if (tickets === undefined || escalatedTicketIds === undefined || services === undefined) {
    return <LoadingSkeleton />;
  }
  
  // favoriteServiceIds and favoriteServices may be undefined if Convex hasn't synced yet
  // This is okay - the UI will handle undefined gracefully

  const handleServiceClick = (service: any) => {
    setSelectedService(service);
    setRequestForm({
      title: "",
      description: "",
      type: "service_request",
      priority: "medium",
      urgency: "medium",
    });
    setShowRequestForm(true);
  };

  const handleToggleFavorite = async (serviceId: Id<"serviceCatalog">, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      showError("You must be logged in to favorite services");
      return;
    }

    try {
      await toggleFavorite({
        userId: userId as Id<"users">,
        serviceId,
      });
      // The query will automatically refetch and update the UI
    } catch (err: any) {
      // If the function doesn't exist yet, show a helpful message
      if (err.message?.includes("Could not find public function")) {
        showError("Favorites feature is not available yet. Please restart 'npx convex dev' to enable it.");
      } else {
        showError(err.message || "Failed to update favorite");
      }
    }
  };

  const isServiceFavorite = (serviceId: Id<"serviceCatalog">) => {
    return favoriteServiceIds?.includes(serviceId) || false;
  };

  // Event management handlers
  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const handleAddEvent = (dateStr?: string) => {
    const targetDate = dateStr || selectedDate;
    setEventForm({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      date: targetDate,
    });
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleViewEvent = (event: any) => {
    setViewingEvent(event);
    setShowViewModal(true);
  };

  const handleEditEvent = (event: any) => {
    // Convert date from YYYY-MM-DD to date input format
    setEventForm({
      title: event.title,
      description: event.description || "",
      startTime: event.startTime, // Already in 12h format
      endTime: event.endTime, // Already in 12h format
      date: event.date, // Already in YYYY-MM-DD format
    });
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId: Id<"events">) => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    if (!userId) {
      showError("You must be logged in to delete events");
      return;
    }

    try {
      await deleteEvent({ id: eventId, userId: userId as Id<"users"> });
      success("Event deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete event");
    }
  };

  const handleEventSubmit = async () => {
    if (!eventForm.title.trim()) {
      showError("Event title is required");
      return;
    }
    if (!eventForm.startTime || !eventForm.endTime) {
      showError("Start time and end time are required");
      return;
    }
    if (!eventForm.date) {
      showError("Date is required");
      return;
    }
    if (!userId) {
      showError("You must be logged in to create events");
      return;
    }

    try {
      if (editingEvent) {
        await updateEvent({
          id: editingEvent._id,
          title: eventForm.title.trim(),
          description: eventForm.description.trim() || undefined,
          startTime: eventForm.startTime,
          endTime: eventForm.endTime,
          date: eventForm.date,
          userId: userId as Id<"users">,
        });
        success("Event updated successfully");
      } else {
        await createEvent({
          title: eventForm.title.trim(),
          description: eventForm.description.trim() || undefined,
          startTime: eventForm.startTime,
          endTime: eventForm.endTime,
          date: eventForm.date,
          createdBy: userId as Id<"users">,
        });
        success("Event created successfully");
      }
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        date: "",
      });
    } catch (err: any) {
      showError(err.message || "Failed to save event");
    }
  };

  // Format time for display (e.g., "10:00 AM - 11:00 AM")
  const formatEventTime = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  // Todo management handlers
  const handleAddTodo = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    setTodoForm({
      title: "",
      dueDate: tomorrow.toISOString().split("T")[0],
      priority: "medium",
    });
    setEditingTodo(null);
    setShowTodoForm(true);
  };

  const handleEditTodo = (todo: any) => {
    const dueDate = new Date(todo.dueDate);
    setTodoForm({
      title: todo.title,
      dueDate: dueDate.toISOString().split("T")[0],
      priority: todo.priority,
    });
    setEditingTodo(todo);
    setShowTodoForm(true);
  };

  const handleDeleteTodo = async (todoId: Id<"todos">) => {
    if (!confirm("Are you sure you want to delete this todo?")) {
      return;
    }

    if (!userId) {
      showError("You must be logged in to delete todos");
      return;
    }

    try {
      await deleteTodo({ id: todoId, userId: userId as Id<"users"> });
      success("Todo deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete todo");
    }
  };

  const handleToggleTodoComplete = async (todo: any) => {
    if (!userId) {
      showError("You must be logged in to update todos");
      return;
    }

    try {
      await toggleTodoComplete({
        id: todo._id,
        userId: userId as Id<"users">,
      });
    } catch (err: any) {
      showError(err.message || "Failed to update todo");
    }
  };

  const handleTodoSubmit = async () => {
    if (!todoForm.title.trim()) {
      showError("Todo title is required");
      return;
    }
    if (!todoForm.dueDate) {
      showError("Due date is required");
      return;
    }
    if (!userId) {
      showError("You must be logged in to create todos");
      return;
    }

    try {
      const dueDateTimestamp = new Date(todoForm.dueDate).getTime();

      if (editingTodo) {
        await updateTodo({
          id: editingTodo._id,
          title: todoForm.title.trim(),
          dueDate: dueDateTimestamp,
          priority: todoForm.priority,
          userId: userId as Id<"users">,
        });
        success("Todo updated successfully");
      } else {
        await createTodo({
          title: todoForm.title.trim(),
          dueDate: dueDateTimestamp,
          priority: todoForm.priority,
          createdBy: userId as Id<"users">,
        });
        success("Todo created successfully");
      }
      setShowTodoForm(false);
      setEditingTodo(null);
      setTodoForm({
        title: "",
        dueDate: "",
        priority: "medium",
      });
    } catch (err: any) {
      showError(err.message || "Failed to save todo");
    }
  };

  const getTodoStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "overdue":
        return "bg-red-500";
      case "in_progress":
        return "bg-orange-500";
      default:
        return "bg-slate-300";
    }
  };

  const formatDueDate = (dueDate: number) => {
    const now = Date.now();
    const diff = dueDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return `Overdue ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`;
    } else if (days === 0) {
      return "Due today";
    } else if (days === 1) {
      return "Due in 1 day";
    } else {
      return `Due in ${days} days`;
    }
  };

  const handleRequestSubmit = async () => {
    if (!selectedService || !userId) return;
    
    if (!requestForm.title.trim()) {
      showError("Title is required");
      return;
    }
    if (!requestForm.description.trim()) {
      showError("Description is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTicket({
        title: requestForm.title.trim(),
        description: requestForm.description.trim(),
        type: requestForm.type,
        priority: requestForm.priority,
        urgency: requestForm.urgency,
        category: selectedService.name,
        createdBy: userId as Id<"users">,
      });
      
      success(`Service request for "${selectedService.name}" created successfully!`);
      setShowRequestForm(false);
      setSelectedService(null);
      setRequestForm({
        title: "",
        description: "",
        type: "service_request",
        priority: "medium",
        urgency: "medium",
      });
    } catch (err: any) {
      showError(err.message || "Failed to create service request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get user name by ID
  const getUserName = (assignedToId: string | null) => {
    if (!assignedToId || !users) return "Unassigned";
    const user = users.find((u) => u._id === assignedToId);
    return user?.name || "Unknown";
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-600";
      case "in_progress": return "bg-amber-100 text-amber-600";
      case "on_hold": return "bg-slate-100 text-slate-600";
      case "resolved": return "bg-green-100 text-green-600";
      case "closed": return "bg-slate-100 text-slate-500";
      default: return "bg-slate-100 text-slate-600";
    }
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
    };
  };

  const recentUpdates = tickets
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)
    .map((t) => {
      const slaStatus = getSLAStatus(t);
      // Check if ticket has escalation actions
      const hasEscalation = escalatedTicketIds?.includes(t._id) || false;
      
      return {
        _id: t._id,
        title: t.title || "Untitled Ticket",
        ticketNumber: `#TK-${t._id.slice(-6).toUpperCase()}`,
        assignee: getUserName(t.assignedTo),
        status: t.status,
        updatedAt: t.updatedAt,
        slaDeadline: t.slaDeadline,
        slaStatus,
        hasEscalation,
        priority: t.priority,
      };
    });

  // Calendar days with full date info - show 10 days
  const today = new Date();
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const calendarDays = [];
  for (let i = -2; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    calendarDays.push({
      day: days[d.getDay()],
      date: d.getDate(),
      dateStr: dateStr,
      isToday: i === 0,
      fullDate: d,
    });
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Top Row - Services Grid & Announcement */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Most Services Request */}
        <div className="xl:col-span-2">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">Most Services Request</h2>
              <div className="flex items-center gap-3">
                {userRole === "admin" && (
                  <Link href="/service-catalog" className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Manage
                  </Link>
                )}
                {services && services.length > 8 && (
                  <button 
                    onClick={() => setShowAllServices(true)}
                    className="px-3 py-1.5 text-xs lg:text-sm text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Show More
                  </button>
                )}
              </div>
            </div>
            {services && services.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {services.slice(0, 8).map((service) => {
                  // Calculate duration (days since creation or use a default)
                  const daysSinceCreation = Math.floor((Date.now() - service.createdAt) / (1000 * 60 * 60 * 24));
                  const duration = daysSinceCreation > 0 ? `${daysSinceCreation} day${daysSinceCreation !== 1 ? 's' : ''}` : '1 day';
                  
                  return (
                    <div
                      key={service._id}
                      onClick={() => handleServiceClick(service)}
                      className="relative bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group"
                    >
                      {/* Heart/Favorite icon in top-right */}
                      <button
                        onClick={(e) => handleToggleFavorite(service._id, e)}
                        className={`absolute top-2 right-2 p-1 transition-colors z-10 ${
                          isServiceFavorite(service._id)
                            ? "text-blue-600 hover:text-blue-700"
                            : "text-slate-400 hover:text-blue-600"
                        }`}
                        title={isServiceFavorite(service._id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg className="w-4 h-4" fill={isServiceFavorite(service._id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Service Icon */}
                      <div className="mb-2">
                        <ServiceLogoDisplay service={service} size="small" />
                      </div>
                      
                      {/* Service Name */}
                      <p className="text-xs font-medium text-slate-700 text-center mb-3 line-clamp-1">{service.name}</p>
                      
                      {/* Bottom row: Duration and Rating */}
                      <div className="flex items-center justify-between text-xs">
                        {/* Duration in bottom-left */}
                        <div className="flex items-center gap-1 text-slate-500">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{duration}</span>
                        </div>
                        
                        {/* Rating in bottom-right */}
                        <div className="flex items-center gap-1 text-slate-500">
                          <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span>{service.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <span className="text-3xl mb-2 block">📋</span>
                <p className="text-xs lg:text-sm">No services available</p>
                {userRole === "admin" && (
                  <Link href="/service-catalog" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                    Create your first service
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* View All Services Modal */}
        {showAllServices && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAllServices(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">All Services</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {services?.length || 0} {services?.length === 1 ? 'service' : 'services'} available
                  </p>
                </div>
                <button
                  onClick={() => setShowAllServices(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {services && services.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {services.map((service) => (
                      <div
                        key={service._id}
                        onClick={() => {
                          handleServiceClick(service);
                          setShowAllServices(false);
                        }}
                        className="flex flex-col items-center p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group border border-slate-200"
                      >
                        <div className={`w-16 h-16 ${service.color} rounded-xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                          {service.icon}
                        </div>
                        <p className="text-sm font-medium text-slate-700 text-center mb-1">{service.name}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 text-xs">⭐</span>
                          <span className="text-xs text-slate-500">{service.rating}</span>
                        </div>
                        {service.description && (
                          <p className="text-xs text-slate-500 text-center mt-2 line-clamp-2">{service.description}</p>
                        )}
                        {service.requestCount > 0 && (
                          <p className="text-xs text-slate-400 mt-1">{service.requestCount} requests</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <span className="text-4xl mb-3 block">📋</span>
                    <p className="text-sm">No services available</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 flex justify-end">
                <Button variant="outline" onClick={() => setShowAllServices(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Service Request Form Modal */}
        {showRequestForm && selectedService && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRequestForm(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Request Service</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Request: <span className="font-medium">{selectedService.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className={`w-12 h-12 ${selectedService.color} rounded-xl flex items-center justify-center text-2xl overflow-hidden`}>
                      {selectedServiceLogoUrl ? (
                        <img 
                          src={selectedServiceLogoUrl} 
                          alt={selectedService.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{selectedService.icon}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedService.name}</p>
                      {selectedService.description && (
                        <p className="text-sm text-slate-600 mt-1">{selectedService.description}</p>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Title"
                    value={requestForm.title}
                    onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                    placeholder="Brief summary of your request"
                  />
                  
                  <Textarea
                    label="Description"
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    placeholder="Provide detailed information about your service request..."
                    rows={4}
                  />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Select
                      label="Type"
                      value={requestForm.type}
                      onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value as any })}
                      options={[
                        { value: "incident", label: "Incident" },
                        { value: "service_request", label: "Service Request" },
                        { value: "inquiry", label: "Inquiry" },
                      ]}
                    />
                    
                    <Select
                      label="Priority"
                      value={requestForm.priority}
                      onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value as any })}
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                        { value: "critical", label: "Critical" },
                      ]}
                    />
                    
                    <Select
                      label="Urgency"
                      value={requestForm.urgency}
                      onChange={(e) => setRequestForm({ ...requestForm, urgency: e.target.value as any })}
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRequestForm(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="gradient" 
                  onClick={handleRequestSubmit}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Event Form Modal */}
        {showEventForm && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowEventForm(false);
              setEditingEvent(null);
              setEventForm({
                title: "",
                description: "",
                startTime: "",
                endTime: "",
                date: "",
              });
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingEvent ? "Edit Event" : "Add Event"}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {eventForm.date && new Date(eventForm.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                    setEventForm({
                      title: "",
                      description: "",
                      startTime: "",
                      endTime: "",
                      date: "",
                    });
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <Input
                    label="Event Title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="Enter event title"
                    required
                  />
                  
                  <Textarea
                    label="Description (Optional)"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Add event description..."
                    rows={3}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={(() => {
                          // Convert 12h format back to 24h for time input
                          if (!eventForm.startTime) return '';
                          const match = eventForm.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                          if (!match) return eventForm.startTime;
                          let hours = parseInt(match[1]);
                          const minutes = match[2];
                          const ampm = match[3].toUpperCase();
                          if (ampm === 'PM' && hours !== 12) hours += 12;
                          if (ampm === 'AM' && hours === 12) hours = 0;
                          return `${String(hours).padStart(2, '0')}:${minutes}`;
                        })()}
                        onChange={(e) => {
                          const time = e.target.value;
                          if (!time) {
                            setEventForm({ ...eventForm, startTime: '' });
                            return;
                          }
                          // Convert 24h to 12h format for storage
                          const [hours, minutes] = time.split(':');
                          const hour24 = parseInt(hours);
                          const hour12 = hour24 === 0 ? 12 : hour24 === 12 ? 12 : hour24 % 12;
                          const ampm = hour24 >= 12 ? 'PM' : 'AM';
                          setEventForm({ ...eventForm, startTime: `${hour12}:${minutes} ${ampm}` });
                        }}
                        className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={(() => {
                          // Convert 12h format back to 24h for time input
                          if (!eventForm.endTime) return '';
                          const match = eventForm.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                          if (!match) return eventForm.endTime;
                          let hours = parseInt(match[1]);
                          const minutes = match[2];
                          const ampm = match[3].toUpperCase();
                          if (ampm === 'PM' && hours !== 12) hours += 12;
                          if (ampm === 'AM' && hours === 12) hours = 0;
                          return `${String(hours).padStart(2, '0')}:${minutes}`;
                        })()}
                        onChange={(e) => {
                          const time = e.target.value;
                          if (!time) {
                            setEventForm({ ...eventForm, endTime: '' });
                            return;
                          }
                          // Convert 24h to 12h format for storage
                          const [hours, minutes] = time.split(':');
                          const hour24 = parseInt(hours);
                          const hour12 = hour24 === 0 ? 12 : hour24 === 12 ? 12 : hour24 % 12;
                          const ampm = hour24 >= 12 ? 'PM' : 'AM';
                          setEventForm({ ...eventForm, endTime: `${hour12}:${minutes} ${ampm}` });
                        }}
                        className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                    setEventForm({
                      title: "",
                      description: "",
                      startTime: "",
                      endTime: "",
                      date: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleEventSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : editingEvent ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* View Event Modal */}
        {showViewModal && viewingEvent && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowViewModal(false);
              setViewingEvent(null);
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Event Details</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {viewingEvent.date && new Date(viewingEvent.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingEvent(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Event Title
                    </label>
                    <p className="text-base text-slate-900">{viewingEvent.title}</p>
                  </div>
                  
                  {viewingEvent.description && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Description
                      </label>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewingEvent.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Start Time
                      </label>
                      <p className="text-sm text-slate-900">{viewingEvent.startTime}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        End Time
                      </label>
                      <p className="text-sm text-slate-900">{viewingEvent.endTime}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Date
                    </label>
                    <p className="text-sm text-slate-900">
                      {viewingEvent.date && new Date(viewingEvent.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                {userRole === "admin" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowViewModal(false);
                        handleEditEvent(viewingEvent);
                        setViewingEvent(null);
                      }}
                    >
                      Edit Event
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this event?")) {
                          handleDeleteEvent(viewingEvent._id);
                          setShowViewModal(false);
                          setViewingEvent(null);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete Event
                    </Button>
                  </>
                )}
                <Button
                  variant="gradient"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingEvent(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Slider */}
        <div className="xl:col-span-1">
          <AnnouncementSlider announcements={announcements || []} />
        </div>
      </div>

      {/* Middle Row - Last Update, Calendar, My Favorite */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Last Update */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">Last update</h2>
              <p className="text-xs text-slate-500">
                {userRole === "admin" ? "All tickets" : userRole === "agent" ? "Your tickets & assignments" : "Your tickets"} · Top 5
              </p>
            </div>
            <Link href="/tickets" className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </Link>
          </div>
          <div className="space-y-2 lg:space-y-3">
            {recentUpdates.length > 0 ? (
              recentUpdates.map((update) => (
                <Link
                  key={update._id}
                  href={`/tickets/${update._id}`}
                  className="flex items-center justify-between p-2.5 lg:p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                    <div className={`w-7 h-7 lg:w-8 lg:h-8 ${getStatusColor(update.status)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xs lg:text-sm">🎫</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {update.title}
                      </p>
                      <p className="text-xs text-slate-500">{update.ticketNumber}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {formatTimeAgo(update.updatedAt)} · <span className="text-blue-600">{update.assignee}</span>
                      </p>
                      {/* SLA Status */}
                      {update.slaStatus && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border ${update.slaStatus.color}`}>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {update.slaStatus.text}
                          </span>
                          {update.hasEscalation && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border text-orange-600 bg-orange-50 border-orange-200">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Escalated
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))
            ) : (
              <div className="text-center py-6 lg:py-8 text-slate-500">
                <span className="text-3xl mb-2 block">🎫</span>
                <p className="text-xs lg:text-sm">No tickets yet</p>
                <Link href="/tickets/new" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                  Create your first ticket
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Calendar Events */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-base lg:text-lg font-semibold text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
                  Calendar
                </span>
                <span className="text-base lg:text-lg font-semibold text-slate-900">
                  Events
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Top 8 records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Show More
              </button>
              <button className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Calendar Week */}
          <div className="flex justify-between mb-4 gap-1">
            {calendarDays.map((day, index) => {
              const isSelected = selectedDate === day.dateStr;
              return (
                <div
                  key={index}
                  onClick={() => handleDateSelect(day.dateStr)}
                  className={`flex flex-col items-center p-1.5 lg:p-2 rounded-lg lg:rounded-xl flex-1 ${
                    isSelected
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "text-slate-600 hover:bg-slate-50"
                  } transition-colors cursor-pointer`}
                >
                  <span className="text-[10px] lg:text-xs font-medium">{day.day}</span>
                  <span className={`text-sm lg:text-lg font-semibold ${isSelected ? "text-blue-600" : "text-slate-900"}`}>
                    {day.date}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Events List */}
          <div className="space-y-0 max-h-64 lg:max-h-80 overflow-y-auto">
            {events && events.length > 0 ? (
              events.slice(0, 8).map((event) => (
                <div key={event._id} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm text-slate-600 mb-1">
                      {formatEventTime(event.startTime, event.endTime)}
                    </p>
                    <p className="text-sm lg:text-base text-slate-900">{event.title}</p>
                  </div>
                  <button
                    onClick={() => handleViewEvent(event)}
                    className="ml-4 px-3 py-1.5 text-xs lg:text-sm font-medium text-white bg-slate-400 hover:bg-slate-500 rounded-lg transition-colors flex-shrink-0"
                    title="View event"
                  >
                    View
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500">
                <p className="text-xs lg:text-sm">No events for this date</p>
                {userRole === "admin" && (
                  <button
                    onClick={() => handleAddEvent(selectedDate)}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                  >
                    Add your first event
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* My Favorite */}
        <Card padding="md" className="md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">My Favorites</h2>
              <p className="text-xs text-slate-500">
                {favoriteServices && favoriteServices.length > 0 
                  ? `${favoriteServices.length} ${favoriteServices.length === 1 ? 'service' : 'services'}`
                  : "No favorites yet"}
              </p>
            </div>
            {favoriteServices && favoriteServices.length > 5 && (
              <button className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
                Show More
              </button>
            )}
          </div>
          <div className="space-y-2 lg:space-y-3">
            {favoriteServices && favoriteServices.length > 0 ? (
              favoriteServices.slice(0, 5).map((service: any) => {
                const daysSinceCreation = Math.floor((Date.now() - service.createdAt) / (1000 * 60 * 60 * 24));
                const duration = daysSinceCreation > 0 ? `${daysSinceCreation} day${daysSinceCreation !== 1 ? 's' : ''}` : '1 day';
                
                return (
                  <div
                    key={service._id}
                    onClick={() => handleServiceClick(service)}
                    className="flex items-center justify-between p-2.5 lg:p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                      <ServiceLogoDisplay service={service} size="small" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs lg:text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {service.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-slate-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[10px] lg:text-xs">{duration}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500">
                            <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-[10px] lg:text-xs">{service.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 lg:py-8 text-slate-500">
                <span className="text-3xl mb-2 block">❤️</span>
                <p className="text-xs lg:text-sm">No favorite services yet</p>
                <p className="text-[10px] lg:text-xs text-slate-400 mt-1">Click the heart icon on services to add them here</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Row - Voting, Suggesting, Todo */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Voting */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold text-slate-900">Voting</h2>
            <Link href="/voting" className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show History
            </Link>
          </div>
          {activeVote ? (
            <>
              <p className="text-xs lg:text-sm text-slate-600 mb-4">{activeVote.question}</p>
              <div className="space-y-2">
                {activeVote.options.map((option: string) => (
                  <button
                    key={option}
                    onClick={async () => {
                      if (!userId) {
                        showError("You must be logged in to vote");
                        return;
                      }
                      try {
                        await submitVote({
                          userId: userId as Id<"users">,
                          option: option,
                        });
                        success("Vote submitted successfully");
                      } catch (err: any) {
                        showError(err.message || "Failed to submit vote");
                      }
                    }}
                    className={`w-full py-2.5 lg:py-3 px-4 rounded-xl border-2 text-xs lg:text-sm font-medium transition-all ${
                      userVote === option
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-slate-500">
              <p className="text-xs lg:text-sm">No active vote</p>
              {userRole === "admin" && (
                <Link href="/voting" className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block">
                  Create a vote
                </Link>
              )}
            </div>
          )}
        </Card>

        {/* Suggesting */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold text-slate-900">Suggesting</h2>
            <Link href="/suggestions" className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show History
            </Link>
          </div>
          <p className="text-xs lg:text-sm text-slate-600 mb-4">How we can improve your experience</p>
          <div className="space-y-3">
            <select
              value={suggestionCategory}
              onChange={(e) => setSuggestionCategory(e.target.value)}
              className="w-full py-2 lg:py-2.5 px-3 lg:px-4 rounded-xl border border-slate-200 text-xs lg:text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Select category</option>
              <option value="ui">UI/UX</option>
              <option value="features">Features</option>
              <option value="performance">Performance</option>
              <option value="other">Other</option>
            </select>
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="Type your suggestion here..."
              rows={3}
              className="w-full py-2 lg:py-2.5 px-3 lg:px-4 rounded-xl border border-slate-200 text-xs lg:text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
            <Button
              variant="gradient"
              className="w-full text-sm"
              onClick={async () => {
                if (!suggestionCategory) {
                  showError("Please select a category");
                  return;
                }
                if (!suggestionText.trim()) {
                  showError("Please enter your suggestion");
                  return;
                }
                if (!userId) {
                  showError("You must be logged in to submit suggestions");
                  return;
                }

                // Check if function is available
                if (!submitSuggestion) {
                  showError("Suggestion feature is not available yet. Please wait for Convex to sync.");
                  return;
                }

                try {
                  await submitSuggestion({
                    category: suggestionCategory,
                    content: suggestionText.trim(),
                    userId: userId as Id<"users">,
                  });
                  success("Suggestion submitted successfully!");
                  setSuggestionCategory("");
                  setSuggestionText("");
                } catch (err: any) {
                  const errorMessage = err.message || "Failed to submit suggestion";
                  if (errorMessage.includes("Could not find public function")) {
                    showError("Suggestion feature is syncing. Please wait a moment and try again.");
                  } else {
                    showError(errorMessage);
                  }
                }
              }}
            >
              Submit
            </Button>
          </div>
        </Card>

        {/* Todo */}
        <Card padding="md" className="md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">Todo</h2>
              <p className="text-xs text-slate-500">Top 5 records</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
                Show More
              </button>
              <button
                onClick={handleAddTodo}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-700 transition-colors"
                title="Add Todo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {todos && todos.length > 0 ? (
              todos.map((todo) => (
                <div
                  key={todo._id}
                  className="flex items-center gap-2 lg:gap-3 p-2.5 lg:p-3 hover:bg-slate-50 rounded-xl transition-colors group relative"
                >
                  {/* Status indicator bar */}
                  <div className={`w-1 h-full ${getTodoStatusColor(todo.status)} rounded-full flex-shrink-0`}></div>
                  
                  <input
                    type="checkbox"
                    checked={todo.status === "completed"}
                    onChange={() => handleToggleTodoComplete(todo)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs lg:text-sm font-medium truncate ${
                      todo.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"
                    }`}>
                      {todo.title}
                    </p>
                    <p className="text-[10px] lg:text-xs text-slate-500">{formatDueDate(todo.dueDate)}</p>
                  </div>
                  <button
                    onClick={() => setShowTodoOptions(showTodoOptions === todo._id ? null : todo._id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  
                  {/* Options menu */}
                  {showTodoOptions === todo._id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                      <button
                        onClick={() => {
                          handleEditTodo(todo);
                          setShowTodoOptions(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-t-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteTodo(todo._id);
                          setShowTodoOptions(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-b-lg"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500">
                <p className="text-xs lg:text-sm">No todos yet</p>
                <button
                  onClick={handleAddTodo}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                >
                  Add your first todo
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Todo Form Modal */}
        {showTodoForm && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowTodoForm(false);
              setEditingTodo(null);
              setTodoForm({
                title: "",
                dueDate: "",
                priority: "medium",
              });
            }}
          >
            <div
              className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingTodo ? "Edit Todo" : "Add Todo"}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowTodoForm(false);
                    setEditingTodo(null);
                    setTodoForm({
                      title: "",
                      dueDate: "",
                      priority: "medium",
                    });
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <Input
                    label="Todo Title"
                    value={todoForm.title}
                    onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                    placeholder="Enter todo title"
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={todoForm.dueDate}
                      onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Priority
                    </label>
                    <Select
                      value={todoForm.priority}
                      onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value as any })}
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTodoForm(false);
                    setEditingTodo(null);
                    setTodoForm({
                      title: "",
                      dueDate: "",
                      priority: "medium",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleTodoSubmit}>
                  {editingTodo ? "Update Todo" : "Create Todo"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
