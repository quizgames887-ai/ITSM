"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";

// Service icons for the grid
const services = [
  { name: "IT Support", icon: "💻", rating: 4.4, color: "bg-blue-100" },
  { name: "HR Services", icon: "👥", rating: 4.7, color: "bg-red-100" },
  { name: "Finance", icon: "📊", rating: 4.3, color: "bg-amber-100" },
  { name: "Facilities", icon: "🏢", rating: 3.8, color: "bg-green-100" },
  { name: "Security", icon: "🔐", rating: 4.2, color: "bg-purple-100" },
  { name: "Maintenance", icon: "🛠️", rating: 4.3, color: "bg-orange-100" },
  { name: "Training", icon: "📚", rating: 4.5, color: "bg-yellow-100" },
  { name: "Analytics", icon: "📈", rating: 4.3, color: "bg-cyan-100" },
];

const favoriteLinks = [
  { name: "Get Help & Support", icon: "❓", color: "text-purple-500" },
  { name: "My Requests / All Requests", icon: "💜", color: "text-purple-500" },
  { name: "Profile Settings", icon: "⚙️", color: "text-green-500" },
  { name: "Knowledge Base", icon: "📖", color: "text-blue-500" },
  { name: "Services User Guide", icon: "📋", color: "text-amber-500" },
];

const todoItems = [
  { title: "Create Services Logo", due: "Due in 2 Days", completed: false },
  { title: "Create palmware Logo", due: "Due in 3 Days", completed: false },
  { title: "Create event's for Emp", due: "Due in 3 Days", completed: false },
  { title: "Create design homepage", due: "Due in 2 Days", completed: false },
  { title: "Create ui ux dashboard", due: "Due in 3 Days", completed: false },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 lg:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 h-64 bg-slate-200 rounded-xl"></div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [votingSelection, setVotingSelection] = useState<string | null>(null);
  const [suggestionCategory, setSuggestionCategory] = useState("");
  const [suggestionText, setSuggestionText] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const role = localStorage.getItem("userRole");
    if (id) setUserId(id);
    if (role) setUserRole(role);
  }, []);

  // Admins and agents see all tickets, regular users see only their own
  const isAdminOrAgent = userRole === "admin" || userRole === "agent";
  
  const tickets = useQuery(
    api.tickets.list, 
    isAdminOrAgent 
      ? {} 
      : userId 
        ? { createdBy: userId as Id<"users"> } 
        : "skip"
  );

  // Fetch all users to get assignee names
  const users = useQuery(api.users.list, {});
  
  // Fetch latest announcement
  const announcement = useQuery(api.announcements.getLatest, {});
  
  const router = useRouter();

  if (tickets === undefined) {
    return <LoadingSkeleton />;
  }

  // Get user name by ID
  const getUserName = (assignedToId: string | null) => {
    if (!assignedToId || !users) return "Unassigned";
    const user = users.find((u) => u._id === assignedToId);
    return user?.name || "Unknown";
  };

  // Format time ago
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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-600";
      case "in_progress": return "bg-amber-100 text-amber-600";
      case "on_hold": return "bg-slate-100 text-slate-600";
      case "resolved": return "bg-green-100 text-green-600";
      case "closed": return "bg-slate-100 text-slate-500";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const recentUpdates = tickets
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)
    .map((t) => ({
      _id: t._id,
      title: t.title || "Untitled Ticket",
      ticketNumber: `#TK-${t._id.slice(-6).toUpperCase()}`,
      assignee: getUserName(t.assignedTo),
      status: t.status,
      updatedAt: t.updatedAt,
    }));

  // Calendar days
  const today = new Date();
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const calendarDays = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    calendarDays.push({
      day: days[d.getDay()],
      date: d.getDate(),
      isToday: i === 0,
    });
  }

  const events = [
    { time: "10:00 - 11:00 AM", title: "Project Estimation Meeting" },
    { time: "10:20 - 11:00 AM", title: "Project Estimation Meeting" },
    { time: "10:20 - 11:00 AM", title: "Project Estimation Meeting" },
    { time: "10:20 - 11:00 AM", title: "Project Estimation Meeting" },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Top Row - Services Grid & Announcement */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Most Services Request */}
        <div className="xl:col-span-2">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base lg:text-lg font-semibold text-slate-900">Most Services Request</h2>
                <p className="text-xs text-slate-500">Top 8 services</p>
              </div>
              <button className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
                Show More
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-4">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-3 lg:p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 ${service.color} rounded-xl flex items-center justify-center text-lg lg:text-xl mb-2 group-hover:scale-110 transition-transform`}>
                    {service.icon}
                  </div>
                  <p className="text-xs lg:text-sm font-medium text-slate-700 text-center truncate w-full">{service.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-500 text-xs">⭐</span>
                    <span className="text-xs text-slate-500">{service.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Announcement */}
        <div className="xl:col-span-1">
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 lg:p-6 h-full relative overflow-hidden min-h-[200px]">
            <div className="relative z-10">
              <span className="text-xs text-teal-200 font-medium">Announcement</span>
              {announcement ? (
                <>
                  <h3 className="text-lg lg:text-xl font-bold text-white mt-2 mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-xs lg:text-sm text-teal-100 mb-4 leading-relaxed line-clamp-3">
                    {announcement.content}
                  </p>
                  {announcement.buttonText && (
                    <button 
                      onClick={() => {
                        if (announcement.buttonLink) {
                          if (announcement.buttonLink.startsWith("http")) {
                            window.open(announcement.buttonLink, "_blank");
                          } else {
                            router.push(announcement.buttonLink);
                          }
                        }
                      }}
                      className="px-3 lg:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs lg:text-sm font-medium rounded-lg transition-colors"
                    >
                      {announcement.buttonText}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg lg:text-xl font-bold text-white mt-2 mb-2">
                    Welcome to Palmware
                  </h3>
                  <p className="text-xs lg:text-sm text-teal-100 mb-4 leading-relaxed line-clamp-3">
                    Your centralized IT Service Management platform for efficient ticket handling and support.
                  </p>
                  <Link href="/tickets">
                    <button className="px-3 lg:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs lg:text-sm font-medium rounded-lg transition-colors">
                      View Tickets
                    </button>
                  </Link>
                </>
              )}
            </div>
            {/* Decorative illustration */}
            <div className="absolute right-0 bottom-0 w-24 lg:w-32 h-24 lg:h-32 opacity-20">
              <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full transform translate-x-8 translate-y-8"></div>
            </div>
            <div className="absolute right-6 lg:right-8 top-6 lg:top-8 w-12 lg:w-16 h-12 lg:h-16 opacity-30">
              <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row - Last Update, Calendar, My Favorite */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Last Update */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">Last update</h2>
              <p className="text-xs text-slate-500">
                {isAdminOrAgent ? "All tickets" : "Your tickets"} · Top 5
              </p>
            </div>
            <Link href="/tickets" className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </Link>
          </div>
          <div className="space-y-2 lg:space-y-3">
            {recentUpdates.length > 0 ? (
              recentUpdates.map((update) => (
                <Link
                  key={update._id}
                  href={`/tickets/${update._id}`}
                  className="flex items-center justify-between p-2.5 lg:p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                    <div className={`w-7 h-7 lg:w-8 lg:h-8 ${getStatusColor(update.status)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xs lg:text-sm">🎫</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {update.title}
                      </p>
                      <p className="text-xs text-slate-500">{update.ticketNumber}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {formatTimeAgo(update.updatedAt)} · <span className="text-blue-600">{update.assignee}</span>
                      </p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))
            ) : (
              <div className="text-center py-6 lg:py-8 text-slate-500">
                <span className="text-3xl mb-2 block">🎫</span>
                <p className="text-xs lg:text-sm">No tickets yet</p>
                <Link href="/tickets/new" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                  Create your first ticket
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Calendar Events */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">
                Calendar <span className="text-slate-400 font-normal">Events</span>
              </h2>
              <p className="text-xs text-slate-500">Top 4 records</p>
            </div>
            <button className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </button>
          </div>
          
          {/* Calendar Week */}
          <div className="flex justify-between mb-4 gap-1">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-1.5 lg:p-2 rounded-lg lg:rounded-xl flex-1 ${
                  day.isToday
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                } transition-colors cursor-pointer`}
              >
                <span className="text-[10px] lg:text-xs font-medium">{day.day}</span>
                <span className={`text-sm lg:text-lg font-semibold ${day.isToday ? "text-white" : "text-slate-900"}`}>
                  {day.date}
                </span>
              </div>
            ))}
          </div>

          {/* Events List */}
          <div className="space-y-2 max-h-32 lg:max-h-40 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-[10px] lg:text-xs text-slate-500">{event.time}</p>
                  <p className="text-xs lg:text-sm text-slate-700 truncate">{event.title}</p>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700 flex-shrink-0 ml-2">View</button>
              </div>
            ))}
          </div>
        </Card>

        {/* My Favorite */}
        <Card padding="md" className="md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">My Favorite</h2>
              <p className="text-xs text-slate-500">Top 5 records</p>
            </div>
            <button className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1 lg:gap-2">
            {favoriteLinks.map((link, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 lg:p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 lg:gap-3">
                  <span className={`text-base lg:text-lg ${link.color}`}>{link.icon}</span>
                  <span className="text-xs lg:text-sm text-slate-700">{link.name}</span>
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row - Voting, Suggesting, Todo */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Voting */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold text-slate-900">Voting</h2>
            <button className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show History
            </button>
          </div>
          <p className="text-xs lg:text-sm text-slate-600 mb-4">What do you think of the new portals system?</p>
          <div className="space-y-2">
            {["Great", "Good", "Acceptable"].map((option) => (
              <button
                key={option}
                onClick={() => setVotingSelection(option)}
                className={`w-full py-2.5 lg:py-3 px-4 rounded-xl border-2 text-xs lg:text-sm font-medium transition-all ${
                  votingSelection === option
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        {/* Suggesting */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold text-slate-900">Suggesting</h2>
            <button className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show History
            </button>
          </div>
          <p className="text-xs lg:text-sm text-slate-600 mb-4">How we can improve your experience</p>
          <div className="space-y-3">
            <select
              value={suggestionCategory}
              onChange={(e) => setSuggestionCategory(e.target.value)}
              className="w-full py-2 lg:py-2.5 px-3 lg:px-4 rounded-xl border border-slate-200 text-xs lg:text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Select category</option>
              <option value="ui">UI/UX</option>
              <option value="features">Features</option>
              <option value="performance">Performance</option>
              <option value="other">Other</option>
            </select>
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="Type your suggestion here..."
              rows={3}
              className="w-full py-2 lg:py-2.5 px-3 lg:px-4 rounded-xl border border-slate-200 text-xs lg:text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
            <Button variant="gradient" className="w-full text-sm">
              Submit
            </Button>
          </div>
        </Card>

        {/* Todo */}
        <Card padding="md" className="md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">Todo</h2>
              <p className="text-xs text-slate-500">Top 5 records</p>
            </div>
            <button className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1 lg:gap-2">
            {todoItems.map((todo, index) => (
              <div
                key={index}
                className="flex items-center gap-2 lg:gap-3 p-2.5 lg:p-3 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-slate-900 truncate">{todo.title}</p>
                  <p className="text-[10px] lg:text-xs text-slate-500">{todo.due}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
