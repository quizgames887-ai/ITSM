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

// Admin: List all notifications with user info
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const notifications = await ctx.db.query("notifications").collect();
    
    // Get user info for each notification
    const notificationsWithUsers = await Promise.all(
      notifications.map(async (notification) => {
        const user = await ctx.db.get(notification.userId);
        return {
          ...notification,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "Unknown",
        };
      })
    );
    
    return notificationsWithUsers.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Admin: Create broadcast notification for all users or specific users
export const createBroadcast = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    message: v.string(),
    targetUserIds: v.optional(v.array(v.id("users"))), // If empty, send to all users
    sendEmail: v.optional(v.boolean()), // Whether to send email notification
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let targetUsers: string[] = [];
    
    if (args.targetUserIds && args.targetUserIds.length > 0) {
      targetUsers = args.targetUserIds;
    } else {
      // Get all users
      const allUsers = await ctx.db.query("users").collect();
      targetUsers = allUsers.map((u) => u._id);
    }
    
    const createdIds = [];
    const emailRecipients: { email: string; name: string }[] = [];
    
    for (const userId of targetUsers) {
      const notificationId = await ctx.db.insert("notifications", {
        userId: userId as any,
        type: args.type,
        title: args.title,
        message: args.message,
        read: false,
        ticketId: null,
        createdAt: now,
      });
      createdIds.push(notificationId);
      
      // Collect email addresses if email notification is enabled
      if (args.sendEmail) {
        const user = await ctx.db.get(userId as any);
        if (user && user.email) {
          emailRecipients.push({
            email: user.email,
            name: user.name || "User",
          });
        }
      }
    }
    
    // Send email notifications if enabled
    if (args.sendEmail && emailRecipients.length > 0) {
      // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Resend, etc.)
      // Example implementation:
      // for (const recipient of emailRecipients) {
      //   await sendEmail({
      //     to: recipient.email,
      //     subject: args.title,
      //     body: args.message,
      //   });
      // }
      console.log(`Email notifications would be sent to ${emailRecipients.length} recipients`);
    }
    
    return { count: createdIds.length, ids: createdIds };
  },
});

// Admin: Delete notification
export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Admin: Delete all notifications for a user
export const removeAllForUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }
    
    return { deleted: notifications.length };
  },
});

// Get notification stats for admin dashboard
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const notifications = await ctx.db.query("notifications").collect();
    const unread = notifications.filter((n) => !n.read).length;
    const read = notifications.filter((n) => n.read).length;
    
    // Group by type
    const byType: Record<string, number> = {};
    notifications.forEach((n) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });
    
    return {
      total: notifications.length,
      unread,
      read,
      byType,
    };
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
