"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Determine page title based on pathname
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "My Workspace";
    if (pathname === "/tickets") return "Service Catalog";
    if (pathname === "/tickets/new") return "New Request";
    if (pathname.startsWith("/tickets/")) return "Ticket Details";
    if (pathname === "/forms") return "Forms Management";
    if (pathname.startsWith("/forms/")) return "Form Designer";
    if (pathname === "/users") return "User Management";
    if (pathname === "/profile") return "Profile Settings";
    return "Palmware";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="ml-64">
        <Header title={getPageTitle()} />
        <main className="p-6">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>Docs</span>
              <span>|</span>
              <span>FAQ</span>
              <span>|</span>
              <span>Support@palmware.com.sa</span>
              <span>|</span>
              <span>00966-0198765432</span>
            </div>
            <div>
              © All Rights reserved to <span className="text-blue-600 font-medium">Palmware Solutions</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
