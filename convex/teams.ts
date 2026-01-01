import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all teams with member count
export const list = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    
    // Get member counts and details for each team
    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
          .collect();
        
        // Get member details
        const memberDetails = await Promise.all(
          members.map(async (member) => {
            const user = await ctx.db.get(member.userId);
            return {
              ...member,
              userName: user?.name || "Unknown",
              userEmail: user?.email || "",
            };
          })
        );
        
        // Get leader name if exists
        let leaderName = null;
        if (team.leaderId) {
          const leader = await ctx.db.get(team.leaderId);
          leaderName = leader?.name || null;
        }
        
        return {
          ...team,
          memberCount: members.length,
          members: memberDetails,
          leaderName,
        };
      })
    );
    
    return teamsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a single team with full details
export const get = query({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (!team) return null;
    
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .collect();
    
    const memberDetails = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "",
          userRole: user?.role || "user",
        };
      })
    );
    
    let leaderName = null;
    if (team.leaderId) {
      const leader = await ctx.db.get(team.leaderId);
      leaderName = leader?.name || null;
    }
    
    return {
      ...team,
      members: memberDetails,
      leaderName,
    };
  },
});

// Create a new team
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    leaderId: v.optional(v.id("users")),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if team name already exists
    const existingTeam = await ctx.db
      .query("teams")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (existingTeam) {
      throw new Error("A team with this name already exists");
    }
    
    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      description: args.description || null,
      color: args.color,
      leaderId: args.leaderId || null,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    
    // If a leader is specified, add them as a member with leader role
    if (args.leaderId) {
      await ctx.db.insert("teamMembers", {
        teamId,
        userId: args.leaderId,
        role: "leader",
        joinedAt: now,
      });
    }
    
    return teamId;
  },
});

// Update a team
export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    color: v.optional(v.string()),
    leaderId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (!team) {
      throw new Error("Team not found");
    }
    
    const { id, ...updates } = args;
    
    // Check if name is being changed and if it's unique
    if (updates.name && updates.name !== team.name) {
      const existingTeam = await ctx.db
        .query("teams")
        .withIndex("by_name", (q) => q.eq("name", updates.name!))
        .first();
      
      if (existingTeam) {
        throw new Error("A team with this name already exists");
      }
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Delete a team
export const remove = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    // Remove all team members first
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .collect();
    
    for (const member of members) {
      await ctx.db.delete(member._id);
    }
    
    // Delete the team
    await ctx.db.delete(args.id);
    
    return args.id;
  },
});

// Add a member to a team
export const addMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.optional(v.union(v.literal("member"), v.literal("leader"))),
  },
  handler: async (ctx, args) => {
    // Check if user is already a member
    const existingMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) => 
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .first();
    
    if (existingMember) {
      throw new Error("User is already a member of this team");
    }
    
    // Check if user is an agent
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "agent") {
      throw new Error("Only agents can be added to support teams");
    }
    
    const memberId = await ctx.db.insert("teamMembers", {
      teamId: args.teamId,
      userId: args.userId,
      role: args.role || "member",
      joinedAt: Date.now(),
    });
    
    return memberId;
  },
});

// Remove a member from a team
export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) => 
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .first();
    
    if (!member) {
      throw new Error("User is not a member of this team");
    }
    
    await ctx.db.delete(member._id);
    
    // If removing the leader, clear the leaderId on the team
    const team = await ctx.db.get(args.teamId);
    if (team && team.leaderId === args.userId) {
      await ctx.db.patch(args.teamId, { leaderId: null, updatedAt: Date.now() });
    }
    
    return member._id;
  },
});

// Update member role
export const updateMemberRole = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("member"), v.literal("leader")),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) => 
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .first();
    
    if (!member) {
      throw new Error("User is not a member of this team");
    }
    
    await ctx.db.patch(member._id, { role: args.role });
    
    // Update team leader if promoting to leader
    if (args.role === "leader") {
      await ctx.db.patch(args.teamId, { leaderId: args.userId, updatedAt: Date.now() });
    }
    
    return member._id;
  },
});

// Get teams for a specific user
export const getTeamsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    const teams = await Promise.all(
      memberships.map(async (membership) => {
        const team = await ctx.db.get(membership.teamId);
        return team ? { ...team, memberRole: membership.role } : null;
      })
    );
    
    return teams.filter(Boolean);
  },
});

// Get available agents (not in any team or for adding to a specific team)
export const getAvailableAgents = query({
  args: { teamId: v.optional(v.id("teams")) },
  handler: async (ctx, args) => {
    // Get all agents
    const allAgents = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "agent"))
      .collect();
    
    if (!args.teamId) {
      return allAgents;
    }
    
    // Get current team members
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    
    const teamMemberIds = new Set(teamMembers.map((m) => m.userId));
    
    // Filter out agents already in the team
    return allAgents.filter((agent) => !teamMemberIds.has(agent._id));
  },
});
