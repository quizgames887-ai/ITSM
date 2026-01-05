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
import { DynamicForm } from "@/components/forms/DynamicForm";

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
    small: "w-14 h-14 text-xl",
    medium: "w-16 h-16 text-2xl",
    large: "w-20 h-20 text-3xl",
  };

  return (
    <div className={`${sizeClasses[size]} ${service.color} rounded-full flex items-center justify-center overflow-hidden shadow-sm ${size === "small" ? "group-hover:scale-110 transition-transform duration-200" : size === "large" ? "group-hover:scale-110 transition-transform duration-200" : ""}`}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={service.name}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="text-2xl">{service.icon}</span>
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
    description: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const [showTodoOptions, setShowTodoOptions] = useState<string | null>(null);
  const [showAllTodosModal, setShowAllTodosModal] = useState(false);
  const [todoFilter, setTodoFilter] = useState<"all" | "completed" | "pending">("all");
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllFavoritesModal, setShowAllFavoritesModal] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showSuggestionSuccessModal, setShowSuggestionSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestFormData, setRequestFormData] = useState<Record<string, any>>({});
  const [formRefreshKey, setFormRefreshKey] = useState(0);
  
  // Event management state
  // Initialize selectedDate to today's date
  const getTodayDateStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
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
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the options menu or the button that opens it
      if (showTodoOptions && !target.closest('.todo-options-menu') && !target.closest('.todo-options-button')) {
        setShowTodoOptions(null);
      }
      // Close calendar dropdown when clicking outside
      if (showCalendarDropdown && !target.closest('.calendar-dropdown')) {
        setShowCalendarDropdown(false);
      }
    };

    if (showTodoOptions || showCalendarDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTodoOptions, showCalendarDropdown]);

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
  
  // Fetch current user to check onboarding status
  const currentUser = useQuery(
    api.users.get,
    userId ? { id: userId as Id<"users"> } : "skip"
  );
  
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

  // Fetch all active votes
  const activeVotes = useQuery((api as any).votes?.getAllActive, {}) as any[] | undefined;
  
  // State for selected active vote
  const [selectedVoteId, setSelectedVoteId] = useState<Id<"votes"> | null>(null);
  
  // Set default selected vote (first active vote)
  useEffect(() => {
    if (activeVotes && activeVotes.length > 0) {
      // If no vote is selected, or selected vote is no longer active, select the first one
      if (!selectedVoteId || !activeVotes.find(v => v._id === selectedVoteId)) {
        setSelectedVoteId(activeVotes[0]._id);
      }
    } else {
      setSelectedVoteId(null);
    }
  }, [activeVotes, selectedVoteId]);
  
  // Get currently selected vote
  const activeVote = activeVotes?.find(v => v._id === selectedVoteId) || activeVotes?.[0] || null;
  
  // Fetch user's vote for selected poll
  const userVote = useQuery(
    (api as any).votes?.getUserVoteForVote,
    userId && selectedVoteId ? { userId: userId as Id<"users">, voteId: selectedVoteId } : "skip"
  ) as string | null | undefined;

  // Fetch todos for current user (limited to 5 for dashboard)
  const todos = useQuery(
    (api as any).todos?.list,
    userId ? { 
      userId: userId as Id<"users">,
      limit: 5
    } : "skip"
  ) as any[] | undefined;
  
  // Fetch all todos for the modal
  const allTodosForModal = useQuery(
    (api as any).todos?.list,
    userId && showAllTodosModal ? { 
      userId: userId as Id<"users">,
      limit: undefined
    } : "skip"
  ) as any[] | undefined;
  
  // Fetch storage URL for selected service logo
  const normalizedSelectedLogoId = selectedService?.logoId 
    ? normalizeLogoId(selectedService.logoId) 
    : null;
  const selectedServiceLogoUrl = useQuery(
    api.serviceCatalog.getStorageUrl,
    normalizedSelectedLogoId ? { storageId: normalizedSelectedLogoId } : "skip"
  );
  
  // Fetch the form for the selected service
  // Always fetch when service is selected (not just when modal is open) to ensure fresh data
  const serviceForm = useQuery(
    api.forms.get,
    selectedService?.formId ? { id: selectedService.formId } : "skip"
  );
  
  // Force refresh when modal opens, service changes, or form is updated
  useEffect(() => {
    if (showRequestForm && selectedService?.formId && serviceForm) {
      // Increment refresh key to force DynamicForm to re-render with latest data
      // This ensures the form always shows the latest changes
      setFormRefreshKey(prev => prev + 1);
    }
  }, [showRequestForm, selectedService?.formId, serviceForm?.updatedAt, serviceForm?.fields?.length]);
  
  // Debug: Log form changes and service info
  useEffect(() => {
    if (selectedService) {
      console.log('Service selected:', {
        serviceId: selectedService._id,
        serviceName: selectedService.name,
        hasFormId: !!selectedService.formId,
        formId: selectedService.formId,
        serviceForm: serviceForm ? {
          formId: serviceForm._id,
          updatedAt: serviceForm.updatedAt,
          fieldsCount: serviceForm.fields?.length,
          fields: serviceForm.fields?.map(f => ({ name: f.name, label: f.label }))
        } : 'null/undefined'
      });
    }
  }, [serviceForm, selectedService]);
  
  const router = useRouter();
  const createTicket = useMutation(api.tickets.create);
  const toggleFavorite = useMutation((api.serviceCatalog as any).toggleFavorite);
  const createFormForService = useMutation(api.serviceCatalog.createFormForService);
  const submitVote = useMutation((api as any).votes?.submitVote);
  const undoVote = useMutation((api as any).votes?.undoVote);
  const submitSuggestion = useMutation((api as any).suggestions?.submit);
  const { success, error: showError } = useToastContext();
  
  // Event management mutations
  // Using bracket notation to avoid TypeScript errors until Convex syncs
  const createEvent = useMutation((api as any).events?.create);
  const updateEvent = useMutation((api as any).events?.update);
  const deleteEvent = useMutation((api as any).events?.remove);
  
  // Todo management mutations
  // Using bracket notation to avoid TypeScript errors until Convex syncs
  const createTodo = useMutation((api as any).todos?.create);
  const updateTodo = useMutation((api as any).todos?.update);
  const deleteTodoMutation = useMutation((api as any).todos?.remove);
  const toggleTodoComplete = useMutation((api as any).todos?.toggleComplete);
  
  // Get ticket IDs for escalation check (compute after all hooks)
  const ticketIds = tickets ? tickets.map(t => t._id) : [];
  const escalatedTicketIds = useQuery(
    api.audit.getTicketsWithEscalations,
    ticketIds.length > 0 ? { ticketIds } : "skip"
  );

  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (currentUser && !currentUser.onboardingCompleted && userId) {
      router.push("/onboarding");
    }
  }, [currentUser, userId, router]);
  
  // Early return check - must be after ALL hooks
  // Show loading if essential data is still loading
  if (!userId || !userRole) {
    return <LoadingSkeleton />;
  }
  
  // If user hasn't completed onboarding, show loading while redirect happens
  if (currentUser === undefined) {
    return <LoadingSkeleton />;
  }
  
  if (currentUser && !currentUser.onboardingCompleted) {
    return <LoadingSkeleton />;
  }
  
  // Check if essential data is still loading
  // Note: escalatedTicketIds can be undefined when there are no tickets (query is skipped), which is fine
  if (tickets === undefined || services === undefined) {
    return <LoadingSkeleton />;
  }
  
  // escalatedTicketIds is undefined when there are no tickets (query skipped), which is expected
  // Only show loading if we have tickets but escalatedTicketIds is still loading
  if (ticketIds.length > 0 && escalatedTicketIds === undefined) {
    return <LoadingSkeleton />;
  }
  
  // favoriteServiceIds and favoriteServices may be undefined if Convex hasn't synced yet
  // This is okay - the UI will handle undefined gracefully

  const handleServiceClick = (service: any) => {
    // Reset form data first
    setRequestFormData({});
    // Set selected service
    setSelectedService(service);
    // Force form refresh by incrementing key
    setFormRefreshKey(prev => prev + 1);
    // Show the modal - this will trigger the query
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
    // Update calendar view date to the selected date
    const selectedDateObj = new Date(dateStr);
    setCalendarViewDate(selectedDateObj);
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
      description: "",
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
      description: todo.description || "",
      dueDate: dueDate.toISOString().split("T")[0],
      priority: todo.priority,
    });
    setEditingTodo(todo);
    setShowTodoForm(true);
    // Close the all todos modal if it's open
    setShowAllTodosModal(false);
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
      await deleteTodoMutation({ id: todoId, userId: userId as Id<"users"> });
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
      // Close options menu after toggle
      setShowTodoOptions(null);
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
        description: "",
        dueDate: "",
        priority: "medium",
      });
    } catch (err: any) {
      showError(err.message || "Failed to save todo");
    }
  };

  const getTodoPriorityColor = (priority: string, status: string) => {
    // If completed, show green
    if (status === "completed") {
      return "bg-green-500";
    }
    // If overdue, show red regardless of priority
    if (status === "overdue") {
      return "bg-red-500";
    }
    // Otherwise, use priority-based colors
    switch (priority) {
      case "low":
        return "bg-green-500";
      case "medium":
        return "bg-amber-500";
      case "high":
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

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: "bg-green-100 text-green-700 border-green-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      high: "bg-orange-100 text-orange-700 border-orange-200",
    };
    const labels = {
      low: "Low",
      medium: "Medium",
      high: "High",
    };
    return {
      className: styles[priority as keyof typeof styles] || styles.medium,
      label: labels[priority as keyof typeof labels] || priority,
    };
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-slate-100 text-slate-700 border-slate-200",
      in_progress: "bg-blue-100 text-blue-700 border-blue-200",
      completed: "bg-green-100 text-green-700 border-green-200",
      overdue: "bg-red-100 text-red-700 border-red-200",
    };
    const labels = {
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      overdue: "Overdue",
    };
    return {
      className: styles[status as keyof typeof styles] || styles.pending,
      label: labels[status as keyof typeof labels] || status,
    };
  };

  const handleRequestSubmit = async (formData: Record<string, any>) => {
    if (!selectedService || !userId) return;
    
    // Extract standard fields from form data
    const title = formData.title || "";
    const description = formData.description || "";
    
    if (!title.trim()) {
      showError("Title is required");
      return;
    }
    if (!description.trim()) {
      showError("Description is required");
      return;
    }

    // Map form data to ticket format
    // Handle priority mapping (form might have "Low", "Medium", etc. but ticket needs "low", "medium", etc.)
    const priorityMap: Record<string, string> = {
      "Low": "low",
      "Medium": "medium",
      "High": "high",
      "Critical": "critical",
    };
    const priority = priorityMap[formData.priority] || formData.priority || "medium";
    
    // Handle urgency mapping
    const urgencyMap: Record<string, string> = {
      "Low": "low",
      "Medium": "medium",
      "High": "high",
    };
    const urgency = urgencyMap[formData.urgency] || formData.urgency || "medium";

    setIsSubmitting(true);
    try {
      await createTicket({
        title: title.trim(),
        description: description.trim(),
        type: "service_request",
        priority: priority as "low" | "medium" | "high" | "critical",
        urgency: urgency as "low" | "medium" | "high",
        category: selectedService.name,
        createdBy: userId as Id<"users">,
        formData: formData, // Include all form field values
      });
      
      success(`Service request for "${selectedService.name}" created successfully!`);
      setShowRequestForm(false);
      setSelectedService(null);
      setRequestFormData({});
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

  // Calendar navigation handlers
  const handlePreviousPeriod = () => {
    const newDate = new Date(calendarViewDate);
    if (calendarView === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCalendarViewDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(calendarViewDate);
    if (calendarView === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarViewDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCalendarViewDate(today);
    setSelectedDate(getTodayDateStr());
  };

  // Calendar days generation based on view
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const calendarDays = [];
  
  if (calendarView === "week") {
    // Week view: show 7 days starting from the first day of the week
    const startDate = new Date(calendarViewDate);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      
      calendarDays.push({
        day: days[d.getDay()],
        date: d.getDate(),
        dateStr: dateStr,
        isToday: isToday,
        fullDate: d,
      });
    }
  } else {
    // Month view: show all days in the month
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    // Add days from previous month to fill the first week
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      calendarDays.push({
        day: days[d.getDay()],
        date: d.getDate(),
        dateStr: dateStr,
        isToday: false,
        fullDate: d,
        isOtherMonth: true,
      });
    }
    
    // Add days of current month
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = d.toDateString() === today.toDateString();
      
      calendarDays.push({
        day: days[d.getDay()],
        date: d.getDate(),
        dateStr: dateStr,
        isToday: isToday,
        fullDate: d,
        isOtherMonth: false,
      });
    }
    
    // Add days from next month to fill the last week (up to 35 or 42 days total)
    const totalDays = calendarDays.length;
    const remainingDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      calendarDays.push({
        day: days[d.getDay()],
        date: d.getDate(),
        dateStr: dateStr,
        isToday: false,
        fullDate: d,
        isOtherMonth: true,
      });
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Top Row - Services Grid & Announcement */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Most Services Request */}
        <div className="xl:col-span-2">
          <Card padding="md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg lg:text-xl font-bold text-slate-900">Most Services Request</h2>
              <div className="flex items-center gap-4">
                {userRole === "admin" && (
                  <Link href="/service-catalog" className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                    Manage
                  </Link>
                )}
                {services && services.length > 8 && (
                  <button 
                    onClick={() => setShowAllServices(true)}
                    className="px-4 py-2 text-sm text-white bg-slate-600 hover:bg-slate-700 rounded-lg font-semibold transition-all duration-200 hover:shadow-md"
                  >
                    Show More
                  </button>
                )}
              </div>
            </div>
            {services && services.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {services.slice(0, 8).map((service) => {
                  // Calculate duration (days since creation or use a default)
                  const daysSinceCreation = Math.floor((Date.now() - service.createdAt) / (1000 * 60 * 60 * 24));
                  const duration = daysSinceCreation > 0 ? `${daysSinceCreation} day${daysSinceCreation !== 1 ? 's' : ''}` : '1 day';
                  
                  return (
                    <div
                      key={service._id}
                      onClick={() => handleServiceClick(service)}
                      className="relative bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                    >
                      {/* Heart/Favorite icon in top-right */}
                      <button
                        onClick={(e) => handleToggleFavorite(service._id, e)}
                        className={`absolute top-3 right-3 p-1.5 rounded-full transition-all z-10 ${
                          isServiceFavorite(service._id)
                            ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                            : "text-slate-400 hover:text-blue-600 hover:bg-slate-50"
                        }`}
                        title={isServiceFavorite(service._id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg className="w-4 h-4" fill={isServiceFavorite(service._id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      
                      {/* Service Icon - Centered */}
                      <div className="flex justify-center mb-3">
                        <ServiceLogoDisplay service={service} size="small" />
                      </div>
                      
                      {/* Service Name - Centered */}
                      <p className="text-sm font-semibold text-slate-900 text-center mb-4 line-clamp-1 group-hover:text-blue-600 transition-colors">{service.name}</p>
                      
                      {/* Bottom row: Duration and Rating */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        {/* Duration in bottom-left */}
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">{duration}</span>
                        </div>
                        
                        {/* Rating in bottom-right */}
                        <div className="flex items-center gap-1 text-slate-600">
                          <svg className="w-3.5 h-3.5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-semibold">{service.rating.toFixed(1)}</span>
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
                    {services.map((service) => {
                      // Calculate duration (days since creation or use a default)
                      const daysSinceCreation = Math.floor((Date.now() - service.createdAt) / (1000 * 60 * 60 * 24));
                      const duration = daysSinceCreation > 0 ? `${daysSinceCreation} day${daysSinceCreation !== 1 ? 's' : ''}` : '1 day';
                      
                      return (
                        <div
                          key={service._id}
                          onClick={() => {
                            handleServiceClick(service);
                            setShowAllServices(false);
                          }}
                          className="relative bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                        >
                          {/* Heart/Favorite icon in top-right */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(service._id, e);
                            }}
                            className={`absolute top-3 right-3 p-1.5 rounded-full transition-all z-10 ${
                              isServiceFavorite(service._id)
                                ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                                : "text-slate-400 hover:text-blue-600 hover:bg-slate-50"
                            }`}
                            title={isServiceFavorite(service._id) ? "Remove from favorites" : "Add to favorites"}
                          >
                            <svg className="w-4 h-4" fill={isServiceFavorite(service._id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                          
                          {/* Service Icon - Centered */}
                          <div className="flex justify-center mb-3">
                            <ServiceLogoDisplay service={service} size="small" />
                          </div>
                          
                          {/* Service Name - Centered */}
                          <p className="text-sm font-semibold text-slate-900 text-center mb-4 line-clamp-1 group-hover:text-blue-600 transition-colors">{service.name}</p>
                          
                          {/* Bottom row: Duration and Rating */}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                            {/* Duration in bottom-left */}
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">{duration}</span>
                            </div>
                            
                            {/* Rating in bottom-right */}
                            <div className="flex items-center gap-1 text-slate-600">
                              <svg className="w-3.5 h-3.5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="font-semibold">{service.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          
                          {/* Request Count (if available) */}
                          {service.requestCount > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <p className="text-xs text-slate-500 text-center">{service.requestCount} {service.requestCount === 1 ? 'request' : 'requests'}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
            onClick={() => {
              setShowRequestForm(false);
              setSelectedService(null);
              setRequestFormData({});
            }}
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
                  onClick={() => {
                    setShowRequestForm(false);
                    setSelectedService(null);
                    setRequestFormData({});
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

                  {/* Debug info - remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-slate-500 mb-2 p-2 bg-slate-50 rounded border border-slate-200">
                      <strong>Debug Info:</strong><br/>
                      Service ID: {selectedService?._id}<br/>
                      Service has formId: {selectedService?.formId ? `Yes (${selectedService.formId})` : 'No'}<br/>
                      Form query result: {serviceForm === undefined ? 'Loading...' : serviceForm === null ? 'Null (form not found)' : 'Loaded'}<br/>
                      Fields count: {serviceForm?.fields?.length || 0}<br/>
                      {serviceForm?.fields && serviceForm.fields.length > 0 && (
                        <>Field names: {serviceForm.fields.map(f => f.name).join(', ')}</>
                      )}
                    </div>
                  )}

                  {/* Loading state while form is being fetched */}
                  {selectedService?.formId && serviceForm === undefined ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600">Loading form...</p>
                    </div>
                  ) : !selectedService?.formId ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600 mb-2">This service doesn't have a form configured yet.</p>
                      <p className="text-xs text-slate-500 mb-4">Would you like to create a default form for this service?</p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="gradient" 
                          size="sm"
                          onClick={async () => {
                            if (!userId || !selectedService) return;
                            try {
                              const formId = await createFormForService({
                                serviceId: selectedService._id as Id<"serviceCatalog">,
                                createdBy: userId as Id<"users">,
                              });
                              success("Form created successfully! The form will load in a moment.");
                              // Force refresh by updating the service
                              setSelectedService({ ...selectedService, formId });
                            } catch (err: any) {
                              showError(err.message || "Failed to create form");
                            }
                          }}
                        >
                          Create Default Form
                        </Button>
                        <Link href="/forms">
                          <Button variant="outline" size="sm">
                            Go to Forms Page
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : serviceForm === null ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600 mb-2">Form not found.</p>
                      <p className="text-xs text-slate-500">The form associated with this service may have been deleted.</p>
                    </div>
                  ) : serviceForm && serviceForm.fields && serviceForm.fields.length > 0 ? (
                    <div key={`form-wrapper-${selectedService.formId}-${serviceForm.updatedAt || 0}`}>
                      <DynamicForm
                        key={`service-form-${selectedService._id}-${selectedService.formId}-${serviceForm.updatedAt || 0}-${formRefreshKey}`}
                        fields={serviceForm.fields}
                        onSubmit={handleRequestSubmit}
                        submitLabel={isSubmitting ? "Submitting..." : "Submit Request"}
                        loading={isSubmitting}
                        showSubmitButton={false}
                        formId={`service-form-${selectedService._id}`}
                      />
                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-6">
                        <Button type="button" variant="outline" onClick={() => {
                          setShowRequestForm(false);
                          setSelectedService(null);
                          setRequestFormData({});
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          variant="gradient" 
                          disabled={isSubmitting}
                          loading={isSubmitting}
                          form={`service-form-${selectedService._id}`}
                        >
                          {isSubmitting ? "Submitting..." : "Submit Request"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Fallback form if service doesn't have a form yet */}
                      <Input
                        label="Title"
                        value={requestFormData.title || ""}
                        onChange={(e) => setRequestFormData({ ...requestFormData, title: e.target.value })}
                        placeholder="Brief summary of your request"
                      />
                      
                      <Textarea
                        label="Description"
                        value={requestFormData.description || ""}
                        onChange={(e) => setRequestFormData({ ...requestFormData, description: e.target.value })}
                        placeholder="Provide detailed information about your service request..."
                        rows={4}
                      />
                      
                      <div className="grid grid-cols-3 gap-4">
                        <Select
                          label="Priority"
                          value={requestFormData.priority || "Medium"}
                          onChange={(e) => setRequestFormData({ ...requestFormData, priority: e.target.value })}
                          options={[
                            { value: "Low", label: "Low" },
                            { value: "Medium", label: "Medium" },
                            { value: "High", label: "High" },
                            { value: "Critical", label: "Critical" },
                          ]}
                        />
                        
                        <Select
                          label="Urgency"
                          value={requestFormData.urgency || "Medium"}
                          onChange={(e) => setRequestFormData({ ...requestFormData, urgency: e.target.value })}
                          options={[
                            { value: "Low", label: "Low" },
                            { value: "Medium", label: "Medium" },
                            { value: "High", label: "High" },
                          ]}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <Button variant="outline" onClick={() => setShowRequestForm(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="gradient" 
                          onClick={() => handleRequestSubmit(requestFormData)}
                          disabled={isSubmitting}
                          loading={isSubmitting}
                        >
                          {isSubmitting ? "Submitting..." : "Submit Request"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
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
            <div className="flex items-center gap-2 relative calendar-dropdown">
              <button 
                onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
                className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Show More
                <svg className={`w-4 h-4 transition-transform ${showCalendarDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {showCalendarDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[140px] calendar-dropdown">
                  <button
                    onClick={() => {
                      setCalendarView("week");
                      setShowCalendarDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-t-lg ${
                      calendarView === "week" ? "bg-blue-50 text-blue-700 font-semibold" : ""
                    }`}
                  >
                    Week View
                  </button>
                  <button
                    onClick={() => {
                      setCalendarView("month");
                      setShowCalendarDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-b-lg ${
                      calendarView === "month" ? "bg-blue-50 text-blue-700 font-semibold" : ""
                    }`}
                  >
                    Month View
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPeriod}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title={`Previous ${calendarView === "week" ? "Week" : "Month"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextPeriod}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title={`Next ${calendarView === "week" ? "Week" : "Month"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {calendarView === "week" 
                ? (() => {
                    const start = calendarDays[0]?.fullDate;
                    const end = calendarDays[6]?.fullDate;
                    if (start && end) {
                      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined })}`;
                    }
                    return "";
                  })()
                : calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              }
            </div>
          </div>
          
          {/* Calendar Days */}
          <div className={`grid mb-4 gap-1 ${
            calendarView === "week" 
              ? "grid-cols-7" 
              : "grid-cols-7"
          }`}>
            {calendarView === "week" && (
              <>
                {calendarDays.map((day, index) => {
                  const isSelected = selectedDate === day.dateStr;
                  return (
                    <div
                      key={index}
                      onClick={() => handleDateSelect(day.dateStr)}
                      className={`flex flex-col items-center p-1.5 lg:p-2 rounded-lg lg:rounded-xl ${
                        isSelected
                          ? "bg-blue-50 border-2 border-blue-500"
                          : "text-slate-600 hover:bg-slate-50 border border-transparent"
                      } transition-colors cursor-pointer`}
                    >
                      <span className="text-[10px] lg:text-xs font-medium">{day.day}</span>
                      <span className={`text-sm lg:text-lg font-semibold ${isSelected ? "text-blue-600" : "text-slate-900"}`}>
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
            
            {calendarView === "month" && (
              <>
                {/* Day headers */}
                {days.map((dayName) => (
                  <div key={dayName} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {dayName}
                  </div>
                ))}
                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  const isSelected = selectedDate === day.dateStr;
                  const isOtherMonth = (day as any).isOtherMonth;
                  return (
                    <div
                      key={index}
                      onClick={() => !isOtherMonth && handleDateSelect(day.dateStr)}
                      className={`flex flex-col items-center justify-center p-1.5 lg:p-2 rounded-lg lg:rounded-xl min-h-[40px] lg:min-h-[48px] ${
                        isSelected
                          ? "bg-blue-50 border-2 border-blue-500"
                          : isOtherMonth
                          ? "text-slate-300 hover:bg-slate-50/50 border border-transparent cursor-default"
                          : "text-slate-600 hover:bg-slate-50 border border-transparent cursor-pointer"
                      } transition-colors ${day.isToday && !isSelected ? "bg-blue-50/50 border border-blue-200" : ""}`}
                    >
                      <span className={`text-xs lg:text-sm font-semibold ${
                        isSelected ? "text-blue-600" : isOtherMonth ? "text-slate-300" : day.isToday ? "text-blue-600" : "text-slate-900"
                      }`}>
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
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
              <button 
                onClick={() => setShowAllFavoritesModal(true)}
                className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
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
            <div className="flex items-center gap-3">
              {userVote && (
                <button
                  onClick={async () => {
                    if (!userId) {
                      showError("You must be logged in");
                      return;
                    }
                    try {
                      await undoVote({
                        userId: userId as Id<"users">,
                        voteId: activeVote._id,
                      });
                      success("Vote removed successfully");
                    } catch (err: any) {
                      showError(err.message || "Failed to remove vote");
                    }
                  }}
                  className="text-xs lg:text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  Undo
                </button>
              )}
              {userRole === "admin" && (
                <Link href="/voting" className="text-xs lg:text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                  Show History
                </Link>
              )}
            </div>
          </div>
          {activeVote ? (
            <>
              {/* Multiple active votes selector */}
              {activeVotes && activeVotes.length > 1 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Switch Between Active Votes ({activeVotes.length} active)
                  </label>
                  <select
                    value={selectedVoteId || ""}
                    onChange={(e) => setSelectedVoteId(e.target.value as Id<"votes">)}
                    className="w-full py-2.5 px-3 rounded-lg border-2 border-blue-300 text-xs lg:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white shadow-sm"
                  >
                    {activeVotes.map((vote, index) => (
                      <option key={vote._id} value={vote._id}>
                        Vote {index + 1}: {vote.question.length > 60 ? `${vote.question.substring(0, 60)}...` : vote.question}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    You can switch between {activeVotes.length} active voting polls
                  </p>
                </div>
              )}
              <p className="text-xs lg:text-sm text-slate-600 mb-4">{activeVote.question}</p>
              {userVote ? (
                // Show results after voting
                <div className="space-y-3">
                  {activeVote.options.map((option: string, index: number) => {
                    const count = activeVote.voteCounts?.[option] || 0;
                    const total = activeVote.totalVotes || 0;
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    
                    // Different colors for each option (blue, teal, red/orange)
                    const colors = [
                      "bg-blue-600", // First option - blue
                      "bg-cyan-500", // Second option - teal/cyan
                      "bg-orange-500", // Third option - orange
                      "bg-purple-500", // Fourth option - purple (if more than 3)
                      "bg-pink-500", // Fifth option - pink (if more than 4)
                    ];
                    const barColor = colors[index] || colors[0];
                    
                    return (
                      <div key={option} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs lg:text-sm text-slate-900 font-medium">{option}</span>
                          <span className="text-xs text-slate-500">{percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`${barColor} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Show voting buttons if user hasn't voted
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
                            voteId: activeVote._id,
                          });
                          success("Vote submitted successfully");
                        } catch (err: any) {
                          showError(err.message || "Failed to submit vote");
                        }
                      }}
                      className="w-full py-2.5 lg:py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 text-xs lg:text-sm font-medium transition-all"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
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
            {userRole === "admin" && (
              <Link href="/suggestions" className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
                Show History
              </Link>
            )}
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
                  setSuggestionCategory("");
                  setSuggestionText("");
                  setShowSuggestionSuccessModal(true);
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
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg lg:text-xl font-semibold text-slate-900 mb-1">Todo</h2>
              <p className="text-xs text-slate-500">
                Top 5 records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowAllTodosModal(true)}
                  className="px-3 py-1.5 text-xs lg:text-sm text-slate-600 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Show More
                </button>
              </div>
              <button
                onClick={handleAddTodo}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 transition-colors"
                title="Add Todo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
          <div className="space-y-0">
            {todos && todos.length > 0 ? (
              todos.map((todo) => (
                <div
                  key={todo._id}
                  className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors group relative"
                >
                  {/* Priority indicator bar - vertical colored bar on the left */}
                  <div 
                    className={`w-[3px] h-full min-h-[48px] ${getTodoPriorityColor(todo.priority, todo.status)} rounded-full flex-shrink-0`}
                  ></div>
                  
                  {/* Task content */}
                  <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium text-slate-900 mb-1 ${
                        todo.status === "completed" ? "line-through text-slate-400" : ""
                      }`}>
                        {todo.title}
                      </p>
                      <p className="text-xs text-slate-500">{formatDueDate(todo.dueDate)}</p>
                    </div>
                    
                    {/* Options icon (ellipsis) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTodoOptions(showTodoOptions === todo._id ? null : todo._id);
                      }}
                      className="todo-options-button opacity-60 hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded flex-shrink-0"
                      title="Options"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Options menu */}
                  {showTodoOptions === todo._id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTodoComplete(todo);
                          setShowTodoOptions(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-t-lg"
                      >
                        {todo.status === "completed" ? "Mark Incomplete" : "Mark Complete"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTodo(todo);
                          setShowTodoOptions(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No todos yet</p>
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
                description: "",
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
                      description: "",
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
                      Description
                    </label>
                    <Textarea
                      value={todoForm.description}
                      onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                      placeholder="Enter todo description (optional)"
                      rows={3}
                    />
                  </div>

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
                      description: "",
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

        {/* All Todos Modal */}
        {showAllTodosModal && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              // Only close if clicking the backdrop, not the modal content
              if (e.target === e.currentTarget) {
                setShowAllTodosModal(false);
                setShowTodoOptions(null);
              }
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">All Todos</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {allTodosForModal?.length || 0} {allTodosForModal?.length === 1 ? 'todo' : 'todos'} total
                  </p>
                </div>
                <button
                  onClick={() => setShowAllTodosModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {allTodosForModal && allTodosForModal.length > 0 ? (
                  <div className="space-y-3">
                    {allTodosForModal.map((todo) => {
                      const priorityBadge = getPriorityBadge(todo.priority);
                      const statusBadge = getStatusBadge(todo.status);
                      return (
                        <div
                          key={todo._id}
                          className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group relative"
                        >
                          {/* Priority indicator bar */}
                          <div 
                            className={`w-[3px] h-full min-h-[60px] ${getTodoPriorityColor(todo.priority, todo.status)} rounded-full flex-shrink-0`}
                          ></div>
                          
                          {/* Todo content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className={`text-base font-semibold text-slate-900 mb-1 ${
                                  todo.status === "completed" ? "line-through text-slate-400" : ""
                                }`}>
                                  {todo.title}
                                </h3>
                                {todo.description && (
                                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                    {todo.description}
                                  </p>
                                )}
                              </div>
                              
                              {/* Options icon */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowTodoOptions(showTodoOptions === todo._id ? null : todo._id);
                                }}
                                className="todo-options-button opacity-60 hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded flex-shrink-0"
                                title="Options"
                              >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* Badges and due date */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded border ${priorityBadge.className}`}>
                                {priorityBadge.label}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded border ${statusBadge.className}`}>
                                {statusBadge.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDueDate(todo.dueDate)}
                              </span>
                            </div>
                            
                            {/* Options menu */}
                            {showTodoOptions === todo._id && (
                              <div className="todo-options-menu absolute right-4 top-12 bg-white border border-slate-200 rounded-lg shadow-lg z-30 min-w-[120px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTodoComplete(todo);
                                    setShowTodoOptions(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-t-lg"
                                >
                                  {todo.status === "completed" ? "Mark Incomplete" : "Mark Complete"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTodo(todo);
                                    setShowTodoOptions(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <span className="text-4xl mb-3 block">📝</span>
                    <p className="text-sm">No todos found</p>
                    <button
                      onClick={() => {
                        setShowAllTodosModal(false);
                        handleAddTodo();
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                    >
                      Create your first todo
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAllTodosModal(false)}
                >
                  Close
                </Button>
                <Button 
                  variant="gradient" 
                  onClick={() => {
                    setShowAllTodosModal(false);
                    handleAddTodo();
                  }}
                >
                  Add New Todo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* All Favorites Modal */}
        {showAllFavoritesModal && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAllFavoritesModal(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">All Favorite Services</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {favoriteServices?.length || 0} {favoriteServices?.length === 1 ? 'favorite service' : 'favorite services'}
                  </p>
                </div>
                <button
                  onClick={() => setShowAllFavoritesModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {favoriteServices && favoriteServices.length > 0 ? (
                  <div className="space-y-3">
                    {favoriteServices.map((service: any) => {
                      const daysSinceCreation = Math.floor((Date.now() - service.createdAt) / (1000 * 60 * 60 * 24));
                      const duration = daysSinceCreation > 0 ? `${daysSinceCreation} day${daysSinceCreation !== 1 ? 's' : ''}` : '1 day';
                      
                      return (
                        <div
                          key={service._id}
                          onClick={() => {
                            handleServiceClick(service);
                            setShowAllFavoritesModal(false);
                          }}
                          className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          {/* Service Logo */}
                          <div className="flex-shrink-0">
                            <ServiceLogoDisplay service={service} size="medium" />
                          </div>
                          
                          {/* Service Details */}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs">{duration}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="text-xs font-medium">{service.rating.toFixed(1)}</span>
                              </div>
                              {service.requestCount > 0 && (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-xs">{service.requestCount} requests</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Arrow Icon */}
                          <svg className="w-5 h-5 text-slate-400 flex-shrink-0 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <span className="text-4xl mb-3 block">❤️</span>
                    <p className="text-sm">No favorite services yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click the heart icon on services to add them here</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAllFavoritesModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Suggestion Success Modal */}
        {showSuggestionSuccessModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSuggestionSuccessModal(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Success Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-5">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Message */}
              <h3 className="text-base font-semibold text-slate-700 mb-6 text-center">
                Thanks for your suggestion
              </h3>

              {/* OK Button */}
              <button
                onClick={() => setShowSuggestionSuccessModal(false)}
                className="w-full py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
