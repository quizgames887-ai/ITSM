import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let services = await ctx.db.query("serviceCatalog").collect();
    
    if (args.activeOnly) {
      services = services.filter(s => s.isActive);
    }
    
    // Sort by order, then by requestCount (descending)
    return services.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return b.requestCount - a.requestCount;
    });
  },
});

export const get = query({
  args: {
    id: v.id("serviceCatalog"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    logoId: v.optional(v.union(v.id("_storage"), v.null())),
    color: v.string(),
    rating: v.number(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    order: v.number(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("serviceCatalog", {
      name: args.name,
      icon: args.icon,
      logoId: args.logoId ?? null,
      color: args.color,
      rating: args.rating,
      description: args.description,
      isActive: args.isActive,
      order: args.order,
      requestCount: 0,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("serviceCatalog"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    logoId: v.optional(v.union(v.id("_storage"), v.null())),
    color: v.optional(v.string()),
    rating: v.optional(v.number()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const patch: any = {
      updatedAt: Date.now(),
    };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.icon !== undefined) patch.icon = updates.icon;
    if (updates.logoId !== undefined) patch.logoId = updates.logoId;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.rating !== undefined) patch.rating = updates.rating;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;
    if (updates.order !== undefined) patch.order = updates.order;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: {
    id: v.id("serviceCatalog"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggleActive = mutation({
  args: {
    id: v.id("serviceCatalog"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (!service) {
      throw new Error("Service not found");
    }
    await ctx.db.patch(args.id, {
      isActive: !service.isActive,
      updatedAt: Date.now(),
    });
  },
});

// Increment request count when a ticket is created for this service
export const incrementRequestCount = mutation({
  args: {
    serviceName: v.string(),
  },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("serviceCatalog")
      .filter((q) => q.eq(q.field("name"), args.serviceName))
      .collect();
    
    if (services.length > 0) {
      // Update the first matching service (in case of duplicates)
      await ctx.db.patch(services[0]._id, {
        requestCount: services[0].requestCount + 1,
        updatedAt: Date.now(),
      });
    }
  },
});
