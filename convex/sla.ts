import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Return all policies (not just enabled) for admin management
    return await ctx.db.query("slaPolicies").collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    // Get all policies for admin view
    return await ctx.db.query("slaPolicies").collect();
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

export const remove = mutation({
  args: {
    id: v.id("slaPolicies"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Escalation Rules
export const listEscalations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("escalationRules").collect();
  },
});

export const createEscalation = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    priority: v.number(),
    conditions: v.object({
      priorities: v.optional(v.array(v.string())),
      statuses: v.optional(v.array(v.string())),
      overdueBy: v.optional(v.number()),
    }),
    actions: v.object({
      notifyUsers: v.optional(v.array(v.id("users"))),
      notifyTeams: v.optional(v.array(v.id("teams"))),
      reassignTo: v.union(
        v.object({ type: v.literal("agent"), agentId: v.id("users") }),
        v.object({ type: v.literal("team"), teamId: v.id("teams") }),
        v.object({ type: v.literal("none") })
      ),
      changePriority: v.optional(v.string()),
      addComment: v.optional(v.string()),
    }),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("escalationRules", {
      name: args.name,
      description: args.description ?? null,
      isActive: args.isActive,
      priority: args.priority,
      conditions: args.conditions,
      actions: args.actions,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEscalation = mutation({
  args: {
    id: v.id("escalationRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    conditions: v.optional(v.object({
      priorities: v.optional(v.array(v.string())),
      statuses: v.optional(v.array(v.string())),
      overdueBy: v.optional(v.number()),
    })),
    actions: v.optional(v.object({
      notifyUsers: v.optional(v.array(v.id("users"))),
      notifyTeams: v.optional(v.array(v.id("teams"))),
      reassignTo: v.optional(v.union(
        v.object({ type: v.literal("agent"), agentId: v.id("users") }),
        v.object({ type: v.literal("team"), teamId: v.id("teams") }),
        v.object({ type: v.literal("none") })
      )),
      changePriority: v.optional(v.string()),
      addComment: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Get existing rule to merge nested objects properly
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Escalation rule not found");
    }
    
    // Build the patch object, merging nested objects
    const patch: any = {
      updatedAt: Date.now(),
    };
    
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    
    // Merge conditions if provided
    if (updates.conditions !== undefined) {
      patch.conditions = {
        priorities: updates.conditions.priorities ?? existing.conditions.priorities ?? undefined,
        statuses: updates.conditions.statuses ?? existing.conditions.statuses ?? undefined,
        overdueBy: updates.conditions.overdueBy ?? existing.conditions.overdueBy ?? undefined,
      };
    }
    
    // Merge actions if provided, ensuring reassignTo is always present
    if (updates.actions !== undefined) {
      patch.actions = {
        notifyUsers: updates.actions.notifyUsers ?? existing.actions.notifyUsers ?? undefined,
        notifyTeams: updates.actions.notifyTeams ?? existing.actions.notifyTeams ?? undefined,
        reassignTo: updates.actions.reassignTo ?? existing.actions.reassignTo,
        changePriority: updates.actions.changePriority ?? existing.actions.changePriority ?? undefined,
        addComment: updates.actions.addComment ?? existing.actions.addComment ?? undefined,
      };
    }
    
    await ctx.db.patch(id, patch);
  },
});

export const removeEscalation = mutation({
  args: {
    id: v.id("escalationRules"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggleEscalationActive = mutation({
  args: {
    id: v.id("escalationRules"),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.id);
    if (!rule) {
      throw new Error("Escalation rule not found");
    }
    await ctx.db.patch(args.id, {
      isActive: !rule.isActive,
      updatedAt: Date.now(),
    });
  },
});
