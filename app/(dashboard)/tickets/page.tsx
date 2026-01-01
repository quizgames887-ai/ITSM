"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { useState } from "react";

export default function TicketsPage() {
  const tickets = useQuery(api.tickets.list, {});
  const users = useQuery(api.users.list, {});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  if (tickets === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  // Get user name by ID
  const getUserName = (userId: string | null) => {
    if (!userId || !users) return "Unassigned";
    const user = users.find((u) => u._id === userId);
    return user?.name || "Unknown";
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    return true;
  });

  // Status badge colors
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: "bg-blue-100 text-blue-700 border-blue-200",
      in_progress: "bg-amber-100 text-amber-700 border-amber-200",
      on_hold: "bg-orange-100 text-orange-700 border-orange-200",
      resolved: "bg-green-100 text-green-700 border-green-200",
      closed: "bg-slate-100 text-slate-600 border-slate-200",
    };
    const labels: Record<string, string> = {
      new: "New",
      in_progress: "In Progress",
      on_hold: "On Hold",
      resolved: "Resolved",
      closed: "Closed",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.new}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Priority badge colors
  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: "bg-slate-100 text-slate-600 border-slate-200",
      medium: "bg-blue-100 text-blue-700 border-blue-200",
      high: "bg-orange-100 text-orange-700 border-orange-200",
      critical: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${styles[priority] || styles.medium}`}>
        {priority}
      </span>
    );
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-600">
            Manage and track all your support tickets
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <div className="ml-auto text-sm text-slate-500">
          {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      {filteredTickets.length === 0 ? (
        <Card hover padding="lg">
          <EmptyState
            icon={
              <svg
                className="w-12 h-12 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            title="No tickets found"
            description="No tickets match your current filters."
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                    Assignee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/tickets/${ticket._id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {ticket.title}
                        </Link>
                        <span className="text-xs text-slate-500">
                          #TK-{ticket._id.slice(-6).toUpperCase()}
                        </span>
                        {/* Mobile badges */}
                        <div className="flex gap-2 mt-2 sm:hidden">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-600">
                        {getUserName(ticket.assignedTo)}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-slate-600 capitalize">
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-sm text-slate-500">
                        {formatDate(ticket.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/tickets/${ticket._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        View
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Table footer */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </div>
        </Card>
      )}
    </div>
  );
}
