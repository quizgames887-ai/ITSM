"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StatsCard } from "@/components/dashboard/StatsCard";

export default function DashboardPage() {
  const tickets = useQuery(api.tickets.list, {});

  if (tickets === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Dashboard
            </h1>
            <p className="text-slate-600">
              Overview of your ticketing system
            </p>
          </div>
          <Link href="/tickets/new">
            <Button>Create New Ticket</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatsCard title="Total Tickets" value={stats.total} />
          <StatsCard title="New" value={stats.new} color="blue" />
          <StatsCard title="In Progress" value={stats.inProgress} color="yellow" />
          <StatsCard title="Resolved" value={stats.resolved} color="green" />
          <StatsCard title="Critical" value={stats.critical} color="red" />
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">
              Recent Tickets
            </h2>
            <Link href="/tickets">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No tickets yet</p>
              <Link href="/tickets/new">
                <Button>Create your first ticket</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket._id}
                  href={`/tickets/${ticket._id}`}
                  className="block p-4 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {ticket.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span>{ticket.status}</span>
                        <span>•</span>
                        <span>{ticket.priority}</span>
                        <span>•</span>
                        <span>{ticket.category}</span>
                      </div>
                    </div>
                    <span className="text-sm text-slate-500">
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
