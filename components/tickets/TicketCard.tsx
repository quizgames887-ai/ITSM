"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";

interface TicketCardProps {
  ticket: {
    _id: Id<"tickets">;
    title: string;
    status: string;
    priority: string;
    category: string;
    createdAt: number;
  };
}

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  on_hold: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-slate-100 text-slate-800",
};

const priorityColors = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export function TicketCard({ ticket }: TicketCardProps) {
  const statusColor =
    statusColors[ticket.status as keyof typeof statusColors] ||
    "bg-slate-100 text-slate-800";
  const priorityColor =
    priorityColors[ticket.priority as keyof typeof priorityColors] ||
    "bg-slate-100 text-slate-700";

  const date = new Date(ticket.createdAt).toLocaleDateString();

  return (
    <Link href={`/tickets/${ticket._id}`}>
      <Card hover className="transition-all duration-300 cursor-pointer group">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
              {ticket.title}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusColor} transition-all`}
              >
                {ticket.status.replace("_", " ")}
              </span>
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${priorityColor}`}
              >
                {ticket.priority}
              </span>
              <span className="text-sm text-slate-600 flex items-center gap-1">
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
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {ticket.category}
              </span>
              <span className="text-sm text-slate-500 flex items-center gap-1">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {date}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"
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
          </div>
        </div>
      </Card>
    </Link>
  );
}
