"use client";

import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Synchronous auth check on mount - blocks rendering until verified
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkAuth = () => {
      // Check logout flag in multiple places (cookie is most reliable for bfcache)
      const getCookie = (name: string): string | null => {
        if (typeof document === 'undefined') return null;
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) === ' ') c = c.substring(1, c.length);
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
      };
      
      const loggedOutCookie = getCookie('loggedOut');
      const loggedOutSession = sessionStorage.getItem('loggedOut');
      const logoutTimestamp = localStorage.getItem('logoutTimestamp');
      const pageUnloaded = sessionStorage.getItem('pageUnloaded') || getCookie('pageUnloaded');
      const userId = localStorage.getItem("userId");
      
      // Check if logout happened recently (within last hour)
      let recentlyLoggedOut = false;
      if (logoutTimestamp) {
        const logoutTime = parseInt(logoutTimestamp, 10);
        const now = Date.now();
        recentlyLoggedOut = (now - logoutTime) < 3600000; // 1 hour
      }
      
      // If page was unloaded and no userId, it might be bfcache restoration after logout
      const suspiciousRestore = pageUnloaded && !userId;
      
      // If logged out flag is set OR no userId OR recently logged out OR suspicious restore, redirect immediately
      if (loggedOutCookie === 'true' || loggedOutSession === 'true' || recentlyLoggedOut || !userId || suspiciousRestore) {
        
        // Clear logout flags
        if (typeof document !== 'undefined') {
          document.cookie = 'loggedOut=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict';
          document.cookie = 'pageUnloaded=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict';
        }
        sessionStorage.removeItem('loggedOut');
        sessionStorage.removeItem('logoutTimestamp');
        sessionStorage.removeItem('pageUnloaded');
        localStorage.removeItem('logoutTimestamp');
        
        setIsAuthenticated(false);
        window.history.replaceState(null, '', '/login');
        router.replace("/login");
        if (window.location.pathname !== '/login') {
          // Use location.replace to prevent back navigation
          window.location.replace('/login');
        }
        return;
      }
      
      setIsAuthenticated(true);
    };
    
    // Check immediately
    checkAuth();
    
    // Prevent bfcache on page unload
    const handlePageHide = (event: PageTransitionEvent) => {
      // Set flag to detect bfcache restoration
      sessionStorage.setItem('pageUnloaded', Date.now().toString());
    };
    
    // Handle pageshow event (fires when page is restored from bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      // Re-check auth when page is restored from cache
      checkAuth();
    };
    
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [pathname, router]);
  
  // Authentication check on mount and route change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const userId = localStorage.getItem("userId");
    const sessionExpiry = localStorage.getItem("sessionExpiry");
    const lastActivity = localStorage.getItem("lastActivity");
    
    if (!userId) {
      // Prevent back navigation by replacing history
      window.history.replaceState(null, '', '/login');
      router.replace("/login");
      // Force navigation to prevent any cached content
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return;
    }
    
    // Initialize session expiry if missing (for existing sessions)
    const now = Date.now();
    if (!sessionExpiry) {
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes
      const newExpiry = now + sessionTimeout;
      localStorage.setItem("sessionExpiry", newExpiry.toString());
      localStorage.setItem("lastActivity", now.toString());
    } else {
      // Check session timeout
      const expiryTime = parseInt(sessionExpiry, 10);
      
      if (now > expiryTime) {
        
        // Session expired - clear storage and redirect
        localStorage.clear();
        window.history.replaceState(null, '', '/login');
        router.replace("/login");
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return;
      }
      
      // Update last activity timestamp
      localStorage.setItem("lastActivity", now.toString());
    }
  }, [pathname, router]);
  
  // Session timeout monitoring and activity tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkSessionTimeout = () => {
      const userId = localStorage.getItem("userId");
      const sessionExpiry = localStorage.getItem("sessionExpiry");
      const lastActivity = localStorage.getItem("lastActivity");
      
      if (!userId || !sessionExpiry) return;
      
      const expiryTime = parseInt(sessionExpiry, 10);
      const now = Date.now();
      
      if (now > expiryTime) {
        
        localStorage.clear();
        router.replace("/login");
      } else if (lastActivity) {
        // Extend session on activity (30 minutes from last activity)
        const sessionTimeout = 30 * 60 * 1000;
        const newExpiry = now + sessionTimeout;
        localStorage.setItem("sessionExpiry", newExpiry.toString());
        localStorage.setItem("lastActivity", now.toString());
      }
    };
    
    // Check immediately
    checkSessionTimeout();
    
    // Check every minute
    const interval = setInterval(checkSessionTimeout, 60000);
    
    // Track user activity (mouse, keyboard, touch, scroll)
    const updateActivity = () => {
      const userId = localStorage.getItem("userId");
      if (userId) {
        localStorage.setItem("lastActivity", Date.now().toString());
        // Extend session expiry on activity
        const sessionTimeout = 30 * 60 * 1000;
        const newExpiry = Date.now() + sessionTimeout;
        localStorage.setItem("sessionExpiry", newExpiry.toString());
      }
    };
    
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    
    // Handle page visibility (check session when tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSessionTimeout();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle browser back/forward navigation
    const handlePopState = (event: PopStateEvent) => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        
        setIsAuthenticated(false);
        // Prevent back navigation - replace current history entry
        window.history.replaceState(null, '', '/login');
        router.replace("/login");
        // Force immediate navigation to prevent any cached content from rendering
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        // Validate session even if userId exists
        checkSessionTimeout();
        setIsAuthenticated(true);
      }
    };
    
    // Handle pageshow event (fires when page is restored from bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setIsAuthenticated(false);
        window.history.replaceState(null, '', '/login');
        router.replace("/login");
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        checkSessionTimeout();
        setIsAuthenticated(true);
      }
    };
    
    // Intercept back button before it navigates
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);
    
    // Add history entry to prevent direct back navigation to protected pages
    if (typeof window !== 'undefined' && window.history.length > 0) {
      // Push a login entry to history stack to prevent back navigation
      window.history.pushState({ preventBack: true }, '', window.location.pathname);
    }
    
    return () => {
      clearInterval(interval);
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [pathname, router]);
  
  // Apply language preference on mount and listen for changes
  useEffect(() => {
    const savedLanguage = localStorage.getItem("userLanguage") || "en";
    const direction = savedLanguage === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", direction);
    document.documentElement.setAttribute("lang", savedLanguage);
    
    // Listen for language changes
    const handleLanguageChange = () => {
      const newLanguage = localStorage.getItem("userLanguage") || "en";
      const newDirection = newLanguage === "ar" ? "rtl" : "ltr";
      document.documentElement.setAttribute("dir", newDirection);
      document.documentElement.setAttribute("lang", newLanguage);
    };
    
    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("storage", (e) => {
      if (e.key === "userLanguage") {
        handleLanguageChange();
      }
    });
    
    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);
  
  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Determine page title based on pathname with translations
  const getPageTitle = () => {
    if (pathname === "/workplace") return t("dashboard.title", "My Workspace");
    if (pathname === "/tickets") return t("tickets.title", "Tickets");
    if (pathname === "/tickets/new") return t("tickets.createTicket", "Create Ticket");
    if (pathname.startsWith("/tickets/")) return t("tickets.ticketDetails", "Ticket Details");
    if (pathname === "/forms") return t("nav.forms", "Forms");
    if (pathname.startsWith("/forms/")) return t("forms.designer", "Form Designer");
    if (pathname === "/users") return t("users.title", "User Management");
    if (pathname === "/notifications") return t("nav.notifications", "Notification Management");
    if (pathname === "/announcements") return t("nav.announcements", "Announcements");
    if (pathname === "/roles") return t("nav.roles", "Auto-Assignment Rules");
    if (pathname === "/sla") return t("nav.sla", "SLA & Escalation");
    if (pathname === "/service-catalog") return t("nav.serviceCatalog", "Service Catalog");
    if (pathname === "/events") return t("nav.events", "Event Management");
    if (pathname === "/voting") return t("voting.title", "Voting Management");
    if (pathname === "/suggestions") return t("suggestions.title", "Suggestions Management");
    if (pathname === "/translations") return t("nav.translations", "Translations");
    if (pathname === "/settings/email") return "Email Settings";
    if (pathname === "/settings/exchange") return "Exchange Integration";
    if (pathname === "/profile") return t("profile.title", "Profile");
    return "Palmware";
  };

  // Block rendering until auth is verified
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, show loading while redirect happens
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="text-center">
          <p className="text-slate-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
      
      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header 
          title={getPageTitle()} 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        <main className="flex-1 p-4 lg:p-6 xl:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="px-4 lg:px-6 xl:px-8 py-4 lg:py-5 border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
              <a href="#" className="hover:text-slate-900 transition-colors font-medium">Docs</a>
              <span className="hidden sm:inline text-slate-300">|</span>
              <a href="#" className="hover:text-slate-900 transition-colors font-medium">FAQ</a>
              <span className="hidden sm:inline text-slate-300">|</span>
              <a href="mailto:Support@palmware.com.sa" className="hidden md:inline hover:text-slate-900 transition-colors">Support@palmware.com.sa</a>
              <span className="hidden md:inline text-slate-300">|</span>
              <span className="hidden md:inline">00966-0198765432</span>
            </div>
            <div className="text-center sm:text-right">
              © <span className="text-indigo-600 font-semibold">Palmware Solutions</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
