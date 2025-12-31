import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByTicket = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("ticketComments")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    // Fetch user details for each comment
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
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
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const commentId = await ctx.db.insert("ticketComments", {
      ticketId: args.ticketId,
      userId: args.userId,
      content: args.content,
      attachmentIds: args.attachmentIds ?? [],
      createdAt: now,
      updatedAt: now,
    });

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
