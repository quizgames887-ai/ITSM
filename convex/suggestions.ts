import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Submit a suggestion (user action)
export const submit = mutation({
  args: {
    category: v.string(),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (!args.content.trim()) {
      throw new Error("Suggestion content cannot be empty");
    }

    const now = Date.now();
    return await ctx.db.insert("suggestions", {
      category: args.category,
      content: args.content.trim(),
      status: "pending",
      createdBy: args.userId,
      reviewedBy: null,
      reviewNotes: null,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get all suggestions (admin only)
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("implemented"),
        v.literal("rejected")
      )
    ),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let suggestions;

    if (args.status) {
      suggestions = await ctx.db
        .query("suggestions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else if (args.category) {
      suggestions = await ctx.db
        .query("suggestions")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      suggestions = await ctx.db.query("suggestions").collect();
    }

    // Sort by creation date (newest first)
    return suggestions.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get suggestions by user
export const getByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const suggestions = await ctx.db
      .query("suggestions")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .collect();

    // Sort by creation date (newest first)
    return suggestions.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a single suggestion by ID
export const get = query({
  args: {
    id: v.id("suggestions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update suggestion status (admin only)
export const updateStatus = mutation({
  args: {
    id: v.id("suggestions"),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("implemented"),
      v.literal("rejected")
    ),
    reviewNotes: v.optional(v.string()),
    reviewedBy: v.id("users"), // Admin reviewing
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.reviewedBy);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update suggestion status");
    }

    const suggestion = await ctx.db.get(args.id);
    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    const updates: any = {
      status: args.status,
      reviewedBy: args.reviewedBy,
      updatedAt: Date.now(),
    };

    if (args.reviewNotes !== undefined) {
      updates.reviewNotes = args.reviewNotes;
    }

    await ctx.db.patch(args.id, updates);
  },
});

// Delete a suggestion (admin only)
export const remove = mutation({
  args: {
    id: v.id("suggestions"),
    userId: v.id("users"), // User making the delete
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can delete suggestions");
    }

    await ctx.db.delete(args.id);
  },
});

// Get statistics (admin only)
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allSuggestions = await ctx.db.query("suggestions").collect();

    const stats = {
      total: allSuggestions.length,
      pending: 0,
      reviewed: 0,
      implemented: 0,
      rejected: 0,
      byCategory: {} as Record<string, number>,
    };

    allSuggestions.forEach((suggestion) => {
      stats[suggestion.status as keyof typeof stats]++;
      stats.byCategory[suggestion.category] =
        (stats.byCategory[suggestion.category] || 0) + 1;
    });

    return stats;
  },
});
