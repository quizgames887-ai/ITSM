"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const navItems = [
    {
      href: "/dashboard",
      label: "Workspace",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      href: "/tickets",
      label: "Service Catalog",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      href: "/tickets/new",
      label: "My Request",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  const adminItems = [
    {
      href: "/forms",
      label: "Forms",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      href: "/users",
      label: "Users",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-base lg:text-lg font-bold text-slate-900">Palmware</span>
              <span className="block text-xs text-slate-500">Solutions</span>
            </div>
          </Link>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={isActive ? "text-blue-600" : "text-slate-400"}>
                  {item.icon}
                </span>
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                )}
              </Link>
            );
          })}

          {/* Admin Section */}
          {userRole === "admin" && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 lg:px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Admin
                </p>
              </div>
              {adminItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className={isActive ? "text-blue-600" : "text-slate-400"}>
                      {item.icon}
                    </span>
                    {item.label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 lg:p-4 border-t border-slate-100">
          <div className="px-3 lg:px-4 py-2.5 lg:py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <p className="text-xs font-medium text-blue-900">Need Help?</p>
            <p className="text-xs text-blue-600 mt-0.5">Contact support</p>
          </div>
        </div>
      </aside>
    </>
  );
}
