import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get events for a specific date
export const getByDate = query({
  args: {
    date: v.string(), // YYYY-MM-DD format
    userId: v.optional(v.id("users")), // If provided, filter by user
  },
  handler: async (ctx, args) => {
    let eventsQuery = ctx.db
      .query("events")
      .withIndex("by_date", (q) => q.eq("date", args.date));

    if (args.userId) {
      // Filter by user if provided
      const allEvents = await eventsQuery.collect();
      return allEvents.filter((e) => e.createdBy === args.userId);
    }

    return await eventsQuery.collect();
  },
});

// Get all events for a date range
export const getByDateRange = query({
  args: {
    startDate: v.string(), // YYYY-MM-DD format
    endDate: v.string(), // YYYY-MM-DD format
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const allEvents = await ctx.db.query("events").collect();
    
    const filtered = allEvents.filter((event) => {
      const eventDate = event.date;
      const matchesDateRange = eventDate >= args.startDate && eventDate <= args.endDate;
      const matchesUser = !args.userId || event.createdBy === args.userId;
      return matchesDateRange && matchesUser;
    });

    // Sort by date, then by start time
    return filtered.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Get a single event by ID
export const get = query({
  args: {
    id: v.id("events"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new event (admin only)
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    date: v.string(), // YYYY-MM-DD format
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.createdBy);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role !== "admin") {
      throw new Error("Only admins can create events");
    }

    const now = Date.now();
    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      date: args.date,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing event (admin only)
export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    date: v.optional(v.string()),
    userId: v.id("users"), // User making the update
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;
    
    // Check if user is admin
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role !== "admin") {
      throw new Error("Only admins can update events");
    }

    const event = await ctx.db.get(id);
    if (!event) {
      throw new Error("Event not found");
    }

    const patch: any = {
      updatedAt: Date.now(),
    };

    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.startTime !== undefined) patch.startTime = updates.startTime;
    if (updates.endTime !== undefined) patch.endTime = updates.endTime;
    if (updates.date !== undefined) patch.date = updates.date;

    await ctx.db.patch(id, patch);
  },
});

// Delete an event (admin only)
export const remove = mutation({
  args: {
    id: v.id("events"),
    userId: v.id("users"), // User making the delete
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role !== "admin") {
      throw new Error("Only admins can delete events");
    }

    await ctx.db.delete(args.id);
  },
});

// Get events for the current user
export const getMyEvents = query({
  args: {
    userId: v.id("users"),
    date: v.optional(v.string()), // Optional date filter
  },
  handler: async (ctx, args) => {
    if (args.date) {
      const events = await ctx.db
        .query("events")
        .withIndex("by_date", (q) => q.eq("date", args.date!))
        .collect();
      return events.filter((e) => e.createdBy === args.userId);
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .collect();

    // Sort by date, then by start time
    return events.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Get all events (admin only)
export const getAll = query({
  args: {
    startDate: v.optional(v.string()), // Optional date filter
    endDate: v.optional(v.string()), // Optional date filter
  },
  handler: async (ctx, args) => {
    const allEvents = await ctx.db.query("events").collect();
    
    let filtered = allEvents;
    
    if (args.startDate && args.endDate) {
      filtered = allEvents.filter((event) => {
        return event.date >= args.startDate! && event.date <= args.endDate!;
      });
    } else if (args.startDate) {
      filtered = allEvents.filter((event) => {
        return event.date >= args.startDate!;
      });
    } else if (args.endDate) {
      filtered = allEvents.filter((event) => {
        return event.date <= args.endDate!;
      });
    }

    // Sort by date (descending), then by start time
    return filtered.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date); // Most recent first
      }
      return a.startTime.localeCompare(b.startTime);
    });
  },
});
