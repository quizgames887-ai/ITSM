import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to create notification
async function createNotification(
  ctx: any,
  userId: Id<"users">,
  type: string,
  title: string,
  message: string,
  ticketId?: Id<"tickets">
) {
  await ctx.db.insert("notifications", {
    userId,
    type,
    title,
    message,
    read: false,
    ticketId: ticketId ?? null,
    createdAt: Date.now(),
  });
}

export const listByTicket = query({
  args: { 
    ticketId: v.id("tickets"),
    userId: v.optional(v.id("users")), // Current user ID to check role
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("ticketComments")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    // Get current user role if userId provided
    let userRole: "user" | "agent" | "admin" | null = null;
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      userRole = user?.role ?? null;
    }

    // Filter comments based on visibility and user role
    // Internal comments: only visible to agents and admins
    // External comments: visible to everyone
    const filteredComments = comments.filter((comment) => {
      if (comment.visibility === "external") {
        return true; // External comments visible to all
      }
      // Internal comments only visible to agents and admins
      return userRole === "agent" || userRole === "admin";
    });

    // Fetch user details for each comment
    const commentsWithUsers = await Promise.all(
      filteredComments.map(async (comment) => {
        try {
          const user = await ctx.db.get(comment.userId);
          return {
            ...comment,
            userName: user?.name ?? "Unknown User",
            userEmail: user?.email ?? "",
          };
        } catch (error) {
          return {
            ...comment,
            userName: "Unknown User",
            userEmail: "",
          };
        }
      })
    );

    return commentsWithUsers.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const create = mutation({
  args: {
    ticketId: v.id("tickets"),
    userId: v.id("users"),
    content: v.string(),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
    visibility: v.optional(v.union(v.literal("internal"), v.literal("external"))), // internal or external, defaults to external
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const now = Date.now();
    // Default to external if visibility not provided (for backward compatibility)
    const visibility = args.visibility ?? "external";
    
    const commentId = await ctx.db.insert("ticketComments", {
      ticketId: args.ticketId,
      userId: args.userId,
      content: args.content,
      attachmentIds: args.attachmentIds ?? [],
      visibility: visibility,
      createdAt: now,
      updatedAt: now,
    });

    // Only notify for external comments (internal comments are private)
    if (visibility === "external") {
      // Notify ticket creator if commenter is different
      if (ticket.createdBy !== args.userId) {
        await createNotification(
          ctx,
          ticket.createdBy,
          "ticket_comment",
          "New Comment on Your Ticket",
          `${user.name} commented on "${ticket.title}": "${args.content.substring(0, 50)}${args.content.length > 50 ? "..." : ""}"`,
          args.ticketId
        );
      }

      // Notify assignee if different from commenter and creator
      if (ticket.assignedTo && ticket.assignedTo !== args.userId && ticket.assignedTo !== ticket.createdBy) {
        await createNotification(
          ctx,
          ticket.assignedTo,
          "ticket_comment",
          "New Comment on Assigned Ticket",
          `${user.name} commented on "${ticket.title}": "${args.content.substring(0, 50)}${args.content.length > 50 ? "..." : ""}"`,
          args.ticketId
        );
      }
    }

    return commentId;
  },
});

export const update = mutation({
  args: {
    id: v.id("ticketComments"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== args.userId) {
      throw new Error("Not authorized to update this comment");
    }

    await ctx.db.patch(args.id, {
      content: args.content,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
