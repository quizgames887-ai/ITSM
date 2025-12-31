import { v } from "convex/values";
import { query } from "./_generated/server";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const tickets = await ctx.db.query("tickets").collect();

    const stats = {
      total: tickets.length,
      byStatus: {
        new: tickets.filter((t) => t.status === "new").length,
        in_progress: tickets.filter((t) => t.status === "in_progress").length,
        on_hold: tickets.filter((t) => t.status === "on_hold").length,
        resolved: tickets.filter((t) => t.status === "resolved").length,
        closed: tickets.filter((t) => t.status === "closed").length,
      },
      byPriority: {
        low: tickets.filter((t) => t.priority === "low").length,
        medium: tickets.filter((t) => t.priority === "medium").length,
        high: tickets.filter((t) => t.priority === "high").length,
        critical: tickets.filter((t) => t.priority === "critical").length,
      },
      byType: {
        incident: tickets.filter((t) => t.type === "incident").length,
        service_request: tickets.filter((t) => t.type === "service_request")
          .length,
        inquiry: tickets.filter((t) => t.type === "inquiry").length,
      },
      averageResolutionTime: 0,
      responseTime: 0,
    };

    // Calculate average resolution time
    const resolvedTickets = tickets.filter(
      (t) => t.resolvedAt && t.createdAt
    );
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((acc, ticket) => {
        return acc + (ticket.resolvedAt! - ticket.createdAt);
      }, 0);
      stats.averageResolutionTime = totalTime / resolvedTickets.length;
    }

    return stats;
  },
});

export const getTicketVolume = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const tickets = await ctx.db.query("tickets").collect();
    const now = Date.now();
    const daysAgo = now - days * 24 * 60 * 60 * 1000;

    const recentTickets = tickets.filter((t) => t.createdAt >= daysAgo);

    // Group by day
    const volumeByDay: Record<string, number> = {};
    recentTickets.forEach((ticket) => {
      const date = new Date(ticket.createdAt).toISOString().split("T")[0];
      volumeByDay[date] = (volumeByDay[date] || 0) + 1;
    });

    return volumeByDay;
  },
});
