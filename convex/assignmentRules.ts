import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// List all assignment rules
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rules = await ctx.db
      .query("assignmentRules")
      .collect();
    
    // Enrich with target details
    const enrichedRules = await Promise.all(
      rules.map(async (rule) => {
        let targetName = "";
        let targetDetails: any = null;
        
        if (rule.assignTo.type === "agent") {
          const agent = await ctx.db.get(rule.assignTo.agentId);
          targetName = agent?.name || "Unknown Agent";
          targetDetails = { agentEmail: agent?.email };
        } else if (rule.assignTo.type === "team") {
          const teamId = rule.assignTo.teamId;
          const team = await ctx.db.get(teamId);
          targetName = team?.name || "Unknown Team";
          
          // Get team member count
          const members = await ctx.db
            .query("teamMembers")
            .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
            .collect();
          targetDetails = { memberCount: members.length, teamColor: team?.color };
        } else if (rule.assignTo.type === "round_robin") {
          const teamId = rule.assignTo.teamId;
          const team = await ctx.db.get(teamId);
          targetName = team?.name || "Unknown Team";
          
          // Get team member count
          const members = await ctx.db
            .query("teamMembers")
            .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
            .collect();
          targetDetails = { memberCount: members.length, teamColor: team?.color };
        }
        
        return {
          ...rule,
          targetName,
          targetDetails,
        };
      })
    );
    
    return enrichedRules.sort((a, b) => a.priority - b.priority);
  },
});

// Get a single rule
export const get = query({
  args: { id: v.id("assignmentRules") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new assignment rule
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    priority: v.number(),
    conditions: v.object({
      categories: v.optional(v.array(v.string())),
      priorities: v.optional(v.array(v.string())),
      types: v.optional(v.array(v.string())),
    }),
    assignTo: v.union(
      v.object({ type: v.literal("agent"), agentId: v.id("users") }),
      v.object({ type: v.literal("team"), teamId: v.id("teams") }),
      v.object({ type: v.literal("round_robin"), teamId: v.id("teams") })
    ),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const ruleId = await ctx.db.insert("assignmentRules", {
      name: args.name,
      description: args.description || null,
      isActive: args.isActive,
      priority: args.priority,
      conditions: args.conditions,
      assignTo: args.assignTo,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    
    return ruleId;
  },
});

// Update an assignment rule
export const update = mutation({
  args: {
    id: v.id("assignmentRules"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    conditions: v.optional(v.object({
      categories: v.optional(v.array(v.string())),
      priorities: v.optional(v.array(v.string())),
      types: v.optional(v.array(v.string())),
    })),
    assignTo: v.optional(v.union(
      v.object({ type: v.literal("agent"), agentId: v.id("users") }),
      v.object({ type: v.literal("team"), teamId: v.id("teams") }),
      v.object({ type: v.literal("round_robin"), teamId: v.id("teams") })
    )),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    const rule = await ctx.db.get(id);
    if (!rule) {
      throw new Error("Rule not found");
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Delete an assignment rule
export const remove = mutation({
  args: { id: v.id("assignmentRules") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Toggle rule active status
export const toggleActive = mutation({
  args: { id: v.id("assignmentRules") },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.id);
    if (!rule) {
      throw new Error("Rule not found");
    }
    
    await ctx.db.patch(args.id, {
      isActive: !rule.isActive,
      updatedAt: Date.now(),
    });
    
    return args.id;
  },
});

// Reorder rules (update priorities)
export const reorder = mutation({
  args: {
    ruleIds: v.array(v.id("assignmentRules")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Update priority for each rule based on position in array
    await Promise.all(
      args.ruleIds.map((id, index) =>
        ctx.db.patch(id, { priority: index + 1, updatedAt: now })
      )
    );
    
    return true;
  },
});

// Find matching rule for a ticket and get assignee
export const findMatchingRule = query({
  args: {
    category: v.string(),
    priority: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all active rules sorted by priority
    const rules = await ctx.db
      .query("assignmentRules")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    
    const sortedRules = rules.sort((a, b) => a.priority - b.priority);
    
    for (const rule of sortedRules) {
      const { conditions } = rule;
      
      // Check if ALL specified conditions match (AND logic between condition types)
      // Within each condition type, it's OR logic (e.g., category can be "IT Support" OR "HR")
      
      const categories = conditions.categories || [];
      const priorities = conditions.priorities || [];
      const types = conditions.types || [];
      
      // If a condition is specified, ticket must match at least one value in that condition
      const categoryMatches = categories.length === 0 || categories.includes(args.category);
      const priorityMatches = priorities.length === 0 || priorities.includes(args.priority);
      const typeMatches = types.length === 0 || types.includes(args.type);
      
      // ALL specified conditions must match
      const matches = categoryMatches && priorityMatches && typeMatches;
      
      if (matches) {
        // Determine assignee based on rule type
        if (rule.assignTo.type === "agent") {
          return {
            ruleId: rule._id,
            ruleName: rule.name,
            assigneeId: rule.assignTo.agentId,
            assigneeType: "agent" as const,
          };
        } else if (rule.assignTo.type === "team") {
          // Assign to team leader if exists, otherwise first member
          const teamId = rule.assignTo.teamId;
          const team = await ctx.db.get(teamId);
          if (team?.leaderId) {
            return {
              ruleId: rule._id,
              ruleName: rule.name,
              assigneeId: team.leaderId,
              assigneeType: "team_leader" as const,
            };
          }
          
          const members = await ctx.db
            .query("teamMembers")
            .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
            .first();
          
          if (members) {
            return {
              ruleId: rule._id,
              ruleName: rule.name,
              assigneeId: members.userId,
              assigneeType: "team_member" as const,
            };
          }
        } else if (rule.assignTo.type === "round_robin") {
          // Get team members and find the one with least tickets
          const teamId = rule.assignTo.teamId;
          const members = await ctx.db
            .query("teamMembers")
            .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
            .collect();
          
          if (members.length === 0) continue;
          
          // Count open tickets for each member
          const memberTicketCounts = await Promise.all(
            members.map(async (member) => {
              const tickets = await ctx.db
                .query("tickets")
                .withIndex("by_assignedTo", (q) => q.eq("assignedTo", member.userId))
                .collect();
              
              const openTickets = tickets.filter(
                (t) => !["resolved", "closed"].includes(t.status)
              );
              
              return {
                userId: member.userId,
                ticketCount: openTickets.length,
              };
            })
          );
          
          // Find member with least tickets
          const leastBusy = memberTicketCounts.reduce((min, curr) =>
            curr.ticketCount < min.ticketCount ? curr : min
          );
          
          return {
            ruleId: rule._id,
            ruleName: rule.name,
            assigneeId: leastBusy.userId,
            assigneeType: "round_robin" as const,
          };
        }
      }
    }
    
    return null; // No matching rule found
  },
});

// Get statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const rules = await ctx.db.query("assignmentRules").collect();
    
    return {
      total: rules.length,
      active: rules.filter((r) => r.isActive).length,
      inactive: rules.filter((r) => !r.isActive).length,
    };
  },
});
