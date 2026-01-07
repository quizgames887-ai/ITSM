import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get notification settings (only one configuration allowed)
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("notificationSettings")
      .collect();
    
    // Return the most recent settings (should only be one)
    return settings.length > 0 ? settings.sort((a, b) => b.updatedAt - a.updatedAt)[0] : null;
  },
});

// Create or update notification settings
export const updateSettings = mutation({
  args: {
    // Ticket creation events
    notifyOnTicketCreated: v.boolean(),
    notifyOnTicketCreatedForCreator: v.boolean(),
    notifyOnTicketCreatedForAssignee: v.boolean(),
    
    // Ticket status change events
    notifyOnStatusChange: v.boolean(),
    notifyOnStatusChangeToNew: v.boolean(),
    notifyOnStatusChangeToInProgress: v.boolean(),
    notifyOnStatusChangeToOnHold: v.boolean(),
    notifyOnStatusChangeToResolved: v.boolean(),
    notifyOnStatusChangeToClosed: v.boolean(),
    notifyOnStatusChangeToRejected: v.boolean(),
    notifyOnStatusChangeToNeedApproval: v.boolean(),
    
    // Ticket assignment events
    notifyOnAssignment: v.boolean(),
    notifyOnAssignmentToAssignee: v.boolean(),
    notifyOnAssignmentToCreator: v.boolean(),
    
    // Ticket priority change events
    notifyOnPriorityChange: v.boolean(),
    notifyOnPriorityChangeToLow: v.boolean(),
    notifyOnPriorityChangeToMedium: v.boolean(),
    notifyOnPriorityChangeToHigh: v.boolean(),
    notifyOnPriorityChangeToCritical: v.boolean(),
    
    // Ticket type filters
    notifyForIncidents: v.boolean(),
    notifyForServiceRequests: v.boolean(),
    notifyForInquiries: v.boolean(),
    
    // Recipient filters
    notifyCreator: v.boolean(),
    notifyAssignee: v.boolean(),
    notifyWatchers: v.boolean(),
    
    // General settings
    enabled: v.boolean(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if settings already exist
    const existing = await ctx.db
      .query("notificationSettings")
      .collect();
    
    if (existing.length > 0) {
      // Update existing settings (use the most recent one)
      const settings = existing.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      await ctx.db.patch(settings._id, {
        notifyOnTicketCreated: args.notifyOnTicketCreated,
        notifyOnTicketCreatedForCreator: args.notifyOnTicketCreatedForCreator,
        notifyOnTicketCreatedForAssignee: args.notifyOnTicketCreatedForAssignee,
        notifyOnStatusChange: args.notifyOnStatusChange,
        notifyOnStatusChangeToNew: args.notifyOnStatusChangeToNew,
        notifyOnStatusChangeToInProgress: args.notifyOnStatusChangeToInProgress,
        notifyOnStatusChangeToOnHold: args.notifyOnStatusChangeToOnHold,
        notifyOnStatusChangeToResolved: args.notifyOnStatusChangeToResolved,
        notifyOnStatusChangeToClosed: args.notifyOnStatusChangeToClosed,
        notifyOnStatusChangeToRejected: args.notifyOnStatusChangeToRejected,
        notifyOnStatusChangeToNeedApproval: args.notifyOnStatusChangeToNeedApproval,
        notifyOnAssignment: args.notifyOnAssignment,
        notifyOnAssignmentToAssignee: args.notifyOnAssignmentToAssignee,
        notifyOnAssignmentToCreator: args.notifyOnAssignmentToCreator,
        notifyOnPriorityChange: args.notifyOnPriorityChange,
        notifyOnPriorityChangeToLow: args.notifyOnPriorityChangeToLow,
        notifyOnPriorityChangeToMedium: args.notifyOnPriorityChangeToMedium,
        notifyOnPriorityChangeToHigh: args.notifyOnPriorityChangeToHigh,
        notifyOnPriorityChangeToCritical: args.notifyOnPriorityChangeToCritical,
        notifyForIncidents: args.notifyForIncidents,
        notifyForServiceRequests: args.notifyForServiceRequests,
        notifyForInquiries: args.notifyForInquiries,
        notifyCreator: args.notifyCreator,
        notifyAssignee: args.notifyAssignee,
        notifyWatchers: args.notifyWatchers,
        enabled: args.enabled,
        updatedAt: now,
      });
      return settings._id;
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert("notificationSettings", {
        notifyOnTicketCreated: args.notifyOnTicketCreated,
        notifyOnTicketCreatedForCreator: args.notifyOnTicketCreatedForCreator,
        notifyOnTicketCreatedForAssignee: args.notifyOnTicketCreatedForAssignee,
        notifyOnStatusChange: args.notifyOnStatusChange,
        notifyOnStatusChangeToNew: args.notifyOnStatusChangeToNew,
        notifyOnStatusChangeToInProgress: args.notifyOnStatusChangeToInProgress,
        notifyOnStatusChangeToOnHold: args.notifyOnStatusChangeToOnHold,
        notifyOnStatusChangeToResolved: args.notifyOnStatusChangeToResolved,
        notifyOnStatusChangeToClosed: args.notifyOnStatusChangeToClosed,
        notifyOnStatusChangeToRejected: args.notifyOnStatusChangeToRejected,
        notifyOnStatusChangeToNeedApproval: args.notifyOnStatusChangeToNeedApproval,
        notifyOnAssignment: args.notifyOnAssignment,
        notifyOnAssignmentToAssignee: args.notifyOnAssignmentToAssignee,
        notifyOnAssignmentToCreator: args.notifyOnAssignmentToCreator,
        notifyOnPriorityChange: args.notifyOnPriorityChange,
        notifyOnPriorityChangeToLow: args.notifyOnPriorityChangeToLow,
        notifyOnPriorityChangeToMedium: args.notifyOnPriorityChangeToMedium,
        notifyOnPriorityChangeToHigh: args.notifyOnPriorityChangeToHigh,
        notifyOnPriorityChangeToCritical: args.notifyOnPriorityChangeToCritical,
        notifyForIncidents: args.notifyForIncidents,
        notifyForServiceRequests: args.notifyForServiceRequests,
        notifyForInquiries: args.notifyForInquiries,
        notifyCreator: args.notifyCreator,
        notifyAssignee: args.notifyAssignee,
        notifyWatchers: args.notifyWatchers,
        enabled: args.enabled,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      return settingsId;
    }
  },
});
