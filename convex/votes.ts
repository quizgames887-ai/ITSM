import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get active vote (for dashboard display)
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const activeVote = await ctx.db
      .query("votes")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!activeVote) {
      return null;
    }

    // Get vote counts for each option
    const allVotes = await ctx.db
      .query("userVotes")
      .withIndex("by_voteId", (q) => q.eq("voteId", activeVote._id))
      .collect();

    const voteCounts: Record<string, number> = {};
    activeVote.options.forEach((option) => {
      voteCounts[option] = 0;
    });

    allVotes.forEach((vote) => {
      voteCounts[vote.option] = (voteCounts[vote.option] || 0) + 1;
    });

    return {
      ...activeVote,
      voteCounts,
      totalVotes: allVotes.length,
    };
  },
});

// Get user's vote for active poll
export const getUserVote = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const activeVote = await ctx.db
      .query("votes")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!activeVote) {
      return null;
    }

    const userVote = await ctx.db
      .query("userVotes")
      .withIndex("by_voteId_userId", (q) =>
        q.eq("voteId", activeVote._id).eq("userId", args.userId)
      )
      .first();

    return userVote ? userVote.option : null;
  },
});

// Submit a vote (user action)
export const submitVote = mutation({
  args: {
    userId: v.id("users"),
    option: v.string(),
  },
  handler: async (ctx, args) => {
    // Get active vote
    const activeVote = await ctx.db
      .query("votes")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!activeVote) {
      throw new Error("No active vote found");
    }

    // Check if option is valid
    if (!activeVote.options.includes(args.option)) {
      throw new Error("Invalid option");
    }

    // Check if user already voted
    const existingVote = await ctx.db
      .query("userVotes")
      .withIndex("by_voteId_userId", (q) =>
        q.eq("voteId", activeVote._id).eq("userId", args.userId)
      )
      .first();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        option: args.option,
      });
    } else {
      // Create new vote
      await ctx.db.insert("userVotes", {
        voteId: activeVote._id,
        userId: args.userId,
        option: args.option,
        createdAt: Date.now(),
      });
    }
  },
});

// Get all votes (admin only)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const allVotes = await ctx.db.query("votes").collect();

    // Get vote counts for each poll
    const votesWithCounts = await Promise.all(
      allVotes.map(async (vote) => {
        const userVotes = await ctx.db
          .query("userVotes")
          .withIndex("by_voteId", (q) => q.eq("voteId", vote._id))
          .collect();

        const voteCounts: Record<string, number> = {};
        vote.options.forEach((option) => {
          voteCounts[option] = 0;
        });

        userVotes.forEach((userVote) => {
          voteCounts[userVote.option] = (voteCounts[userVote.option] || 0) + 1;
        });

        return {
          ...vote,
          voteCounts,
          totalVotes: userVotes.length,
        };
      })
    );

    // Sort by creation date (newest first)
    return votesWithCounts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a single vote by ID
export const get = query({
  args: {
    id: v.id("votes"),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db.get(args.id);
    if (!vote) {
      return null;
    }

    const userVotes = await ctx.db
      .query("userVotes")
      .withIndex("by_voteId", (q) => q.eq("voteId", args.id))
      .collect();

    const voteCounts: Record<string, number> = {};
    vote.options.forEach((option) => {
      voteCounts[option] = 0;
    });

    userVotes.forEach((userVote) => {
      voteCounts[userVote.option] = (voteCounts[userVote.option] || 0) + 1;
    });

    return {
      ...vote,
      voteCounts,
      totalVotes: userVotes.length,
    };
  },
});

// Create a new vote (admin only)
export const create = mutation({
  args: {
    question: v.string(),
    options: v.array(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.createdBy);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can create votes");
    }

    // Deactivate all existing votes
    const activeVotes = await ctx.db
      .query("votes")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    for (const vote of activeVotes) {
      await ctx.db.patch(vote._id, { isActive: false, updatedAt: Date.now() });
    }

    // Create new vote
    const now = Date.now();
    return await ctx.db.insert("votes", {
      question: args.question,
      options: args.options,
      isActive: true,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a vote (admin only)
export const update = mutation({
  args: {
    id: v.id("votes"),
    question: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    userId: v.id("users"), // User making the update
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update votes");
    }

    const vote = await ctx.db.get(args.id);
    if (!vote) {
      throw new Error("Vote not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.question !== undefined) updates.question = args.question;
    if (args.options !== undefined) updates.options = args.options;

    // If activating this vote, deactivate all others
    if (args.isActive === true) {
      const activeVotes = await ctx.db
        .query("votes")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect();

      for (const activeVote of activeVotes) {
        if (activeVote._id !== args.id) {
          await ctx.db.patch(activeVote._id, {
            isActive: false,
            updatedAt: Date.now(),
          });
        }
      }
      updates.isActive = true;
    } else if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }

    await ctx.db.patch(args.id, updates);
  },
});

// Delete a vote (admin only)
export const remove = mutation({
  args: {
    id: v.id("votes"),
    userId: v.id("users"), // User making the delete
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can delete votes");
    }

    // Delete all user votes for this poll
    const userVotes = await ctx.db
      .query("userVotes")
      .withIndex("by_voteId", (q) => q.eq("voteId", args.id))
      .collect();

    for (const userVote of userVotes) {
      await ctx.db.delete(userVote._id);
    }

    // Delete the vote
    await ctx.db.delete(args.id);
  },
});

// Get vote history with detailed results
export const getHistory = query({
  args: {},
  handler: async (ctx) => {
    const allVotes = await ctx.db.query("votes").collect();

    const history = await Promise.all(
      allVotes.map(async (vote) => {
        const userVotes = await ctx.db
          .query("userVotes")
          .withIndex("by_voteId", (q) => q.eq("voteId", vote._id))
          .collect();

        const voteCounts: Record<string, number> = {};
        vote.options.forEach((option) => {
          voteCounts[option] = 0;
        });

        userVotes.forEach((userVote) => {
          voteCounts[userVote.option] = (voteCounts[userVote.option] || 0) + 1;
        });

        return {
          ...vote,
          voteCounts,
          totalVotes: userVotes.length,
        };
      })
    );

    // Sort by creation date (newest first)
    return history.sort((a, b) => b.createdAt - a.createdAt);
  },
});
