import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const allArticles = await ctx.db.query("knowledgeBase").collect();

    // Filter by category if provided
    let filtered = allArticles;
    if (args.category) {
      filtered = filtered.filter((article) => article.category === args.category);
    }

    // Filter by tags if provided
    if (args.tags && args.tags.length > 0) {
      filtered = filtered.filter((article) =>
        args.tags!.some((tag) => article.tags.includes(tag))
      );
    }

    return filtered.sort((a, b) => b.views - a.views);
  },
});

export const get = query({
  args: { id: v.id("knowledgeBase") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const incrementViews = mutation({
  args: { id: v.id("knowledgeBase") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.id);
    if (article) {
      await ctx.db.patch(args.id, {
        views: article.views + 1,
      });
    }
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const articleId = await ctx.db.insert("knowledgeBase", {
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      views: 0,
      helpful: 0,
      embedding: null,
      createdAt: now,
      updatedAt: now,
    });

    return articleId;
  },
});

export const update = mutation({
  args: {
    id: v.id("knowledgeBase"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const markHelpful = mutation({
  args: { id: v.id("knowledgeBase") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.id);
    if (article) {
      await ctx.db.patch(args.id, {
        helpful: article.helpful + 1,
      });
    }
  },
});
