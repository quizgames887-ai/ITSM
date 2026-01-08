import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get branding settings (only one configuration allowed)
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("brandingSettings")
      .collect();
    
    // Return the most recent settings (should only be one)
    return settings.length > 0 ? settings.sort((a, b) => b.updatedAt - a.updatedAt)[0] : null;
  },
});

// Create or update branding settings
export const updateSettings = mutation({
  args: {
    logoId: v.optional(v.union(v.id("_storage"), v.null())),
    primaryColor: v.string(), // Hex color code
    primaryColorHover: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    appName: v.optional(v.string()),
    // System Icons
    chatIconId: v.optional(v.union(v.id("_storage"), v.null())),
    userIconId: v.optional(v.union(v.id("_storage"), v.null())),
    resetPasswordIconId: v.optional(v.union(v.id("_storage"), v.null())),
    notificationIconId: v.optional(v.union(v.id("_storage"), v.null())),
    searchIconId: v.optional(v.union(v.id("_storage"), v.null())),
    enabled: v.boolean(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Validate color format (should be hex)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(args.primaryColor)) {
      throw new Error("Primary color must be a valid hex color code (e.g., #4f46e5)");
    }
    
    if (args.primaryColorHover && !hexColorRegex.test(args.primaryColorHover)) {
      throw new Error("Primary color hover must be a valid hex color code");
    }
    
    if (args.secondaryColor && !hexColorRegex.test(args.secondaryColor)) {
      throw new Error("Secondary color must be a valid hex color code");
    }
    
    // Check if settings already exist
    const existing = await ctx.db
      .query("brandingSettings")
      .collect();
    
    if (existing.length > 0) {
      // Update existing settings (use the most recent one)
      const settings = existing.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      await ctx.db.patch(settings._id, {
        logoId: args.logoId ?? null,
        primaryColor: args.primaryColor,
        primaryColorHover: args.primaryColorHover ?? undefined,
        secondaryColor: args.secondaryColor ?? undefined,
        appName: args.appName ?? undefined,
        chatIconId: args.chatIconId ?? null,
        userIconId: args.userIconId ?? null,
        resetPasswordIconId: args.resetPasswordIconId ?? null,
        notificationIconId: args.notificationIconId ?? null,
        searchIconId: args.searchIconId ?? null,
        enabled: args.enabled,
        updatedAt: now,
      });
      return settings._id;
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert("brandingSettings", {
        logoId: args.logoId ?? null,
        primaryColor: args.primaryColor,
        primaryColorHover: args.primaryColorHover ?? undefined,
        secondaryColor: args.secondaryColor ?? undefined,
        appName: args.appName ?? undefined,
        chatIconId: args.chatIconId ?? null,
        userIconId: args.userIconId ?? null,
        resetPasswordIconId: args.resetPasswordIconId ?? null,
        notificationIconId: args.notificationIconId ?? null,
        searchIconId: args.searchIconId ?? null,
        enabled: args.enabled,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      return settingsId;
    }
  },
});

// Get storage URL for logo or any icon
export const getLogoUrl = query({
  args: {
    storageId: v.union(v.id("_storage"), v.null(), v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    
    // Handle case where storageId might be a JSON string
    let actualStorageId: Id<"_storage"> | null = null;
    if (typeof args.storageId === "string") {
      try {
        const parsed = JSON.parse(args.storageId);
        if (typeof parsed === "object" && parsed.storageId) {
          actualStorageId = parsed.storageId as Id<"_storage">;
        } else if (typeof parsed === "string") {
          actualStorageId = parsed as Id<"_storage">;
        } else {
          actualStorageId = args.storageId as Id<"_storage">;
        }
      } catch {
        actualStorageId = args.storageId as Id<"_storage">;
      }
    } else {
      actualStorageId = args.storageId;
    }
    
    if (!actualStorageId) return null;
    
    try {
      return await ctx.storage.getUrl(actualStorageId);
    } catch (error) {
      console.error("Error getting icon URL:", error);
      return null;
    }
  },
});

// Generate upload URL for logo
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
