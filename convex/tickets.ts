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

    // Notify the creator that ticket was created
    await createNotification(
      ctx,
      args.createdBy,
      "ticket_created",
      "Ticket Created",
      `Your ticket "${args.title}" has been created successfully.`,
      ticketId
    );

    // If assigned to someone, notify them
    if (args.assignedTo) {
      await createNotification(
        ctx,
        args.assignedTo,
        "ticket_assigned",
        "New Ticket Assigned",
        `You have been assigned a new ticket: "${args.title}"`,
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
