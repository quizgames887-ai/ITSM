import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to normalize logoId (handle cases where it might be a stringified JSON)
function normalizeLogoId(logoId: any): Id<"_storage"> | null {
  if (!logoId) return null;
  if (typeof logoId === "string") {
    try {
      // Try to parse if it's a JSON string
      const parsed = JSON.parse(logoId);
      if (typeof parsed === "object" && parsed.storageId) {
        return parsed.storageId as Id<"_storage">;
      }
      return parsed as Id<"_storage">;
    } catch {
      // If not JSON, treat as direct storage ID
      return logoId as Id<"_storage">;
    }
  }
  return logoId as Id<"_storage">;
}

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

export const getStorageUrl = query({
  args: {
    storageId: v.union(v.id("_storage"), v.null(), v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    
    // Handle case where storageId might be a JSON string
    let actualStorageId: Id<"_storage"> | null = null;
    if (typeof args.storageId === "string") {
      try {
        // Try to parse if it's a JSON string
        const parsed = JSON.parse(args.storageId);
        if (typeof parsed === "object" && parsed.storageId) {
          actualStorageId = parsed.storageId as Id<"_storage">;
        } else if (typeof parsed === "string") {
          actualStorageId = parsed as Id<"_storage">;
        } else {
          actualStorageId = args.storageId as Id<"_storage">;
        }
      } catch {
        // If not JSON, treat as direct storage ID string
        actualStorageId = args.storageId as Id<"_storage">;
      }
    } else {
      actualStorageId = args.storageId;
    }
    
    if (!actualStorageId) return null;
    
    try {
      return await ctx.storage.getUrl(actualStorageId);
    } catch (error) {
      // If storage file doesn't exist or is invalid, return null
      console.error("Error getting storage URL:", error);
      return null;
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      return await ctx.storage.generateUploadUrl();
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      throw new Error(`Failed to generate upload URL: ${error.message || "Unknown error"}`);
    }
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    logoId: v.optional(v.union(v.id("_storage"), v.null(), v.string())),
    color: v.string(),
    rating: v.number(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    order: v.number(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedLogoId = normalizeLogoId(args.logoId);
    
    // Create a form for this service
    const formId = await ctx.db.insert("forms", {
      name: `${args.name} Form`,
      description: `Form for ${args.name} service requests`,
      createdBy: args.createdBy,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create default form fields for the service
    const defaultFields = [
      {
        fieldType: "text" as const,
        label: "Title",
        name: "title",
        placeholder: `Brief summary of your ${args.name} request`,
        required: true,
        order: 0,
      },
      {
        fieldType: "textarea" as const,
        label: "Description",
        name: "description",
        placeholder: `Provide detailed information about your ${args.name} request...`,
        required: true,
        order: 1,
      },
      {
        fieldType: "select" as const,
        label: "Priority",
        name: "priority",
        required: true,
        options: ["Low", "Medium", "High", "Critical"],
        defaultValue: "Medium",
        order: 2,
      },
      {
        fieldType: "select" as const,
        label: "Urgency",
        name: "urgency",
        required: true,
        options: ["Low", "Medium", "High"],
        defaultValue: "Medium",
        order: 3,
      },
      {
        fieldType: "date" as const,
        label: "Requested Date",
        name: "requestedDate",
        required: false,
        order: 4,
      },
    ];

    // Insert all default fields
    for (const field of defaultFields) {
      await ctx.db.insert("formFields", {
        formId,
        fieldType: field.fieldType,
        label: field.label,
        name: field.name,
        placeholder: field.placeholder ?? null,
        required: field.required ?? false,
        defaultValue: field.defaultValue ?? null,
        options: field.options ?? null,
        validation: null,
        order: field.order,
        helpText: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return await ctx.db.insert("serviceCatalog", {
      name: args.name,
      icon: args.icon,
      logoId: normalizedLogoId,
      color: args.color,
      rating: args.rating,
      description: args.description,
      isActive: args.isActive,
      order: args.order,
      requestCount: 0,
      formId: formId,
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
    logoId: v.optional(v.union(v.id("_storage"), v.null(), v.string())),
    color: v.optional(v.string()),
    rating: v.optional(v.number()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    order: v.optional(v.number()),
    formId: v.optional(v.union(v.id("forms"), v.null())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const patch: any = {
      updatedAt: Date.now(),
    };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.icon !== undefined) patch.icon = updates.icon;
    if (updates.logoId !== undefined) patch.logoId = normalizeLogoId(updates.logoId);
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.rating !== undefined) patch.rating = updates.rating;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;
    if (updates.order !== undefined) patch.order = updates.order;
    if (updates.formId !== undefined) patch.formId = updates.formId;
    await ctx.db.patch(id, patch);
  },
});

// Link a form to multiple services (update service's formId)
export const linkFormToService = mutation({
  args: {
    formId: v.id("forms"),
    serviceIds: v.array(v.id("serviceCatalog")), // Array of service IDs to link
  },
  handler: async (ctx, args) => {
    // Get all services currently linked to this form
    const servicesWithThisForm = await ctx.db
      .query("serviceCatalog")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .collect();
    
    // Unlink services that are not in the new list
    for (const service of servicesWithThisForm) {
      if (!args.serviceIds.includes(service._id)) {
        await ctx.db.patch(service._id, {
          formId: undefined,
          updatedAt: Date.now(),
        });
      }
    }
    
    // Link services that are in the new list but not currently linked
    for (const serviceId of args.serviceIds) {
      const service = await ctx.db.get(serviceId);
      if (service && service.formId !== args.formId) {
        await ctx.db.patch(serviceId, {
          formId: args.formId,
          updatedAt: Date.now(),
        });
      }
    }
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

// Migration: Add logoId field to existing documents that don't have it
export const migrateAddLogoId = mutation({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("serviceCatalog").collect();
    let updated = 0;
    
    for (const service of services) {
      // Check if logoId field is missing (undefined, not just null)
      if (!("logoId" in service)) {
        await ctx.db.patch(service._id, {
          logoId: null,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }
    
    return { updated, total: services.length };
  },
});

// Create a form for a service that doesn't have one
export const createFormForService = mutation({
  args: {
    serviceId: v.id("serviceCatalog"),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }
    
    // Check if service already has a form
    if (service.formId) {
      return service.formId;
    }
    
    const now = Date.now();
    
    // Create a form for this service
    const formId = await ctx.db.insert("forms", {
      name: `${service.name} Form`,
      description: `Form for ${service.name} service requests`,
      createdBy: args.createdBy,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create default form fields for the service
    const defaultFields = [
      {
        fieldType: "text" as const,
        label: "Title",
        name: "title",
        placeholder: `Brief summary of your ${service.name} request`,
        required: true,
        order: 0,
      },
      {
        fieldType: "textarea" as const,
        label: "Description",
        name: "description",
        placeholder: `Provide detailed information about your ${service.name} request...`,
        required: true,
        order: 1,
      },
      {
        fieldType: "select" as const,
        label: "Priority",
        name: "priority",
        required: true,
        options: ["Low", "Medium", "High", "Critical"],
        defaultValue: "Medium",
        order: 2,
      },
      {
        fieldType: "select" as const,
        label: "Urgency",
        name: "urgency",
        required: true,
        options: ["Low", "Medium", "High"],
        defaultValue: "Medium",
        order: 3,
      },
      {
        fieldType: "date" as const,
        label: "Requested Date",
        name: "requestedDate",
        required: false,
        order: 4,
      },
    ];

    // Insert all default fields
    for (const field of defaultFields) {
      await ctx.db.insert("formFields", {
        formId,
        fieldType: field.fieldType,
        label: field.label,
        name: field.name,
        placeholder: field.placeholder ?? null,
        required: field.required ?? false,
        defaultValue: field.defaultValue ?? null,
        options: field.options ?? null,
        validation: null,
        order: field.order,
        helpText: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // Update service with formId
    await ctx.db.patch(args.serviceId, {
      formId: formId,
      updatedAt: now,
    });

    return formId;
  },
});

// Favorites functionality
export const toggleFavorite = mutation({
  args: {
    userId: v.id("users"),
    serviceId: v.id("serviceCatalog"),
  },
  handler: async (ctx, args) => {
    // Check if favorite already exists
    const existing = await ctx.db
      .query("serviceFavorites")
      .withIndex("by_userId_serviceId", (q) =>
        q.eq("userId", args.userId).eq("serviceId", args.serviceId)
      )
      .first();

    if (existing) {
      // Remove favorite
      await ctx.db.delete(existing._id);
      return { isFavorite: false };
    } else {
      // Add favorite
      await ctx.db.insert("serviceFavorites", {
        userId: args.userId,
        serviceId: args.serviceId,
        createdAt: Date.now(),
      });
      return { isFavorite: true };
    }
  },
});

export const getUserFavorites = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("serviceFavorites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Get the service details for each favorite
    const favoriteServices = await Promise.all(
      favorites.map(async (fav) => {
        const service = await ctx.db.get(fav.serviceId);
        return service ? { ...service, favoritedAt: fav.createdAt } : null;
      })
    );

    return favoriteServices.filter((s) => s !== null);
  },
});

export const isFavorite = query({
  args: {
    userId: v.id("users"),
    serviceId: v.id("serviceCatalog"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("serviceFavorites")
      .withIndex("by_userId_serviceId", (q) =>
        q.eq("userId", args.userId).eq("serviceId", args.serviceId)
      )
      .first();

    return favorite !== null;
  },
});

export const getUserFavoriteIds = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("serviceFavorites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return favorites.map((fav) => fav.serviceId);
  },
});
