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
