"use client";

import { useState, useCallback } from "react";
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
    if (pathname === "/profile") return "Profile Settings";
    return "Palmware";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
      
      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header 
          title={getPageTitle()} 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="px-4 lg:px-6 py-3 lg:py-4 border-t border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
              <span>Docs</span>
              <span className="hidden sm:inline">|</span>
              <span>FAQ</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden md:inline">Support@palmware.com.sa</span>
              <span className="hidden md:inline">|</span>
              <span className="hidden md:inline">00966-0198765432</span>
            </div>
            <div className="text-center sm:text-right">
              © <span className="text-blue-600 font-medium">Palmware Solutions</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
