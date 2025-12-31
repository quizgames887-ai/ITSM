import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getCurrentUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Convert string ID to Id<"users">
    const userId = args.userId as any;
    return await ctx.db.get(userId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db.query("users").collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("user"), v.literal("admin"), v.literal("agent"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const { id, ...updates } = args;
    
    // If email is being updated, check if it's already taken
    if (updates.email) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updates.email!))
        .first();
      
      if (existingUser && existingUser._id !== id) {
        throw new Error("Email already in use");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
