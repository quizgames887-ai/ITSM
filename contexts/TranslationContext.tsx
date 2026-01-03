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
// Organized by application pages for better management
const defaultTranslations: Record<string, string> = {
  // ============================================
  // SHARED / COMMON (Used across multiple pages)
  // ============================================
  "shared.save": "Save",
  "shared.cancel": "Cancel",
  "shared.delete": "Delete",
  "shared.edit": "Edit",
  "shared.close": "Close",
  "shared.submit": "Submit",
  "shared.search": "Search",
  "shared.loading": "Loading...",
  "shared.error": "Error",
  "shared.success": "Success",
  "shared.confirm": "Confirm",
  "shared.yes": "Yes",
  "shared.no": "No",
  "shared.create": "Create",
  "shared.update": "Update",
  "shared.view": "View",
  "shared.back": "Back",
  "shared.required": "Required",
  "shared.optional": "Optional",
  "shared.all": "All",
  "shared.none": "None",
  "shared.active": "Active",
  "shared.inactive": "Inactive",
  "shared.enabled": "Enabled",
  "shared.disabled": "Disabled",
  "shared.name": "Name",
  "shared.email": "Email",
  "shared.title": "Title",
  "shared.description": "Description",
  "shared.type": "Type",
  "shared.priority": "Priority",
  "shared.status": "Status",
  "shared.category": "Category",
  "shared.date": "Date",
  "shared.time": "Time",
  "shared.actions": "Actions",
  "shared.createdAt": "Created At",
  "shared.updatedAt": "Updated At",
  "shared.saving": "Saving...",
  "shared.results": "Results",
  "shared.noResults": "No results found",
  "shared.searchPlaceholder": "Search...",
  "shared.confirmDelete": "Are you sure you want to delete this item?",
  "shared.operationSuccess": "Operation completed successfully",
  "shared.operationError": "An error occurred",
  "shared.mustBeLoggedIn": "You must be logged in",
  "shared.failedToCreate": "Failed to create {item}",
  "shared.failedToUpdate": "Failed to update {item}",
  "shared.failedToDelete": "Failed to delete {item}",
  "shared.failedToSave": "Failed to save {item}",
  "shared.createdSuccess": "{item} created successfully",
  "shared.updatedSuccess": "{item} updated successfully",
  "shared.deletedSuccess": "{item} deleted successfully",
  "shared.savedSuccess": "{item} saved successfully",
  
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
  
  // Common UI Elements (Header, Sidebar, etc.)
  "ui.needHelp": "Need Help?",
  "ui.contactSupport": "Contact support",
  "ui.find": "Find...",
  "ui.searchResults": "Search Results",
  "ui.trySearching": "Try searching for tickets, services, or knowledge articles",
  "ui.loggedIn": "Logged in",
  "ui.viewingAs": "Viewing as",
  "ui.loggedInAs": "Logged in as:",
  "ui.exitImpersonation": "Exit Impersonation",
  "ui.viewProfile": "View Profile",
  "ui.profileSettings": "Profile Settings",
  "ui.logout": "Logout",
  "ui.notifications": "Notifications",
  "ui.markAllRead": "Mark all read",
  "ui.noNotifications": "No notifications yet",
  "ui.notificationUpdates": "You'll see updates about your tickets here",
  "ui.viewAllNotifications": "View all notifications",
  
  // Status Labels (Used across pages)
  "status.new": "New",
  "status.inProgress": "In Progress",
  "status.onHold": "On Hold",
  "status.resolved": "Resolved",
  "status.closed": "Closed",
  "status.pending": "Pending",
  "status.completed": "Completed",
  "status.overdue": "Overdue",
  
  // Priority Labels (Used across pages)
  "priority.low": "Low",
  "priority.medium": "Medium",
  "priority.high": "High",
  "priority.critical": "Critical",
  
  // Urgency Labels
  "urgency.low": "Low",
  "urgency.medium": "Medium",
  "urgency.high": "High",
  
  // Ticket Types
  "ticketType.incident": "Incident",
  "ticketType.serviceRequest": "Service Request",
  "ticketType.inquiry": "Inquiry",
  
  // Roles
  "role.admin": "Admin",
  "role.agent": "Agent",
  "role.user": "User",
  
  // Categories
  "category.itSupport": "IT Support",
  "category.hr": "HR",
  "category.finance": "Finance",
  "category.facilities": "Facilities",
  "category.security": "Security",
  "category.other": "Other",
  
  // Time Formatting
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
  
  // SLA Status
  "sla.overdue": "Overdue",
  "sla.urgent": "Urgent",
  "sla.onTime": "On Time",
  
  // Labels
  "label.unassigned": "Unassigned",
  "label.unknown": "Unknown",
  
  // Account Status
  "account.created": "Account Created",
  "account.lastUpdated": "Last Updated",
  "account.onboardingCompleted": "Completed",
  "account.onboardingPending": "Pending",
  
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
  
  // ============================================
  // PAGE: DASHBOARD (/dashboard)
  // ============================================
  "pages.dashboard.title": "My Workspace",
  "pages.dashboard.welcome": "Welcome",
  "pages.dashboard.mostServicesRequest": "Most Services Request",
  "pages.dashboard.showMore": "Show More",
  "pages.dashboard.manage": "Manage",
  "pages.dashboard.lastUpdate": "Last update",
  "pages.dashboard.calendarEvents": "Calendar Events",
  "pages.dashboard.voting": "Voting",
  "pages.dashboard.suggesting": "Suggesting",
  "pages.dashboard.todo": "Todo",
  "pages.dashboard.myFavorites": "My Favorites",
  
  // Dashboard - Events
  "pages.dashboard.events.add": "Add Event",
  "pages.dashboard.events.edit": "Edit Event",
  "pages.dashboard.events.delete": "Delete Event",
  "pages.dashboard.events.title": "Event Title",
  "pages.dashboard.events.description": "Description",
  "pages.dashboard.events.date": "Date",
  "pages.dashboard.events.startTime": "Start Time",
  "pages.dashboard.events.endTime": "End Time",
  "pages.dashboard.events.noEvents": "No events for this date",
  "pages.dashboard.events.addFirst": "Add your first event",
  "pages.dashboard.events.created": "Event created successfully",
  "pages.dashboard.events.updated": "Event updated successfully",
  "pages.dashboard.events.deleted": "Event deleted successfully",
  "pages.dashboard.events.titleRequired": "Event title is required",
  "pages.dashboard.events.timeRequired": "Start time and end time are required",
  "pages.dashboard.events.dateRequired": "Date is required",
  "pages.dashboard.events.confirmDelete": "Are you sure you want to delete this event?",
  
  // Dashboard - Todos
  "pages.dashboard.todos.add": "Add Todo",
  "pages.dashboard.todos.edit": "Edit Todo",
  "pages.dashboard.todos.delete": "Delete Todo",
  "pages.dashboard.todos.title": "Todo Title",
  "pages.dashboard.todos.description": "Description",
  "pages.dashboard.todos.dueDate": "Due Date",
  "pages.dashboard.todos.priority": "Priority",
  "pages.dashboard.todos.created": "Todo created successfully",
  "pages.dashboard.todos.updated": "Todo updated successfully",
  "pages.dashboard.todos.deleted": "Todo deleted successfully",
  "pages.dashboard.todos.titleRequired": "Todo title is required",
  "pages.dashboard.todos.dueDateRequired": "Due date is required",
  "pages.dashboard.todos.confirmDelete": "Are you sure you want to delete this todo?",
  "pages.dashboard.todos.dueToday": "Due today",
  "pages.dashboard.todos.dueInDays": "Due in {days} days",
  "pages.dashboard.todos.overdue": "Overdue {days} day",
  "pages.dashboard.todos.overdueDays": "Overdue {days} days",
  "pages.dashboard.todos.showAll": "Show All Todos",
  "pages.dashboard.todos.all": "All Todos",
  
  // Dashboard - Voting
  "pages.dashboard.voting.vote": "Vote",
  "pages.dashboard.voting.undoVote": "Undo Vote",
  "pages.dashboard.voting.noActiveVote": "No active vote",
  "pages.dashboard.voting.createVote": "Create a vote",
  "pages.dashboard.voting.submitted": "Vote submitted successfully",
  "pages.dashboard.voting.undone": "Vote undone successfully",
  
  // Dashboard - Suggestions
  "pages.dashboard.suggestions.submit": "Submit Suggestion",
  "pages.dashboard.suggestions.category": "Category",
  "pages.dashboard.suggestions.text": "Your Suggestion",
  "pages.dashboard.suggestions.submitted": "Thanks for your suggestion",
  "pages.dashboard.suggestions.success": "Suggestion submitted successfully",
  
  // Dashboard - Services
  "pages.dashboard.services.request": "Request Service",
  "pages.dashboard.services.serviceRequest": "Service Request",
  "pages.dashboard.services.formTitle": "Title",
  "pages.dashboard.services.formDescription": "Description",
  "pages.dashboard.services.formType": "Type",
  "pages.dashboard.services.formPriority": "Priority",
  "pages.dashboard.services.formUrgency": "Urgency",
  "pages.dashboard.services.created": "Service request created successfully",
  "pages.dashboard.services.titleRequired": "Title is required",
  "pages.dashboard.services.descriptionRequired": "Description is required",
  "pages.dashboard.services.noServices": "No services available",
  "pages.dashboard.services.createFirst": "Create your first service",
  "pages.dashboard.services.getHelpSupport": "Get Help & Support",
  "pages.dashboard.services.myRequests": "My Requests / All Requests",
  "pages.dashboard.services.knowledgeBase": "Knowledge Base",
  "pages.dashboard.services.userGuide": "Services User Guide",
  
  // Dashboard - Favorites
  "pages.dashboard.favorites.showAll": "Show All Favorites",
  "pages.dashboard.favorites.add": "Add to Favorites",
  "pages.dashboard.favorites.remove": "Remove from Favorites",
  
  // ============================================
  // PAGE: TICKETS (/tickets)
  // ============================================
  "pages.tickets.title": "Tickets",
  "pages.tickets.manageTickets": "Manage and track all your support tickets",
  "pages.tickets.create": "Create Ticket",
  "pages.tickets.myTickets": "My Tickets",
  "pages.tickets.assignedToMe": "Assigned to Me",
  "pages.tickets.allTickets": "All Tickets",
  "pages.tickets.assignedTo": "Assigned To",
  "pages.tickets.createdBy": "Created By",
  "pages.tickets.ticketTitle": "Ticket Title",
  "pages.tickets.ticketDescription": "Description",
  "pages.tickets.ticketType": "Type",
  "pages.tickets.created": "Ticket created successfully",
  "pages.tickets.titleRequired": "Ticket title is required",
  "pages.tickets.descriptionRequired": "Ticket description is required",
  "pages.tickets.filterAll": "All",
  "pages.tickets.filterStatus": "Status",
  "pages.tickets.filterPriority": "Priority",
  "pages.tickets.noTickets": "No tickets found",
  "pages.tickets.createFirst": "Create your first ticket",
  "pages.tickets.ticketDetails": "Ticket Details",
  
  // ============================================
  // PAGE: USERS (/users)
  // ============================================
  "pages.users.title": "Users",
  "pages.users.teams": "Teams",
  "pages.users.manageUsers": "Manage users and teams",
  "pages.users.searchUsers": "Search users...",
  "pages.users.filterByRole": "Filter by Role",
  "pages.users.sortBy": "Sort By",
  "pages.users.role": "Role",
  "pages.users.onboardingStatus": "Onboarding Status",
  "pages.users.editUser": "Edit User",
  "pages.users.resetPassword": "Reset Password",
  "pages.users.impersonate": "Impersonate",
  "pages.users.newPassword": "New Password",
  "pages.users.confirmPassword": "Confirm Password",
  "pages.users.passwordReset": "Password reset successfully",
  "pages.users.passwordRequired": "Please enter and confirm the new password",
  "pages.users.passwordMinLength": "Password must be at least 8 characters long",
  "pages.users.passwordMismatch": "Passwords do not match",
  "pages.users.nameRequired": "Name cannot be empty",
  "pages.users.emailRequired": "Please enter a valid email address",
  "pages.users.userUpdated": "User updated successfully",
  "pages.users.nowViewingAs": "Now viewing as {name}",
  "pages.users.accessDenied": "Access Denied",
  "pages.users.needAdminPrivileges": "You need admin privileges to access this page",
  "pages.users.onlyAdminsCanEdit": "Only admins can edit user details",
  "pages.users.onlyAdminsCanReset": "Only admins can reset passwords",
  "pages.users.onlyAdminsCanUpdate": "Only admins can update users",
  "pages.users.onlyAdminsCanImpersonate": "Only admins can impersonate users",
  "pages.users.unableToImpersonate": "Unable to impersonate: No admin session found",
  "pages.users.backToDashboard": "Back to Dashboard",
  "pages.users.stats": "Statistics",
  "pages.users.totalUsers": "Total Users",
  "pages.users.admins": "Admins",
  "pages.users.agents": "Agents",
  "pages.users.regularUsers": "Users",
  "pages.users.totalTeams": "Teams",
  
  // Users - Teams
  "pages.users.teams.create": "Create Team",
  "pages.users.teams.teamName": "Team Name",
  "pages.users.teams.teamDescription": "Description",
  "pages.users.teams.teamColor": "Color",
  "pages.users.teams.addMember": "Add Member",
  "pages.users.teams.removeMember": "Remove Member",
  "pages.users.teams.deleteTeam": "Delete Team",
  "pages.users.teams.teamCreated": "Team created successfully",
  "pages.users.teams.teamDeleted": "Team deleted successfully",
  "pages.users.teams.memberAdded": "Member added to team",
  "pages.users.teams.memberRemoved": "Member removed from team",
  "pages.users.teams.teamNameRequired": "Team name is required",
  "pages.users.teams.confirmDelete": "Are you sure you want to delete this team? All members will be removed",
  "pages.users.teams.noTeams": "No teams yet",
  "pages.users.teams.createFirst": "Create your first team",
  
  // ============================================
  // PAGE: FORMS (/forms)
  // ============================================
  "pages.forms.title": "Forms",
  "pages.forms.manageForms": "Manage and design your custom forms",
  "pages.forms.createNew": "Create New Form",
  "pages.forms.newForm": "New Form",
  "pages.forms.noForms": "No forms yet",
  "pages.forms.createFirst": "Create your first form",
  "pages.forms.formDescription": "Create custom forms to collect data, gather feedback, or build surveys. Design forms with drag-and-drop fields.",
  "pages.forms.deleteForm": "Delete Form",
  "pages.forms.confirmDelete": "Are you sure you want to delete this form?",
  "pages.forms.formDeleted": "Form deleted successfully",
  "pages.forms.designer": "Form Designer",
  
  // ============================================
  // PAGE: PROFILE (/profile)
  // ============================================
  "pages.profile.title": "Profile",
  "pages.profile.personalInformation": "Personal Information",
  "pages.profile.editProfile": "Edit Profile",
  "pages.profile.passwordReset": "Password Reset",
  "pages.profile.changePassword": "Change Password",
  "pages.profile.accountDetails": "Account Details",
  "pages.profile.languagePreference": "Language Preference",
  "pages.profile.languageDescription": "The interface will be displayed from {direction}",
  "pages.profile.updateDetails": "Update your profile details",
  "pages.profile.namePlaceholder": "Your name",
  "pages.profile.changePasswordDescription": "Change your account password",
  
  // ============================================
  // PAGE: TRANSLATIONS (/translations)
  // ============================================
  "pages.translations.title": "Translations",
  "pages.translations.manage": "Manage translations",
  "pages.translations.add": "Add Translation",
  "pages.translations.edit": "Edit Translation",
  "pages.translations.delete": "Delete Translation",
  "pages.translations.key": "Key",
  "pages.translations.english": "English",
  "pages.translations.arabic": "Arabic",
  "pages.translations.category": "Category",
  "pages.translations.bulkImport": "Bulk Import",
  "pages.translations.noTranslations": "No translations yet",
  
  // ============================================
  // PAGE: EVENTS (/events)
  // ============================================
  "pages.events.title": "Event Management",
  "pages.events.manage": "Manage events",
  
  // ============================================
  // PAGE: VOTING (/voting)
  // ============================================
  "pages.voting.title": "Voting",
  "pages.voting.manage": "Manage votes",
  
  // ============================================
  // PAGE: SUGGESTIONS (/suggestions)
  // ============================================
  "pages.suggestions.title": "Suggestions",
  "pages.suggestions.manage": "Manage suggestions",
  
  // ============================================
  // PAGE: ANNOUNCEMENTS (/announcements)
  // ============================================
  "pages.announcements.title": "Announcements",
  "pages.announcements.manage": "Manage announcements",
  
  // ============================================
  // PAGE: NOTIFICATIONS (/notifications)
  // ============================================
  "pages.notifications.title": "Notification Management",
  "pages.notifications.manage": "Manage notifications",
  
  // ============================================
  // PAGE: SERVICE CATALOG (/service-catalog)
  // ============================================
  "pages.serviceCatalog.title": "Service Catalog",
  "pages.serviceCatalog.manage": "Manage service catalog",
  
  // ============================================
  // PAGE: ROLES (/roles)
  // ============================================
  "pages.roles.title": "Auto-Assignment Rules",
  "pages.roles.manage": "Manage assignment rules",
  
  // ============================================
  // PAGE: SLA (/sla)
  // ============================================
  "pages.sla.title": "SLA & Escalation",
  "pages.sla.manage": "Manage SLA policies",
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
