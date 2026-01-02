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

// Process escalation rules for tickets
export const processEscalations = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const processedTickets = new Set<string>();
    
    // Get all active escalation rules, sorted by priority
    const rules = await ctx.db
      .query("escalationRules")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    
    const sortedRules = rules.sort((a, b) => a.priority - b.priority);
    
    // Get all tickets that are not resolved or closed
    const tickets = await ctx.db
      .query("tickets")
      .filter((q) => 
        q.and(
          q.neq(q.field("status"), "resolved"),
          q.neq(q.field("status"), "closed")
        )
      )
      .collect();
    
    for (const ticket of tickets) {
      // Skip if already processed by a higher priority rule
      if (processedTickets.has(ticket._id)) continue;
      
      for (const rule of sortedRules) {
        // Check if ticket matches rule conditions
        const matches = checkEscalationConditions(ticket, rule, now);
        
        if (matches) {
          // Execute escalation actions
          await executeEscalationActions(ctx, ticket, rule);
          processedTickets.add(ticket._id);
          break; // Only apply first matching rule per ticket
        }
      }
    }
    
    return { processed: processedTickets.size };
  },
});

// Helper function to check if ticket matches escalation conditions
function checkEscalationConditions(
  ticket: any,
  rule: any,
  now: number
): boolean {
  const { conditions } = rule;
  
  // Check priority match
  if (conditions.priorities && conditions.priorities.length > 0) {
    if (!conditions.priorities.includes(ticket.priority)) {
      return false;
    }
  }
  
  // Check status match
  if (conditions.statuses && conditions.statuses.length > 0) {
    if (!conditions.statuses.includes(ticket.status)) {
      return false;
    }
  }
  
  // Check overdue condition
  if (conditions.overdueBy !== undefined && conditions.overdueBy !== null) {
    if (!ticket.slaDeadline) {
      return false; // No deadline set, can't be overdue
    }
    
    const overdueBy = conditions.overdueBy * 60 * 1000; // Convert minutes to milliseconds
    const isOverdue = now > (ticket.slaDeadline + overdueBy);
    
    if (!isOverdue) {
      return false;
    }
  }
  
  return true;
}

// Helper function to execute escalation actions
async function executeEscalationActions(
  ctx: any,
  ticket: any,
  rule: any
) {
  const { actions } = rule;
  const now = Date.now();
  
  // Notify users
  if (actions.notifyUsers && actions.notifyUsers.length > 0) {
    for (const userId of actions.notifyUsers) {
      await ctx.db.insert("notifications", {
        userId,
        type: "escalation",
        title: "Ticket Escalated",
        message: `Ticket "${ticket.title}" has been escalated by rule "${rule.name}"`,
        ticketId: ticket._id,
        read: false,
        createdAt: now,
      });
    }
  }
  
  // Notify teams
  if (actions.notifyTeams && actions.notifyTeams.length > 0) {
    for (const teamId of actions.notifyTeams) {
      // Get team members
      const teamMembers = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
        .collect();
      
      for (const member of teamMembers) {
        await ctx.db.insert("notifications", {
          userId: member.userId,
          type: "escalation",
          title: "Ticket Escalated",
          message: `Ticket "${ticket.title}" has been escalated by rule "${rule.name}"`,
          ticketId: ticket._id,
          read: false,
          createdAt: now,
        });
      }
    }
  }
  
  // Reassign ticket
  if (actions.reassignTo.type !== "none") {
    let newAssignee: string | null = null;
    
    if (actions.reassignTo.type === "agent") {
      newAssignee = actions.reassignTo.agentId;
    } else if (actions.reassignTo.type === "team") {
      // Get team members and assign to first one (or implement round-robin)
      const teamMembers = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId", (q) => q.eq("teamId", actions.reassignTo.teamId))
        .collect();
      
      if (teamMembers.length > 0) {
        newAssignee = teamMembers[0].userId;
      }
    }
    
    if (newAssignee && newAssignee !== ticket.assignedTo) {
      await ctx.db.patch(ticket._id, {
        assignedTo: newAssignee,
        updatedAt: now,
      });
      
      // Create history entry
      await ctx.db.insert("ticketHistory", {
        ticketId: ticket._id,
        userId: ticket.createdBy, // System action
        action: "escalated_reassigned",
        oldValue: { assignedTo: ticket.assignedTo },
        newValue: { assignedTo: newAssignee, ruleName: rule.name },
        createdAt: now,
      });
      
      // Notify new assignee
      await ctx.db.insert("notifications", {
        userId: newAssignee,
        type: "ticket_assigned",
        title: "Ticket Reassigned via Escalation",
        message: `Ticket "${ticket.title}" has been reassigned to you due to escalation rule "${rule.name}"`,
        ticketId: ticket._id,
        read: false,
        createdAt: now,
      });
    }
  }
  
  // Change priority
  if (actions.changePriority && actions.changePriority !== ticket.priority) {
    await ctx.db.patch(ticket._id, {
      priority: actions.changePriority,
      updatedAt: now,
    });
    
    // Recalculate SLA deadline for new priority
    const policy = await ctx.db
      .query("slaPolicies")
      .withIndex("by_priority", (q) => q.eq("priority", actions.changePriority))
      .filter((q) => q.eq(q.field("enabled"), true))
      .first();
    
    if (policy) {
      const newDeadline = now + policy.resolutionTime * 60 * 1000;
      await ctx.db.patch(ticket._id, {
        slaDeadline: newDeadline,
      });
    }
    
    // Create history entry
    await ctx.db.insert("ticketHistory", {
      ticketId: ticket._id,
      userId: ticket.createdBy,
      action: "escalated_priority_changed",
      oldValue: { priority: ticket.priority },
      newValue: { priority: actions.changePriority, ruleName: rule.name },
      createdAt: now,
    });
  }
  
  // Add comment
  if (actions.addComment && actions.addComment.trim()) {
    // Find a system user or use ticket creator
    const systemUserId = ticket.createdBy;
    
    await ctx.db.insert("ticketComments", {
      ticketId: ticket._id,
      userId: systemUserId,
      content: `[Escalation: ${rule.name}] ${actions.addComment}`,
      attachmentIds: [],
      createdAt: now,
      updatedAt: now,
    });
    
    // Create history entry
    await ctx.db.insert("ticketHistory", {
      ticketId: ticket._id,
      userId: systemUserId,
      action: "escalated_comment_added",
      oldValue: null,
      newValue: { comment: actions.addComment, ruleName: rule.name },
      createdAt: now,
    });
  }
}
