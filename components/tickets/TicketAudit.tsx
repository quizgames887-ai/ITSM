"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface TicketAuditProps {
  ticketId: Id<"tickets">;
}

export function TicketAudit({ ticketId }: TicketAuditProps) {
  const history = useQuery(api.audit.getTicketHistory, { ticketId });

  if (history === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-3 h-3 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-slate-500 text-center py-8">No audit history available.</p>
    );
  }

  const getActionInfo = (action: string) => {
    const actionMap: Record<string, { label: string; icon: string; color: string }> = {
      created: {
        label: "Created ticket",
        icon: "✨",
        color: "bg-green-500",
      },
      assigned: {
        label: "Assigned ticket",
        icon: "👤",
        color: "bg-blue-500",
      },
      updated_status: {
        label: "Changed status",
        icon: "🔄",
        color: "bg-yellow-500",
      },
      updated_priority: {
        label: "Changed priority",
        icon: "⚡",
        color: "bg-orange-500",
      },
      updated_urgency: {
        label: "Changed urgency",
        icon: "🚨",
        color: "bg-red-500",
      },
      updated_category: {
        label: "Changed category",
        icon: "📁",
        color: "bg-purple-500",
      },
      updated_title: {
        label: "Updated title",
        icon: "✏️",
        color: "bg-slate-500",
      },
      updated_description: {
        label: "Updated description",
        icon: "📝",
        color: "bg-slate-500",
      },
      updated_assignedTo: {
        label: "Reassigned ticket",
        icon: "🔀",
        color: "bg-blue-500",
      },
    };

    return actionMap[action] || {
      label: action.replace(/_/g, " "),
      icon: "📋",
      color: "bg-slate-400",
    };
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "None";
    }
    if (typeof value === "object") {
      if (value.status) return value.status.replace(/_/g, " ");
      return JSON.stringify(value);
    }
    if (typeof value === "string") {
      return value.replace(/_/g, " ");
    }
    return String(value);
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-slate-200" />

      <div className="space-y-6">
        {history.map((entry, index) => {
          const actionInfo = getActionInfo(entry.action);
          
          return (
            <div key={entry._id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={`relative z-10 w-4 h-4 rounded-full ${actionInfo.color} flex items-center justify-center shadow-sm`}
              >
                <span className="text-[8px]">{actionInfo.icon}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">
                    {entry.userName}
                  </span>
                  <span className="text-slate-600">{actionInfo.label}</span>
                  <span className="text-slate-400 text-sm">
                    {formatTimeAgo(entry.createdAt)}
                  </span>
                </div>

                {/* Value change details */}
                {entry.action !== "created" && (entry.oldValue !== null || entry.newValue !== null) && (
                  <div className="mt-2 text-sm bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.oldValue !== null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 line-through">
                          {formatValue(entry.oldValue)}
                        </span>
                      )}
                      <span className="text-slate-400">→</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium">
                        {formatValue(entry.newValue)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Timestamp details */}
                <div className="mt-1 text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
