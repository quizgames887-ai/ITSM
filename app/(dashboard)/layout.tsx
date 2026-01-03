"use client";

import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Apply language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("userLanguage") || "en";
    const direction = savedLanguage === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", direction);
    document.documentElement.setAttribute("lang", savedLanguage);
  }, []);
  
  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Determine page title based on pathname
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "My Workspace";
    if (pathname === "/tickets") return "Service Catalog";
    if (pathname === "/tickets/new") return "New Request";
    if (pathname.startsWith("/tickets/")) return "Ticket Details";
    if (pathname === "/forms") return "Forms Management";
    if (pathname.startsWith("/forms/")) return "Form Designer";
    if (pathname === "/users") return "User Management";
    if (pathname === "/notifications") return "Notification Management";
    if (pathname === "/announcements") return "Announcements";
    if (pathname === "/roles") return "Auto-Assignment Rules";
    if (pathname === "/sla") return "SLA & Escalation";
    if (pathname === "/service-catalog") return "Service Catalog";
    if (pathname === "/events") return "Event Management";
    if (pathname === "/voting") return "Voting Management";
    if (pathname === "/suggestions") return "Suggestions Management";
    if (pathname === "/profile") return "Profile Settings";
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
