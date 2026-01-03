import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all translations for a specific language
export const getByLanguage = query({
  args: {
    language: v.union(v.literal("en"), v.literal("ar")),
  },
  handler: async (ctx, args) => {
    const translations = await ctx.db
      .query("translations")
      .withIndex("by_language", (q) => q.eq("language", args.language))
      .collect();

    // Convert to key-value object for easy lookup
    const translationMap: Record<string, string> = {};
    translations.forEach((t) => {
      translationMap[t.key] = t.value;
    });

    return translationMap;
  },
});

// Get a single translation by key and language
export const get = query({
  args: {
    key: v.string(),
    language: v.union(v.literal("en"), v.literal("ar")),
  },
  handler: async (ctx, args) => {
    const translation = await ctx.db
      .query("translations")
      .withIndex("by_key_language", (q) =>
        q.eq("key", args.key).eq("language", args.language)
      )
      .first();

    return translation?.value || null;
  },
});

// Get all translations (admin only - for management)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const translations = await ctx.db.query("translations").collect();
    
    // Group by key for easier management
    const grouped: Record<string, { en?: any; ar?: any; key: string; category?: string }> = {};
    
    translations.forEach((t) => {
      if (!grouped[t.key]) {
        grouped[t.key] = { key: t.key, category: t.category };
      }
      grouped[t.key][t.language] = {
        _id: t._id,
        value: t.value,
        updatedBy: t.updatedBy,
        updatedAt: t.updatedAt,
      };
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || "").localeCompare(b.category || "");
      }
      return a.key.localeCompare(b.key);
    });
  },
});

// Create or update a translation (admin only)
export const upsert = mutation({
  args: {
    key: v.string(),
    language: v.union(v.literal("en"), v.literal("ar")),
    value: v.string(),
    category: v.optional(v.string()),
    userId: v.id("users"), // User making the update (must be admin)
  },
  handler: async (ctx, args) => {
    // Verify user is admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can manage translations");
    }

    // Check if translation exists
    const existing = await ctx.db
      .query("translations")
      .withIndex("by_key_language", (q) =>
        q.eq("key", args.key).eq("language", args.language)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing translation
      await ctx.db.patch(existing._id, {
        value: args.value,
        category: args.category,
        updatedBy: args.userId,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new translation
      return await ctx.db.insert("translations", {
        key: args.key,
        language: args.language,
        value: args.value,
        category: args.category,
        updatedBy: args.userId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Delete a translation (admin only)
export const remove = mutation({
  args: {
    id: v.id("translations"),
    userId: v.id("users"), // User making the delete (must be admin)
  },
  handler: async (ctx, args) => {
    // Verify user is admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can delete translations");
    }

    await ctx.db.delete(args.id);
  },
});

// Bulk import translations (admin only - for initial setup)
export const bulkImport = mutation({
  args: {
    translations: v.array(
      v.object({
        key: v.string(),
        en: v.string(),
        ar: v.string(),
        category: v.optional(v.string()),
      })
    ),
    userId: v.id("users"), // User making the import (must be admin)
  },
  handler: async (ctx, args) => {
    // Verify user is admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can import translations");
    }

    const now = Date.now();
    const results: { key: string; en: Id<"translations"> | null; ar: Id<"translations"> | null }[] = [];

    for (const t of args.translations) {
      // Check if English translation exists
      const existingEn = await ctx.db
        .query("translations")
        .withIndex("by_key_language", (q) => q.eq("key", t.key).eq("language", "en"))
        .first();

      let enId: Id<"translations"> | null = null;
      if (existingEn) {
        await ctx.db.patch(existingEn._id, {
          value: t.en,
          category: t.category,
          updatedBy: args.userId,
          updatedAt: now,
        });
        enId = existingEn._id;
      } else {
        enId = await ctx.db.insert("translations", {
          key: t.key,
          language: "en",
          value: t.en,
          category: t.category,
          updatedBy: args.userId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Check if Arabic translation exists
      const existingAr = await ctx.db
        .query("translations")
        .withIndex("by_key_language", (q) => q.eq("key", t.key).eq("language", "ar"))
        .first();

      let arId: Id<"translations"> | null = null;
      if (existingAr) {
        await ctx.db.patch(existingAr._id, {
          value: t.ar,
          category: t.category,
          updatedBy: args.userId,
          updatedAt: now,
        });
        arId = existingAr._id;
      } else {
        arId = await ctx.db.insert("translations", {
          key: t.key,
          language: "ar",
          value: t.ar,
          category: t.category,
          updatedBy: args.userId,
          createdAt: now,
          updatedAt: now,
        });
      }

      results.push({ key: t.key, en: enId, ar: arId });
    }

    return results;
  },
});
