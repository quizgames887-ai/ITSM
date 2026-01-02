"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminName, setOriginalAdminName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    userId ? { id: userId as Id<"users"> } : "skip"
  );

  useEffect(() => {
    const name = localStorage.getItem("userName");
    const role = localStorage.getItem("userRole");
    const impersonating = localStorage.getItem("isImpersonating") === "true";
    const adminName = localStorage.getItem("originalAdminName");
    
    if (name) {
      setUserName(name);
    }
    if (role) {
      setUserRole(role);
    }
    setIsImpersonating(impersonating);
    setOriginalAdminName(adminName);
  }, []);

  // Update role from database if available
  useEffect(() => {
    if (currentUser) {
      setUserRole(currentUser.role);
      localStorage.setItem("userRole", currentUser.role);
      if (currentUser.name) {
        setUserName(currentUser.name);
        localStorage.setItem("userName", currentUser.name);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    if (showUserMenu || showMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu, showMobileMenu]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("isImpersonating");
    localStorage.removeItem("originalAdminId");
    localStorage.removeItem("originalAdminName");
    localStorage.removeItem("originalAdminEmail");
    router.push("/login");
  };

  const handleExitImpersonation = () => {
    const originalAdminId = localStorage.getItem("originalAdminId");
    const originalAdminName = localStorage.getItem("originalAdminName");
    const originalAdminEmail = localStorage.getItem("originalAdminEmail");

    if (originalAdminId && originalAdminName && originalAdminEmail) {
      // Restore original admin session
      localStorage.setItem("userId", originalAdminId);
      localStorage.setItem("userName", originalAdminName);
      localStorage.setItem("userEmail", originalAdminEmail);
      
      // Clear impersonation data
      localStorage.removeItem("isImpersonating");
      localStorage.removeItem("originalAdminId");
      localStorage.removeItem("originalAdminName");
      localStorage.removeItem("originalAdminEmail");

      // Refresh the page to update all components
      window.location.href = "/users";
    }
  };

  const navItems: Array<{
    href: string;
    label: string;
    icon: string;
    adminOnly?: boolean;
  }> = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/tickets", label: "Tickets", icon: "🎫" },
    { href: "/forms", label: "Forms", icon: "📝", adminOnly: true },
    { href: "/users", label: "Users", icon: "👥", adminOnly: true },
    { href: "/events", label: "Events", icon: "📅", adminOnly: true },
    { href: "/profile", label: "Profile", icon: "👤" },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <svg
                    className="w-4 h-4 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-900">
                    Viewing as {userName}
                  </p>
                  {originalAdminName && (
                    <p className="text-xs text-amber-700">
                      Logged in as: {originalAdminName}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleExitImpersonation}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Exit Impersonation
              </button>
            </div>
          </div>
        </div>
      )}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm sticky top-0 z-40 transition-all duration-300" style={isImpersonating ? { top: '41px' } : {}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-18">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link
              href="/dashboard"
              className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105 inline-block"
            >
              <span className="hidden sm:inline">Palmware</span>
              <span className="sm:hidden">PW</span>
            </Link>
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                // Hide admin-only items if user is not admin
                if (item.adminOnly && userRole !== "admin") {
                  return null;
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2.5 ${
                      pathname === item.href
                        ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              }).filter(Boolean)}
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-50 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {showMobileMenu ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {userName && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shadow-md">
                    {getInitials(userName)}
                  </div>
                  <span className="hidden lg:block text-sm font-medium text-slate-700">
                    {userName}
                  </span>
                  <svg
                    className={`hidden sm:block w-4 h-4 text-slate-500 transition-transform ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 animate-fade-in z-50 backdrop-blur-sm">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      View Profile
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-lg mx-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
            {!userName && (
              <Button variant="outline" onClick={handleLogout} size="sm" className="text-xs sm:text-sm">
                Logout
              </Button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-t border-slate-200 py-4 animate-fade-in"
          >
            <div className="space-y-1">
              {navItems.map((item) => {
                // Hide admin-only items if user is not admin
                if (item.adminOnly && userRole !== "admin") {
                  return null;
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                      pathname === item.href
                        ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
}
