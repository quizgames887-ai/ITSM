"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface TicketAuditProps {
  ticketId: Id<"tickets">;
}

export function TicketAudit({ ticketId }: TicketAuditProps) {
  const history = useQuery(api.audit.getTicketHistory, { ticketId });

  if (history === undefined) {
    return (
      <div className="animate-pulse space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2 pt-1">
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
      <div className="text-center py-12">
        <span className="text-4xl mb-3 block">📜</span>
        <p className="text-slate-600 text-sm">No activity history yet</p>
        <p className="text-slate-400 text-xs mt-1">Changes to this ticket will appear here</p>
      </div>
    );
  }

  const getActionInfo = (action: string) => {
    const actionMap: Record<string, { label: string; icon: React.ReactNode; bgColor: string; iconBg: string }> = {
      created: {
        label: "Created ticket",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        bgColor: "bg-green-100",
        iconBg: "text-green-600",
      },
      assigned: {
        label: "Assigned ticket",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        bgColor: "bg-blue-100",
        iconBg: "text-blue-600",
      },
      auto_assigned: {
        label: "Auto-assigned ticket",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: "bg-emerald-100",
        iconBg: "text-emerald-600",
      },
      updated_status: {
        label: "Changed status",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
        bgColor: "bg-amber-100",
        iconBg: "text-amber-600",
      },
      updated_priority: {
        label: "Changed priority",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        bgColor: "bg-orange-100",
        iconBg: "text-orange-600",
      },
      updated_urgency: {
        label: "Changed urgency",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        bgColor: "bg-red-100",
        iconBg: "text-red-600",
      },
      updated_category: {
        label: "Changed category",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
        bgColor: "bg-purple-100",
        iconBg: "text-purple-600",
      },
      updated_title: {
        label: "Updated title",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        bgColor: "bg-slate-100",
        iconBg: "text-slate-600",
      },
      updated_description: {
        label: "Updated description",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        bgColor: "bg-slate-100",
        iconBg: "text-slate-600",
      },
      updated_assignedTo: {
        label: "Reassigned ticket",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        ),
        bgColor: "bg-indigo-100",
        iconBg: "text-indigo-600",
      },
    };

    return actionMap[action] || {
      label: action.replace(/_/g, " "),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: "bg-slate-100",
      iconBg: "text-slate-500",
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
      <div className="absolute left-5 top-12 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

      <div className="space-y-1">
        {history.map((entry, index) => {
          const actionInfo = getActionInfo(entry.action);
          const isFirst = index === 0;
          
          return (
            <div 
              key={entry._id} 
              className={`relative flex gap-4 p-4 rounded-xl transition-colors hover:bg-slate-50 ${isFirst ? 'bg-slate-50/50' : ''}`}
            >
              {/* Avatar with action indicator */}
              <div className="relative flex-shrink-0">
                <UserAvatar
                  userId={entry.userId as Id<"users"> | null}
                  name={entry.userName || "Unknown"}
                  size="sm"
                  className="bg-gradient-to-br from-slate-600 to-slate-700"
                />
                {/* Action icon badge */}
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${actionInfo.bgColor} ${actionInfo.iconBg} flex items-center justify-center shadow-sm border-2 border-white`}>
                  <span className="scale-75">{actionInfo.icon}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-900 text-sm">
                      {entry.userName}
                    </span>
                    <span className="text-slate-600 text-sm ml-1.5">
                      {actionInfo.label.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatTimeAgo(entry.createdAt)}
                  </span>
                </div>

                {/* Value change details */}
                {entry.action === "auto_assigned" && entry.newValue && typeof entry.newValue === "object" ? (
                  <div className="mt-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-emerald-900">
                        <span className="font-medium">Auto-assigned to </span>
                        <span className="font-semibold">{(entry as any).assignedUserName || "Unknown User"}</span>
                        {(entry.newValue as any).ruleName && (
                          <>
                            <span className="mx-1">via rule</span>
                            <span className="font-semibold">"{(entry.newValue as any).ruleName}"</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ) : entry.action !== "created" && (entry.oldValue !== null || entry.newValue !== null) && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {entry.oldValue !== null && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium border border-red-100 line-through">
                        {formatValue(entry.oldValue)}
                      </span>
                    )}
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                      {formatValue(entry.newValue)}
                    </span>
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-2 text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
