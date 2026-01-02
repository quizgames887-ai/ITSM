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

// Helper function to find matching assignment rule and get assignee
async function findAssigneeFromRules(
  ctx: any,
  category: string,
  priority: string,
  type: string
): Promise<{ assigneeId: Id<"users">; ruleName: string } | null> {
  // Get all active rules sorted by priority
  const rules = await ctx.db
    .query("assignmentRules")
    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
    .collect();

  const sortedRules = rules.sort((a: any, b: any) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const { conditions } = rule;
    
    // Check if ALL specified conditions match (AND logic between condition types)
    // Within each condition type, it's OR logic (e.g., category can be "IT Support" OR "HR")
    
    const categories = conditions.categories || [];
    const priorities = conditions.priorities || [];
    const types = conditions.types || [];
    
    // If a condition is specified, ticket must match at least one value in that condition
    const categoryMatches = categories.length === 0 || categories.includes(category);
    const priorityMatches = priorities.length === 0 || priorities.includes(priority);
    const typeMatches = types.length === 0 || types.includes(type);
    
    // ALL specified conditions must match
    const matches = categoryMatches && priorityMatches && typeMatches;

    if (matches) {
      // Determine assignee based on rule type
      if (rule.assignTo.type === "agent") {
        return {
          assigneeId: rule.assignTo.agentId,
          ruleName: rule.name,
        };
      } else if (rule.assignTo.type === "team") {
        // Assign to team leader if exists, otherwise first member
        const teamId = rule.assignTo.teamId;
        const team = await ctx.db.get(teamId);
        if (team?.leaderId) {
          return {
            assigneeId: team.leaderId,
            ruleName: rule.name,
          };
        }

        const member = await ctx.db
          .query("teamMembers")
          .withIndex("by_teamId", (q: any) => q.eq("teamId", teamId))
          .first();

        if (member) {
          return {
            assigneeId: member.userId,
            ruleName: rule.name,
          };
        }
      } else if (rule.assignTo.type === "round_robin") {
        // Get team members and find the one with least tickets
        const teamId = rule.assignTo.teamId;
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_teamId", (q: any) => q.eq("teamId", teamId))
          .collect();

        if (members.length === 0) continue;

        // Count open tickets for each member
        const memberTicketCounts = await Promise.all(
          members.map(async (member: any) => {
            const tickets = await ctx.db
              .query("tickets")
              .withIndex("by_assignedTo", (q: any) => q.eq("assignedTo", member.userId))
              .collect();

            const openTickets = tickets.filter(
              (t: any) => !["resolved", "closed"].includes(t.status)
            );

            return {
              userId: member.userId,
              ticketCount: openTickets.length,
            };
          })
        );

        // Find member with least tickets
        const leastBusy = memberTicketCounts.reduce((min: any, curr: any) =>
          curr.ticketCount < min.ticketCount ? curr : min
        );

        return {
          assigneeId: leastBusy.userId,
          ruleName: rule.name,
        };
      }
    }
  }

  return null; // No matching rule found
}

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
    // Role-based filtering parameters
    userId: v.optional(v.id("users")),
    userRole: v.optional(v.union(v.literal("user"), v.literal("agent"), v.literal("admin"))),
  },
  handler: async (ctx, args) => {
    // Get all tickets and filter in memory for flexibility
    let allTickets = await ctx.db.query("tickets").collect();

    // Apply role-based filtering first
    if (args.userId && args.userRole) {
      if (args.userRole === "admin") {
        // Admin sees all tickets - no filtering needed
        // allTickets remains unchanged
      } else if (args.userRole === "agent") {
        // Agent sees tickets they created OR tickets assigned to them
        allTickets = allTickets.filter(
          (t) => t.createdBy === args.userId || t.assignedTo === args.userId
        );
      } else if (args.userRole === "user") {
        // User sees only tickets they created
        allTickets = allTickets.filter((t) => t.createdBy === args.userId);
      }
    }

    // Apply additional filters
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

    // Find auto-assignee from rules if not manually assigned
    let assignedTo = args.assignedTo ?? null;
    let autoAssignRuleName: string | null = null;

    if (!assignedTo) {
      const autoAssignment = await findAssigneeFromRules(
        ctx,
        args.category,
        args.priority,
        args.type
      );

      if (autoAssignment) {
        assignedTo = autoAssignment.assigneeId;
        autoAssignRuleName = autoAssignment.ruleName;
      }
    }

    const ticketId = await ctx.db.insert("tickets", {
      title: args.title,
      description: args.description,
      type: args.type,
      status: "new",
      priority: args.priority,
      urgency: args.urgency,
      category: args.category,
      createdBy: args.createdBy,
      assignedTo: assignedTo,
      slaDeadline: null,
      resolvedAt: null,
      aiCategorySuggestion: null,
      aiPrioritySuggestion: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create history entry for ticket creation
    await ctx.db.insert("ticketHistory", {
      ticketId,
      userId: args.createdBy,
      action: "created",
      oldValue: null,
      newValue: { status: "new" },
      createdAt: now,
    });

    // Create history entry for auto-assignment if applicable
    if (assignedTo && autoAssignRuleName) {
      await ctx.db.insert("ticketHistory", {
        ticketId,
        userId: args.createdBy,
        action: "auto_assigned",
        oldValue: null,
        newValue: { assignedTo, ruleName: autoAssignRuleName },
        createdAt: now + 1, // Slightly after creation
      });
    }

    // Notify the creator that ticket was created
    await createNotification(
      ctx,
      args.createdBy,
      "ticket_created",
      "Ticket Created",
      `Your ticket "${args.title}" has been created successfully.${assignedTo ? " An agent has been automatically assigned." : ""}`,
      ticketId
    );

    // If assigned to someone (manual or auto), notify them
    if (assignedTo) {
      const assignmentType = autoAssignRuleName ? "auto-assigned" : "assigned";
      await createNotification(
        ctx,
        assignedTo,
        "ticket_assigned",
        "New Ticket Assigned",
        `You have been ${assignmentType} a new ticket: "${args.title}"${autoAssignRuleName ? ` (Rule: ${autoAssignRuleName})` : ""}`,
        ticketId
      );
    }

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

    // Notify users about ticket updates
    const usersToNotify = new Set<string>();
    usersToNotify.add(ticket.createdBy);
    if (ticket.assignedTo) {
      usersToNotify.add(ticket.assignedTo);
    }

    // Status change notification
    if (changes.status) {
      const statusMessage = getStatusMessage(changes.status.new);
      for (const userId of usersToNotify) {
        await createNotification(
          ctx,
          userId as Id<"users">,
          "ticket_status_updated",
          "Ticket Status Updated",
          `Ticket "${ticket.title}" ${statusMessage}`,
          id
        );
      }
    }

    // Priority change notification
    if (changes.priority) {
      for (const userId of usersToNotify) {
        await createNotification(
          ctx,
          userId as Id<"users">,
          "ticket_priority_updated",
          "Ticket Priority Changed",
          `Ticket "${ticket.title}" priority changed from ${changes.priority.old} to ${changes.priority.new}`,
          id
        );
      }
    }

    // Assignment change notification
    if (changes.assignedTo && updates.assignedTo) {
      await createNotification(
        ctx,
        updates.assignedTo as Id<"users">,
        "ticket_assigned",
        "Ticket Assigned to You",
        `You have been assigned to ticket: "${ticket.title}"`,
        id
      );
    }

    return id;
  },
});

// Helper function to get status message
function getStatusMessage(status: string): string {
  switch (status) {
    case "new":
      return "has been set to New";
    case "in_progress":
      return "is now In Progress";
    case "on_hold":
      return "has been put On Hold";
    case "resolved":
      return "has been Resolved";
    case "closed":
      return "has been Closed";
    default:
      return `status changed to ${status}`;
  }
}

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

    // Notify the new assignee
    await createNotification(
      ctx,
      args.assignedTo,
      "ticket_assigned",
      "Ticket Assigned to You",
      `You have been assigned to ticket: "${ticket.title}"`,
      args.id
    );

    // Notify the ticket creator
    if (ticket.createdBy !== args.assignedTo) {
      const assignee = await ctx.db.get(args.assignedTo);
      await createNotification(
        ctx,
        ticket.createdBy,
        "ticket_assignment_updated",
        "Ticket Assignment Updated",
        `Your ticket "${ticket.title}" has been assigned to ${assignee?.name || "an agent"}`,
        args.id
      );
    }

    return args.id;
  },
});
