"use client";

import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
    if (pathname === "/dashboard") return t("dashboard.title", "My Workspace");
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
    if (pathname === "/profile") return t("profile.title", "Profile");
    return "Palmware";
  };

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
