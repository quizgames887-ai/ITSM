import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

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
        userId: userId as Id<"users">,
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
        const user = await ctx.db.get(userId as Id<"users">);
        if (user && "email" in user) {
          emailRecipients.push({
            email: (user as any).email,
            name: (user as any).name || "User",
          });
        }
      }
    }
    
    // Send email notifications if enabled
    if (args.sendEmail && emailRecipients.length > 0) {
      // Check if email integration is enabled
      try {
        const emailSettings = await ctx.db
          .query("emailSettings")
          .collect();
        
        const settings = emailSettings.length > 0 
          ? emailSettings.sort((a, b) => b.updatedAt - a.updatedAt)[0]
          : null;
        
        if (settings && settings.enabled && settings.smtpEnabled) {
          // Schedule email sending for each recipient
          // Use scheduler to call the email action asynchronously
          for (const recipient of emailRecipients) {
            // Format the message as HTML
            const htmlMessage = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e293b; margin-bottom: 16px;">${args.title}</h2>
                <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${args.message}</div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from ITSM System.</p>
              </div>
            `;
            
            // Schedule email to be sent
            await ctx.scheduler.runAfter(0, api.email.sendEmail, {
              to: recipient.email,
              subject: args.title,
              html: htmlMessage,
              text: args.message, // Plain text version
            });
          }
          
          console.log(`Scheduled ${emailRecipients.length} email notifications to be sent`);
        } else {
          console.log("Email integration not enabled - skipping email notifications");
        }
      } catch (error) {
        console.error("Failed to send email notifications:", error);
      }
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
