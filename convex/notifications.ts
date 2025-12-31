import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    userId: v.id("users"),
    read: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notificationsQuery = ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId));

    if (args.read !== undefined) {
      notificationsQuery = ctx.db
        .query("notifications")
        .withIndex("by_userId_read", (q) =>
          q.eq("userId", args.userId).eq("read", args.read!)
        );
    }

    const notifications = await notificationsQuery.collect();
    return notifications.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    ticketId: v.optional(v.id("tickets")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      ticketId: args.ticketId ?? null,
      createdAt: now,
    });

    return notificationId;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      read: true,
    });
  },
});

export const markAllRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", args.userId).eq("read", false))
      .collect();

    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        read: true,
      });
    }
  },
});
