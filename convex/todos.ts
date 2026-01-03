import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get todos for a user
export const list = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("overdue")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let todos;

    if (args.status) {
      todos = await ctx.db
        .query("todos")
        .withIndex("by_createdBy_status", (q) =>
          q.eq("createdBy", args.userId).eq("status", args.status!)
        )
        .collect();
    } else {
      todos = await ctx.db
        .query("todos")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
        .collect();
    }

    // Calculate overdue status
    const now = Date.now();
    todos = todos.map((todo) => {
      if (todo.status !== "completed" && todo.dueDate < now) {
        return { ...todo, status: "overdue" as const };
      }
      return todo;
    });

    // Sort by due date (earliest first), then by creation date
    todos.sort((a, b) => {
      if (a.dueDate !== b.dueDate) {
        return a.dueDate - b.dueDate;
      }
      return b.createdAt - a.createdAt;
    });

    // Apply limit if provided
    if (args.limit) {
      return todos.slice(0, args.limit);
    }

    return todos;
  },
});

// Get a single todo by ID
export const get = query({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new todo
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(), // Timestamp
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (!args.title.trim()) {
      throw new Error("Todo title cannot be empty");
    }

    const now = Date.now();
    const status = args.dueDate < now ? "overdue" : "pending";

    return await ctx.db.insert("todos", {
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      dueDate: args.dueDate,
      status,
      priority: args.priority,
      createdBy: args.createdBy,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a todo
export const update = mutation({
  args: {
    id: v.id("todos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("overdue")
      )
    ),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    userId: v.id("users"), // User making the update
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    // Check if user owns this todo
    if (todo.createdBy !== args.userId) {
      throw new Error("You can only update your own todos");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.description !== undefined) updates.description = args.description?.trim() || undefined;
    if (args.dueDate !== undefined) {
      updates.dueDate = args.dueDate;
      // Recalculate status based on due date
      const now = Date.now();
      if (args.dueDate < now && todo.status !== "completed") {
        updates.status = "overdue";
      } else if (args.dueDate >= now && todo.status === "overdue") {
        updates.status = "pending";
      }
    }
    if (args.status !== undefined) {
      updates.status = args.status;
      if (args.status === "completed") {
        updates.completedAt = Date.now();
      } else if (todo.status === "completed") {
        updates.completedAt = null;
      }
    }
    if (args.priority !== undefined) updates.priority = args.priority;

    await ctx.db.patch(args.id, updates);
  },
});

// Delete a todo
export const remove = mutation({
  args: {
    id: v.id("todos"),
    userId: v.id("users"), // User making the delete
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    // Check if user owns this todo
    if (todo.createdBy !== args.userId) {
      throw new Error("You can only delete your own todos");
    }

    await ctx.db.delete(args.id);
  },
});

// Toggle todo completion
export const toggleComplete = mutation({
  args: {
    id: v.id("todos"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    // Check if user owns this todo
    if (todo.createdBy !== args.userId) {
      throw new Error("You can only update your own todos");
    }

    const newStatus = todo.status === "completed" ? "pending" : "completed";
    const updates: any = {
      status: newStatus,
      updatedAt: Date.now(),
    };

    if (newStatus === "completed") {
      updates.completedAt = Date.now();
    } else {
      updates.completedAt = null;
      // Check if overdue
      if (todo.dueDate < Date.now()) {
        updates.status = "overdue";
      }
    }

    await ctx.db.patch(args.id, updates);
  },
});
