import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("in_progress"),
        v.literal("on_hold"),
        v.literal("resolved"),
        v.literal("closed")
      )
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))
    ),
    category: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get all tickets and filter in memory for flexibility
    const allTickets = await ctx.db.query("tickets").collect();

    // Apply filters
    let filtered = allTickets;
    if (args.status) {
      filtered = filtered.filter((t) => t.status === args.status);
    }
    if (args.priority) {
      filtered = filtered.filter((t) => t.priority === args.priority);
    }
    if (args.category) {
      filtered = filtered.filter((t) => t.category === args.category);
    }
    if (args.assignedTo) {
      filtered = filtered.filter((t) => t.assignedTo === args.assignedTo);
    }
    if (args.createdBy) {
      filtered = filtered.filter((t) => t.createdBy === args.createdBy);
    }

    // Sort by createdAt descending
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("tickets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("incident"),
      v.literal("service_request"),
      v.literal("inquiry")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.string(),
    createdBy: v.id("users"),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ticketId = await ctx.db.insert("tickets", {
      title: args.title,
      description: args.description,
      type: args.type,
      status: "new",
      priority: args.priority,
      urgency: args.urgency,
      category: args.category,
      createdBy: args.createdBy,
      assignedTo: args.assignedTo ?? null,
      slaDeadline: null,
      resolvedAt: null,
      aiCategorySuggestion: null,
      aiPrioritySuggestion: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create history entry
    await ctx.db.insert("ticketHistory", {
      ticketId,
      userId: args.createdBy,
      action: "created",
      oldValue: null,
      newValue: { status: "new" },
      createdAt: now,
    });

    return ticketId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tickets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("in_progress"),
        v.literal("on_hold"),
        v.literal("resolved"),
        v.literal("closed")
      )
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))
    ),
    urgency: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    category: v.optional(v.string()),
    assignedTo: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const { id, ...updates } = args;
    const now = Date.now();

    // Track changes for history
    const changes: Record<string, { old: any; new: any }> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && (ticket as any)[key] !== value) {
        changes[key] = {
          old: (ticket as any)[key],
          new: value,
        };
      }
    }

    // Update ticket
    const updatedTicket = {
      ...updates,
      updatedAt: now,
      resolvedAt:
        updates.status === "resolved" || updates.status === "closed"
          ? now
          : ticket.resolvedAt,
    };

    await ctx.db.patch(id, updatedTicket);

    // Create history entries (using ticket creator for now)
    // Will be enhanced with proper user tracking later
    for (const [action, change] of Object.entries(changes)) {
      await ctx.db.insert("ticketHistory", {
        ticketId: id,
        userId: ticket.createdBy,
        action: `updated_${action}`,
        oldValue: change.old,
        newValue: change.new,
        createdAt: now,
      });
    }

    return id;
  },
});

export const assign = mutation({
  args: {
    id: v.id("tickets"),
    assignedTo: v.id("users"),
    userId: v.id("users"), // User making the assignment
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      assignedTo: args.assignedTo,
      updatedAt: now,
    });

    await ctx.db.insert("ticketHistory", {
      ticketId: args.id,
      userId: args.userId,
      action: "assigned",
      oldValue: ticket.assignedTo,
      newValue: args.assignedTo,
      createdAt: now,
    });

    return args.id;
  },
});
