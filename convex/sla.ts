import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("slaPolicies")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();
  },
});

export const getByPriority = query({
  args: {
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("slaPolicies")
      .withIndex("by_priority", (q) => q.eq("priority", args.priority))
      .filter((q) => q.eq(q.field("enabled"), true))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    priority: v.string(),
    responseTime: v.number(),
    resolutionTime: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const policyId = await ctx.db.insert("slaPolicies", {
      name: args.name,
      priority: args.priority,
      responseTime: args.responseTime,
      resolutionTime: args.resolutionTime,
      enabled: true,
      createdAt: now,
    });

    return policyId;
  },
});

export const update = mutation({
  args: {
    id: v.id("slaPolicies"),
    name: v.optional(v.string()),
    priority: v.optional(v.string()),
    responseTime: v.optional(v.number()),
    resolutionTime: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});
