import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getTicketHistory = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    try {
      // First verify the ticket exists
      const ticket = await ctx.db.get(args.ticketId);
      if (!ticket) {
        return [];
      }

      // Use the index to query only history for this ticket (much more efficient)
      const history = await ctx.db
        .query("ticketHistory")
        .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
        .collect();

      if (history.length === 0) {
        return [];
      }

      // Fetch user details for each history entry
      const results = await Promise.all(
        history.map(async (entry) => {
          try {
            const user = await ctx.db.get(entry.userId);
            return {
              _id: entry._id,
              ticketId: entry.ticketId,
              userId: entry.userId,
              action: entry.action,
              oldValue: entry.oldValue ?? null,
              newValue: entry.newValue ?? null,
              createdAt: entry.createdAt,
              userName: user?.name ?? "Unknown User",
              userEmail: user?.email ?? "",
            };
          } catch (error) {
            // Handle case where userId might be invalid
            return {
              _id: entry._id,
              ticketId: entry.ticketId,
              userId: entry.userId,
              action: entry.action,
              oldValue: entry.oldValue ?? null,
              newValue: entry.newValue ?? null,
              createdAt: entry.createdAt,
              userName: "Unknown User",
              userEmail: "",
            };
          }
        })
      );

      // Sort by createdAt descending (newest first)
      return results.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Error in getTicketHistory:", error);
      // Return empty array on error instead of throwing
      return [];
    }
  },
});

export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit ?? 50;

      // Get all history entries and sort by createdAt
      const allHistory = await ctx.db.query("ticketHistory").collect();

      // Sort by createdAt descending and limit
      const recentHistory = allHistory
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);

      // Fetch user and ticket details
      const historyWithDetails = await Promise.all(
        recentHistory.map(async (entry) => {
          try {
            const [user, ticket] = await Promise.all([
              ctx.db.get(entry.userId),
              ctx.db.get(entry.ticketId),
            ]);
            return {
              ...entry,
              userName: user?.name ?? "Unknown User",
              userEmail: user?.email ?? "",
              ticketTitle: ticket?.title ?? "Deleted Ticket",
            };
          } catch (error) {
            return {
              ...entry,
              userName: "Unknown User",
              userEmail: "",
              ticketTitle: "Deleted Ticket",
            };
          }
        })
      );

      return historyWithDetails;
    } catch (error) {
      console.error("Error in getRecentActivity:", error);
      return [];
    }
  },
});

export const getAuditStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const days = args.days ?? 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      const allHistory = await ctx.db.query("ticketHistory").collect();
      const recentHistory = allHistory.filter((h) => h.createdAt >= cutoff);

      // Count by action type
      const actionCounts: Record<string, number> = {};
      for (const entry of recentHistory) {
        actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      }

      // Count by user
      const userCounts: Record<string, number> = {};
      for (const entry of recentHistory) {
        const key = entry.userId.toString();
        userCounts[key] = (userCounts[key] || 0) + 1;
      }

      // Get top users
      const topUserIds = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      const topUsers = await Promise.all(
        topUserIds.map(async ([userId, count]) => {
          try {
            const user = await ctx.db.get(userId as Id<"users">);
            return {
              userId,
              name: user?.name ?? "Unknown User",
              count,
            };
          } catch (error) {
            return {
              userId,
              name: "Unknown User",
              count,
            };
          }
        })
      );

      return {
        totalActions: recentHistory.length,
        actionCounts,
        topUsers,
        periodDays: days,
      };
    } catch (error) {
      console.error("Error in getAuditStats:", error);
      return {
        totalActions: 0,
        actionCounts: {},
        topUsers: [],
        periodDays: args.days ?? 30,
      };
    }
  },
});
