import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// List all announcements (admin)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const announcements = await ctx.db
      .query("announcements")
      .collect();
    
    // Enrich with creator info
    const enriched = await Promise.all(
      announcements.map(async (announcement) => {
        const creator = await ctx.db.get(announcement.createdBy);
        return {
          ...announcement,
          creatorName: creator?.name || "Unknown",
        };
      })
    );
    
    return enriched.sort((a, b) => b.priority - a.priority);
  },
});

// Get active announcements for display
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    
    // Filter out expired announcements
    const active = announcements.filter((a) => {
      if (a.expiresAt && a.expiresAt < now) return false;
      return true;
    });
    
    // Sort by priority (highest first)
    return active.sort((a, b) => b.priority - a.priority);
  },
});

// Get latest active announcement for dashboard
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    
    // Filter out expired and sort by priority
    const active = announcements
      .filter((a) => !a.expiresAt || a.expiresAt >= now)
      .sort((a, b) => b.priority - a.priority);
    
    return active[0] || null;
  },
});

// Get single announcement
export const get = query({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create announcement
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    buttonText: v.optional(v.string()),
    buttonLink: v.optional(v.string()),
    isActive: v.boolean(),
    priority: v.number(),
    expiresAt: v.optional(v.number()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const announcementId = await ctx.db.insert("announcements", {
      title: args.title,
      content: args.content,
      buttonText: args.buttonText,
      buttonLink: args.buttonLink,
      isActive: args.isActive,
      priority: args.priority,
      expiresAt: args.expiresAt,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    
    return announcementId;
  },
});

// Update announcement
export const update = mutation({
  args: {
    id: v.id("announcements"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    buttonText: v.optional(v.union(v.string(), v.null())),
    buttonLink: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    expiresAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const { id, buttonText, buttonLink, expiresAt, ...rest } = args;
    
    const announcement = await ctx.db.get(id);
    if (!announcement) {
      throw new Error("Announcement not found");
    }
    
    // Build update object, converting null to undefined for optional fields
    const updates: any = {
      ...rest,
      updatedAt: Date.now(),
    };
    
    if (buttonText !== undefined) {
      updates.buttonText = buttonText === null ? undefined : buttonText;
    }
    if (buttonLink !== undefined) {
      updates.buttonLink = buttonLink === null ? undefined : buttonLink;
    }
    if (expiresAt !== undefined) {
      updates.expiresAt = expiresAt === null ? undefined : expiresAt;
    }
    
    await ctx.db.patch(id, updates);
    
    return id;
  },
});

// Delete announcement
export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Toggle active status
export const toggleActive = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.id);
    if (!announcement) {
      throw new Error("Announcement not found");
    }
    
    await ctx.db.patch(args.id, {
      isActive: !announcement.isActive,
      updatedAt: Date.now(),
    });
    
    return args.id;
  },
});

// Get stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const announcements = await ctx.db.query("announcements").collect();
    
    const active = announcements.filter((a) => a.isActive && (!a.expiresAt || a.expiresAt >= now));
    const expired = announcements.filter((a) => a.expiresAt && a.expiresAt < now);
    const inactive = announcements.filter((a) => !a.isActive);
    
    return {
      total: announcements.length,
      active: active.length,
      expired: expired.length,
      inactive: inactive.length,
    };
  },
});
