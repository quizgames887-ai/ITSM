"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/ui/EmptyState";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-10 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const tickets = useQuery(api.tickets.list, {});

  if (tickets === undefined) {
    return <LoadingSkeleton />;
  }

  const stats = {
    total: tickets.length,
    new: tickets.filter((t) => t.status === "new").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    critical: tickets.filter((t) => t.priority === "critical").length,
  };

  const recentTickets = tickets
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 border-blue-200",
    in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
    on_hold: "bg-orange-100 text-orange-800 border-orange-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
    closed: "bg-slate-100 text-slate-800 border-slate-200",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Overview of your ticketing system
            </p>
          </div>
          <Link href="/tickets/new" className="w-full sm:w-auto">
            <Button variant="gradient" size="lg" className="w-full sm:w-auto">
              <span className="mr-2">+</span>
              <span className="hidden sm:inline">Create New Ticket</span>
              <span className="sm:hidden">New Ticket</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatsCard title="Total Tickets" value={stats.total} />
          <StatsCard title="New" value={stats.new} color="blue" />
          <StatsCard title="In Progress" value={stats.inProgress} color="yellow" />
          <StatsCard title="Resolved" value={stats.resolved} color="green" />
          <StatsCard title="Critical" value={stats.critical} color="red" />
        </div>

        <Card hover padding="lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Recent Tickets
            </h2>
            <Link href="/tickets" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <span className="hidden sm:inline">View All →</span>
                <span className="sm:hidden">View All</span>
              </Button>
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <EmptyState
              title="No tickets yet"
              description="Get started by creating your first support ticket. Track issues, manage requests, and keep everything organized."
              action={{
                label: "Create your first ticket",
                href: "/tickets/new",
              }}
            />
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket, index) => (
                <Link
                  key={ticket._id}
                  href={`/tickets/${ticket._id}`}
                  className="block p-4 hover:bg-gradient-to-r hover:from-slate-50 hover:to-indigo-50 rounded-lg transition-all duration-200 border border-transparent hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                    <div className="flex-1 w-full">
                      <h3 className="font-semibold text-slate-900 mb-2 text-base sm:text-lg">
                        {ticket.title}
                      </h3>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${
                            statusColors[ticket.status] || statusColors.closed
                          }`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                            priorityColors[ticket.priority] || priorityColors.low
                          }`}
                        >
                          {ticket.priority}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600 flex items-center gap-1">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                          <span className="truncate max-w-[120px] sm:max-w-none">{ticket.category}</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-slate-500 flex items-center gap-1 self-start sm:self-auto">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
