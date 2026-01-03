"use client";

import { createContext, useContext, useEffect, useState, ReactNode, ErrorInfo, Component } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface TranslationContextType {
  t: (key: string, fallback?: string) => string;
  language: "en" | "ar";
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Default English translations (fallback)
const defaultTranslations: Record<string, string> = {
  // Common
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
  "common.submit": "Submit",
  "common.search": "Search",
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.success": "Success",
  "common.confirm": "Confirm",
  "common.yes": "Yes",
  "common.no": "No",
  
  // Dashboard
  "dashboard.title": "My Workspace",
  "dashboard.welcome": "Welcome",
  "dashboard.mostServicesRequest": "Most Services Request",
  "dashboard.showMore": "Show More",
  "dashboard.manage": "Manage",
  "dashboard.lastUpdate": "Last update",
  "dashboard.calendarEvents": "Calendar Events",
  "dashboard.voting": "Voting",
  "dashboard.suggesting": "Suggesting",
  "dashboard.todo": "Todo",
  "dashboard.myFavorites": "My Favorites",
  
  // Profile
  "profile.title": "Profile",
  "profile.personalInformation": "Personal Information",
  "profile.editProfile": "Edit Profile",
  "profile.name": "Name",
  "profile.email": "Email",
  "profile.role": "Role",
  "profile.passwordReset": "Password Reset",
  "profile.changePassword": "Change Password",
  "profile.accountDetails": "Account Details",
  "profile.languagePreference": "Language Preference",
  "profile.languageDescription": "The interface will be displayed from {direction}",
  "profile.updateDetails": "Update your profile details",
  "profile.namePlaceholder": "Your name",
  "profile.changePasswordDescription": "Change your account password",
  
  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.tickets": "Tickets",
  "nav.serviceCatalog": "Service Catalog",
  "nav.forms": "Forms",
  "nav.users": "Users",
  "nav.notifications": "Notification Management",
  "nav.announcements": "Announcements",
  "nav.roles": "Auto-Assignment Rules",
  "nav.sla": "SLA & Escalation",
  "nav.events": "Event Management",
  "nav.voting": "Voting",
  "nav.suggestions": "Suggestions",
  "nav.profile": "Profile",
  "nav.translations": "Translations",
  
  // Buttons
  "button.create": "Create",
  "button.update": "Update",
  "button.save": "Save",
  "button.cancel": "Cancel",
  "button.delete": "Delete",
  "button.edit": "Edit",
  "button.view": "View",
  "button.close": "Close",
  "button.submit": "Submit",
  "button.back": "Back",
  
  // Forms
  "form.required": "Required",
  "form.invalid": "Invalid",
  "form.submit": "Submit",
  "form.cancel": "Cancel",
  
  // Messages
  "message.success": "Operation completed successfully",
  "message.error": "An error occurred",
  "message.confirmDelete": "Are you sure you want to delete this item?",
  
  // Common UI
  "common.needHelp": "Need Help?",
  "common.contactSupport": "Contact support",
  "common.find": "Find...",
  "common.searchPlaceholder": "Search...",
  "common.searchResults": "Search Results",
  "common.noResults": "No results found",
  "common.trySearching": "Try searching for tickets, services, or knowledge articles",
  "common.loggedIn": "Logged in",
  "common.viewingAs": "Viewing as",
  "common.loggedInAs": "Logged in as:",
  "common.exitImpersonation": "Exit Impersonation",
  "common.viewProfile": "View Profile",
  "common.profileSettings": "Profile Settings",
  "common.logout": "Logout",
  "common.notifications": "Notifications",
  "common.markAllRead": "Mark all read",
  "common.noNotifications": "No notifications yet",
  "common.notificationUpdates": "You'll see updates about your tickets here",
  "common.viewAllNotifications": "View all notifications",
  "common.results": "Results",
  "common.saving": "Saving...",
  
  // Additional keys
  "tickets.ticketDetails": "Ticket Details",
  "forms.designer": "Form Designer",
  
  // Dashboard - Events
  "dashboard.addEvent": "Add Event",
  "dashboard.editEvent": "Edit Event",
  "dashboard.deleteEvent": "Delete Event",
  "dashboard.eventTitle": "Event Title",
  "dashboard.eventDescription": "Description",
  "dashboard.eventDate": "Date",
  "dashboard.eventStartTime": "Start Time",
  "dashboard.eventEndTime": "End Time",
  "dashboard.noEvents": "No events for this date",
  "dashboard.addFirstEvent": "Add your first event",
  "dashboard.eventCreated": "Event created successfully",
  "dashboard.eventUpdated": "Event updated successfully",
  "dashboard.eventDeleted": "Event deleted successfully",
  "dashboard.eventTitleRequired": "Event title is required",
  "dashboard.eventTimeRequired": "Start time and end time are required",
  "dashboard.eventDateRequired": "Date is required",
  "dashboard.confirmDeleteEvent": "Are you sure you want to delete this event?",
  
  // Dashboard - Todos
  "dashboard.addTodo": "Add Todo",
  "dashboard.editTodo": "Edit Todo",
  "dashboard.deleteTodo": "Delete Todo",
  "dashboard.todoTitle": "Todo Title",
  "dashboard.todoDescription": "Description",
  "dashboard.todoDueDate": "Due Date",
  "dashboard.todoPriority": "Priority",
  "dashboard.todoCreated": "Todo created successfully",
  "dashboard.todoUpdated": "Todo updated successfully",
  "dashboard.todoDeleted": "Todo deleted successfully",
  "dashboard.todoTitleRequired": "Todo title is required",
  "dashboard.todoDueDateRequired": "Due date is required",
  "dashboard.confirmDeleteTodo": "Are you sure you want to delete this todo?",
  "dashboard.dueToday": "Due today",
  "dashboard.dueInDays": "Due in {days} days",
  "dashboard.overdue": "Overdue {days} day",
  "dashboard.overdueDays": "Overdue {days} days",
  "dashboard.showAllTodos": "Show All Todos",
  "dashboard.allTodos": "All Todos",
  
  // Dashboard - Voting
  "dashboard.vote": "Vote",
  "dashboard.undoVote": "Undo Vote",
  "dashboard.noActiveVote": "No active vote",
  "dashboard.createVote": "Create a vote",
  "dashboard.voteSubmitted": "Vote submitted successfully",
  "dashboard.voteUndone": "Vote undone successfully",
  
  // Dashboard - Suggestions
  "dashboard.submitSuggestion": "Submit Suggestion",
  "dashboard.suggestionCategory": "Category",
  "dashboard.suggestionText": "Your Suggestion",
  "dashboard.suggestionSubmitted": "Thanks for your suggestion",
  "dashboard.suggestionSuccess": "Suggestion submitted successfully",
  
  // Dashboard - Services
  "dashboard.requestService": "Request Service",
  "dashboard.serviceRequest": "Service Request",
  "dashboard.title": "Title",
  "dashboard.description": "Description",
  "dashboard.type": "Type",
  "dashboard.priority": "Priority",
  "dashboard.urgency": "Urgency",
  "dashboard.serviceRequestCreated": "Service request created successfully",
  "dashboard.titleRequired": "Title is required",
  "dashboard.descriptionRequired": "Description is required",
  "dashboard.noServices": "No services available",
  "dashboard.createFirstService": "Create your first service",
  "dashboard.getHelpSupport": "Get Help & Support",
  "dashboard.myRequests": "My Requests / All Requests",
  "dashboard.knowledgeBase": "Knowledge Base",
  "dashboard.servicesUserGuide": "Services User Guide",
  
  // Dashboard - Favorites
  "dashboard.myFavorites": "My Favorites",
  "dashboard.showAllFavorites": "Show All Favorites",
  "dashboard.addToFavorites": "Add to Favorites",
  "dashboard.removeFromFavorites": "Remove from Favorites",
  
  // Tickets
  "tickets.title": "Tickets",
  "tickets.manageTickets": "Manage and track all your support tickets",
  "tickets.createTicket": "Create Ticket",
  "tickets.myTickets": "My Tickets",
  "tickets.assignedToMe": "Assigned to Me",
  "tickets.allTickets": "All Tickets",
  "tickets.status": "Status",
  "tickets.priority": "Priority",
  "tickets.category": "Category",
  "tickets.assignedTo": "Assigned To",
  "tickets.createdBy": "Created By",
  "tickets.createdAt": "Created At",
  "tickets.updatedAt": "Updated At",
  "tickets.ticketTitle": "Ticket Title",
  "tickets.ticketDescription": "Description",
  "tickets.ticketType": "Type",
  "tickets.ticketCreated": "Ticket created successfully",
  "tickets.ticketTitleRequired": "Ticket title is required",
  "tickets.ticketDescriptionRequired": "Ticket description is required",
  "tickets.filterAll": "All",
  "tickets.filterStatus": "Status",
  "tickets.filterPriority": "Priority",
  "tickets.noTickets": "No tickets found",
  "tickets.createFirstTicket": "Create your first ticket",
  
  // Ticket Status
  "status.new": "New",
  "status.inProgress": "In Progress",
  "status.onHold": "On Hold",
  "status.resolved": "Resolved",
  "status.closed": "Closed",
  "status.pending": "Pending",
  "status.completed": "Completed",
  "status.overdue": "Overdue",
  
  // Priority
  "priority.low": "Low",
  "priority.medium": "Medium",
  "priority.high": "High",
  "priority.critical": "Critical",
  
  // Ticket Types
  "ticketType.incident": "Incident",
  "ticketType.serviceRequest": "Service Request",
  "ticketType.inquiry": "Inquiry",
  
  // Urgency
  "urgency.low": "Low",
  "urgency.medium": "Medium",
  "urgency.high": "High",
  
  // Users
  "users.title": "Users",
  "users.teams": "Teams",
  "users.manageUsers": "Manage users and teams",
  "users.searchUsers": "Search users...",
  "users.filterByRole": "Filter by Role",
  "users.sortBy": "Sort By",
  "users.name": "Name",
  "users.email": "Email",
  "users.role": "Role",
  "users.createdAt": "Created At",
  "users.onboardingStatus": "Onboarding Status",
  "users.actions": "Actions",
  "users.editUser": "Edit User",
  "users.resetPassword": "Reset Password",
  "users.impersonate": "Impersonate",
  "users.newPassword": "New Password",
  "users.confirmPassword": "Confirm Password",
  "users.passwordReset": "Password reset successfully",
  "users.passwordRequired": "Please enter and confirm the new password",
  "users.passwordMinLength": "Password must be at least 8 characters long",
  "users.passwordMismatch": "Passwords do not match",
  "users.nameRequired": "Name cannot be empty",
  "users.emailRequired": "Please enter a valid email address",
  "users.userUpdated": "User updated successfully",
  "users.nowViewingAs": "Now viewing as {name}",
  "users.accessDenied": "Access Denied",
  "users.needAdminPrivileges": "You need admin privileges to access this page",
  "users.onlyAdminsCanEdit": "Only admins can edit user details",
  "users.onlyAdminsCanReset": "Only admins can reset passwords",
  "users.onlyAdminsCanUpdate": "Only admins can update users",
  "users.onlyAdminsCanImpersonate": "Only admins can impersonate users",
  "users.unableToImpersonate": "Unable to impersonate: No admin session found",
  "users.backToDashboard": "Back to Dashboard",
  "users.stats": "Statistics",
  "users.totalUsers": "Total Users",
  "users.admins": "Admins",
  "users.agents": "Agents",
  "users.regularUsers": "Users",
  "users.totalTeams": "Teams",
  
  // Teams
  "teams.createTeam": "Create Team",
  "teams.teamName": "Team Name",
  "teams.teamDescription": "Description",
  "teams.teamColor": "Color",
  "teams.addMember": "Add Member",
  "teams.removeMember": "Remove Member",
  "teams.deleteTeam": "Delete Team",
  "teams.teamCreated": "Team created successfully",
  "teams.teamDeleted": "Team deleted successfully",
  "teams.memberAdded": "Member added to team",
  "teams.memberRemoved": "Member removed from team",
  "teams.teamNameRequired": "Team name is required",
  "teams.confirmDeleteTeam": "Are you sure you want to delete this team? All members will be removed",
  "teams.noTeams": "No teams yet",
  "teams.createFirstTeam": "Create your first team",
  
  // Forms
  "forms.title": "Forms",
  "forms.manageForms": "Manage and design your custom forms",
  "forms.createNewForm": "Create New Form",
  "forms.newForm": "New Form",
  "forms.noForms": "No forms yet",
  "forms.createFirstForm": "Create your first form",
  "forms.formDescription": "Create custom forms to collect data, gather feedback, or build surveys. Design forms with drag-and-drop fields.",
  "forms.active": "Active",
  "forms.inactive": "Inactive",
  "forms.deleteForm": "Delete Form",
  "forms.confirmDeleteForm": "Are you sure you want to delete this form?",
  "forms.formDeleted": "Form deleted successfully",
  
  // Common Error Messages
  "error.mustBeLoggedIn": "You must be logged in",
  "error.mustBeLoggedInToCreate": "You must be logged in to create {item}",
  "error.mustBeLoggedInToUpdate": "You must be logged in to update {item}",
  "error.mustBeLoggedInToDelete": "You must be logged in to delete {item}",
  "error.failedToCreate": "Failed to create {item}",
  "error.failedToUpdate": "Failed to update {item}",
  "error.failedToDelete": "Failed to delete {item}",
  "error.failedToSave": "Failed to save {item}",
  "error.operationFailed": "Operation failed",
  
  // Common Success Messages
  "success.created": "{item} created successfully",
  "success.updated": "{item} updated successfully",
  "success.deleted": "{item} deleted successfully",
  "success.saved": "{item} saved successfully",
  "success.operationCompleted": "Operation completed successfully",
  
  // Time
  "time.justNow": "Just now",
  "time.minutesAgo": "{minutes}m ago",
  "time.hoursAgo": "{hours}h ago",
  "time.daysAgo": "{days}d ago",
  "time.overdueMinutes": "{minutes}m overdue",
  "time.overdueHours": "{hours}h overdue",
  "time.overdueDays": "{days}d overdue",
  "time.leftMinutes": "{minutes}m left",
  "time.leftHours": "{hours}h left",
  "time.leftDays": "{days}d left",
  
  // SLA
  "sla.overdue": "Overdue",
  "sla.urgent": "Urgent",
  "sla.onTime": "On Time",
  
  // Common Labels
  "label.unassigned": "Unassigned",
  "label.unknown": "Unknown",
  "label.all": "All",
  "label.none": "None",
  "label.optional": "Optional",
  "label.required": "Required",
  "label.active": "Active",
  "label.inactive": "Inactive",
  "label.enabled": "Enabled",
  "label.disabled": "Disabled",
  "label.yes": "Yes",
  "label.no": "No",
  
  // Account Status
  "account.created": "Account Created",
  "account.lastUpdated": "Last Updated",
  "account.onboardingCompleted": "Completed",
  "account.onboardingPending": "Pending",
  
  // Categories
  "category.itSupport": "IT Support",
  "category.hr": "HR",
  "category.finance": "Finance",
  "category.facilities": "Facilities",
  "category.security": "Security",
  "category.other": "Other",
  
  // Roles
  "role.admin": "Admin",
  "role.agent": "Agent",
  "role.user": "User",
  
  // KPI Metrics
  "kpi.total": "Total",
  "kpi.new": "New",
  "kpi.inProgress": "In Progress",
  "kpi.open": "Open",
  "kpi.resolved": "Resolved",
  "kpi.closed": "Closed",
  "kpi.onHold": "On Hold",
  "kpi.critical": "Critical",
  "kpi.high": "High",
  "kpi.medium": "Medium",
  "kpi.low": "Low",
  "kpi.avgResolutionTime": "Avg Resolution Time",
  "kpi.days": "days",
  "kpi.unassigned": "Unassigned",
};

// Error boundary component to catch Convex function errors
class TranslationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if it's a Convex function not found error
    if (error.message?.includes("Could not find public function")) {
      return { hasError: true };
    }
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Translation function not available, using defaults:", error.message);
  }

  render() {
    if (this.state.hasError) {
      // Use default translations when function is not available
      return (
        <TranslationContext.Provider
          value={{
            t: (key: string, fallback?: string) => defaultTranslations[key] || fallback || key,
            language: "en",
            isLoading: false,
          }}
        >
          {this.props.children}
        </TranslationContext.Provider>
      );
    }

    return this.props.children;
  }
}

function TranslationProviderInner({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [translations, setTranslations] = useState<Record<string, string>>(defaultTranslations);
  const [isLoading, setIsLoading] = useState(true);

  // Get language from localStorage and listen for changes
  useEffect(() => {
    const savedLanguage = localStorage.getItem("userLanguage") || "en";
    setLanguage(savedLanguage as "en" | "ar");
    
    // Listen for storage changes (when language is updated in another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userLanguage" && e.newValue) {
        setLanguage(e.newValue as "en" | "ar");
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    const handleLanguageChange = () => {
      const newLanguage = localStorage.getItem("userLanguage") || "en";
      setLanguage(newLanguage as "en" | "ar");
    };
    
    window.addEventListener("languageChanged", handleLanguageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  // Fetch translations for current language
  // If the function doesn't exist, the error boundary will catch it and use defaults
  const fetchedTranslations = useQuery(
    api.translations.getByLanguage,
    { language }
  );

  useEffect(() => {
    if (fetchedTranslations) {
      // Merge fetched translations with defaults (fetched takes priority)
      setTranslations({ ...defaultTranslations, ...fetchedTranslations });
      setIsLoading(false);
    } else {
      // Use defaults if query is loading
      setTranslations(defaultTranslations);
      setIsLoading(false);
    }
  }, [fetchedTranslations, language]);

  // Translation function
  const t = (key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  };

  return (
    <TranslationContext.Provider value={{ t, language, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  return (
    <TranslationErrorBoundary>
      <TranslationProviderInner>{children}</TranslationProviderInner>
    </TranslationErrorBoundary>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
