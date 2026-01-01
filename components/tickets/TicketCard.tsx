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
  new: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  on_hold: "bg-orange-50 text-orange-700 border-orange-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-50 text-slate-700 border-slate-200",
};

const priorityColors = {
  low: "bg-slate-50 text-slate-700 border-slate-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
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
      <Card hover variant="elevated" className="transition-all duration-300 cursor-pointer group border-l-4 border-l-transparent hover:border-l-indigo-500 relative overflow-hidden" padding="md">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/30 group-hover:via-indigo-50/20 group-hover:to-indigo-50/0 transition-all duration-300 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 relative z-10">
          <div className="flex-1 w-full min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3 sm:mb-4 group-hover:text-indigo-600 transition-all duration-200 break-words leading-tight">
              {ticket.title}
            </h3>
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusColor} transition-all uppercase tracking-wide`}
              >
                {ticket.status.replace("_", " ")}
              </span>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${priorityColor} transition-all capitalize`}
              >
                {ticket.priority}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50">
                <svg
                  className="w-3.5 h-3.5 text-slate-400"
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
                <span className="truncate max-w-[100px] sm:max-w-none font-medium">{ticket.category}</span>
              </span>
              <span className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50">
                <svg
                  className="w-3.5 h-3.5 text-slate-400"
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
                <span className="font-medium">{date}</span>
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 self-end sm:self-auto">
            <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-indigo-50 transition-colors">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
