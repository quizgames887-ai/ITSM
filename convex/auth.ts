import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // For now, return null - will be enhanced with proper auth later
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   return null;
    // }
    // const user = await ctx.db
    //   .query("users")
    //   .withIndex("by_email", (q) => q.eq("email", identity.email!))
    //   .first();
    // return user;
    return null;
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("agent")),
    workplace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For now, allow user creation without auth check
    // Will be enhanced with proper auth later
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role,
      onboardingCompleted: false,
      profilePictureId: null,
      language: undefined,
      workplace: args.workplace || undefined,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

export const updateOnboardingStatus = mutation({
  args: {
    userId: v.id("users"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      onboardingCompleted: args.completed,
      updatedAt: Date.now(),
    });
  },
});

export const updateLastSession = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      lastSessionAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
