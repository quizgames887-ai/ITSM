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
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {ticket.title}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}
              >
                {ticket.status.replace("_", " ")}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityColor}`}
              >
                {ticket.priority}
              </span>
              <span className="text-sm text-slate-600">{ticket.category}</span>
              <span className="text-sm text-slate-500">{date}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
