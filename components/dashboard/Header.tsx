"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface HeaderProps {
  title?: string;
  onMenuClick: () => void;
}

export function Header({ title = "My Workspace", onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get user ID from localStorage
  useEffect(() => {
    const name = localStorage.getItem("userName");
    const id = localStorage.getItem("userId");
    const role = localStorage.getItem("userRole");
    if (name) setUserName(name);
    if (id) setUserId(id);
    if (role) setUserRole(role);
  }, []);

  // Fetch data for search
  const tickets = useQuery(
    api.tickets.list,
    userId && userRole
      ? {
          userId: userId as Id<"users">,
          userRole: userRole as "user" | "agent" | "admin",
        }
      : "skip"
  );

  const services = useQuery(api.serviceCatalog.list, { activeOnly: true });
  const knowledgeBase = useQuery(api.knowledgeBase.list, {});
  const events = useQuery(
    (api as any).events?.getAll,
    {}
  ) as any[] | undefined;

  // Fetch notifications for the current user
  const notifications = useQuery(
    api.notifications.list,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showUserMenu || showNotifications || showSearchResults) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu, showNotifications, showSearchResults]);

  // Filter search results
  const searchResults = (() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return null;

    const query = searchQuery.toLowerCase().trim();
    const results: {
      type: "ticket" | "service" | "knowledge" | "event";
      id: string;
      title: string;
      subtitle?: string;
      href: string;
    }[] = [];

    // Search tickets
    if (tickets) {
      tickets
        .filter((ticket) =>
          ticket.title?.toLowerCase().includes(query) ||
          ticket.description?.toLowerCase().includes(query) ||
          ticket.category?.toLowerCase().includes(query)
        )
        .slice(0, 3)
        .forEach((ticket) => {
          results.push({
            type: "ticket",
            id: ticket._id,
            title: ticket.title || "Untitled Ticket",
            subtitle: `Ticket #${ticket._id.slice(-6).toUpperCase()}`,
            href: `/tickets/${ticket._id}`,
          });
        });
    }

    // Search services
    if (services) {
      services
        .filter((service) =>
          service.name?.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query)
        )
        .slice(0, 3)
        .forEach((service) => {
          results.push({
            type: "service",
            id: service._id,
            title: service.name,
            subtitle: service.description,
            href: "#",
          });
        });
    }

    // Search knowledge base
    if (knowledgeBase) {
      knowledgeBase
        .filter((article) =>
          article.title?.toLowerCase().includes(query) ||
          article.content?.toLowerCase().includes(query) ||
          article.category?.toLowerCase().includes(query)
        )
        .slice(0, 3)
        .forEach((article) => {
          results.push({
            type: "knowledge",
            id: article._id,
            title: article.title,
            subtitle: article.category,
            href: "#",
          });
        });
    }

    // Search events
    if (events) {
      events
        .filter((event) =>
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query)
        )
        .slice(0, 3)
        .forEach((event) => {
          results.push({
            type: "event",
            id: event._id,
            title: event.title,
            subtitle: `${event.date} • ${event.startTime} - ${event.endTime}`,
            href: "#",
          });
        });
    }

    return results.slice(0, 8); // Limit to 8 results
  })();

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    router.push("/login");
  };

  const handleNotificationClick = async (notificationId: Id<"notifications">, ticketId: string | null) => {
    await markRead({ id: notificationId });
    setShowNotifications(false);
    if (ticketId) {
      router.push(`/tickets/${ticketId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (userId) {
      await markAllRead({ userId: userId as Id<"users"> });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ticket_created":
        return "🎫";
      case "ticket_assigned":
        return "👤";
      case "ticket_status_updated":
        return "🔄";
      case "ticket_priority_updated":
        return "⚡";
      case "ticket_comment":
        return "💬";
      default:
        return "🔔";
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Page Title */}
        <h1 className="text-base lg:text-xl font-semibold text-slate-900 truncate">{title}</h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search - Desktop */}
        <div className="relative hidden md:block" ref={searchRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length >= 2);
            }}
            onFocus={() => {
              if (searchQuery.length >= 2) {
                setShowSearchResults(true);
              }
            }}
            placeholder="Find..."
            className="w-40 lg:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults && (
            <div className="absolute right-0 mt-2 w-80 lg:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 animate-fade-in z-50 max-h-[70vh] overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Search Results ({searchResults.length})
                </h3>
              </div>
              
              <div className="overflow-y-auto flex-1 max-h-96">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => {
                    const getIcon = () => {
                      switch (result.type) {
                        case "ticket":
                          return "🎫";
                        case "service":
                          return "📋";
                        case "knowledge":
                          return "📖";
                        case "event":
                          return "📅";
                        default:
                          return "🔍";
                      }
                    };

                    return (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.href}
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery("");
                        }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <span className="text-lg flex-shrink-0">{getIcon()}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <svg
                          className="w-4 h-4 text-slate-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center">
                    <span className="text-3xl mb-2 block">🔍</span>
                    <p className="text-sm text-slate-600">No results found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try searching for tickets, services, or knowledge articles
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search - Mobile Toggle */}
        <button 
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg md:hidden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 animate-fade-in z-50 max-h-[70vh] overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="overflow-y-auto flex-1 max-h-80">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notification) => (
                    <button
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification._id, notification.ticketId)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                        !notification.read ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.read ? "font-semibold" : "font-medium"} text-slate-900 truncate`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <span className="text-3xl mb-2 block">🔔</span>
                    <p className="text-sm text-slate-600">No notifications yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      You'll see updates about your tickets here
                    </p>
                  </div>
                )}
              </div>

              {notifications && notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100">
                  <Link
                    href="/profile"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <UserAvatar
              userId={userId as Id<"users"> | null}
              name={userName || "User"}
              size="sm"
              className="rounded-xl"
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 animate-fade-in z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900 truncate">{userName || "User"}</p>
                <p className="text-xs text-slate-500">Logged in</p>
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showMobileSearch && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-slate-200 p-3 md:hidden animate-fade-in z-50">
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.length >= 2);
              }}
              onFocus={() => {
                if (searchQuery.length >= 2) {
                  setShowSearchResults(true);
                }
              }}
              placeholder="Search..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            {/* Mobile Search Results */}
            {showSearchResults && searchResults && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 max-h-[60vh] overflow-y-auto">
                <div className="px-4 py-2 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Results ({searchResults.length})
                  </h3>
                </div>
                {searchResults.length > 0 ? (
                  searchResults.map((result) => {
                    const getIcon = () => {
                      switch (result.type) {
                        case "ticket":
                          return "🎫";
                        case "service":
                          return "📋";
                        case "knowledge":
                          return "📖";
                        case "event":
                          return "📅";
                        default:
                          return "🔍";
                      }
                    };

                    return (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.href}
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery("");
                          setShowMobileSearch(false);
                        }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <span className="text-lg flex-shrink-0">{getIcon()}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-slate-600">No results found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
