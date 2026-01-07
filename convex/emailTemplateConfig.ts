import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get email template configuration (only one configuration allowed)
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db
      .query("emailTemplateConfig")
      .collect();
    
    // Return the most recent config (should only be one)
    return configs.length > 0 ? configs.sort((a, b) => b.updatedAt - a.updatedAt)[0] : null;
  },
});

// Create or update email template configuration
export const updateConfig = mutation({
  args: {
    // Basic ticket information
    includeTicketTitle: v.boolean(),
    includeTicketDescription: v.boolean(),
    includeTicketId: v.boolean(),
    includeTicketNumber: v.boolean(),
    
    // Ticket metadata
    includeCategory: v.boolean(),
    includePriority: v.boolean(),
    includeStatus: v.boolean(),
    includeType: v.boolean(),
    includeUrgency: v.boolean(),
    includeSlaDeadline: v.boolean(),
    includeCreatedDate: v.boolean(),
    includeUpdatedDate: v.boolean(),
    includeResolvedDate: v.boolean(),
    
    // User information
    includeCreatorName: v.boolean(),
    includeCreatorEmail: v.boolean(),
    includeAssigneeName: v.boolean(),
    includeAssigneeEmail: v.boolean(),
    
    // Change information
    includeStatusChange: v.boolean(),
    includePriorityChange: v.boolean(),
    includeAssignmentChange: v.boolean(),
    
    // Additional information
    includeTicketLink: v.boolean(),
    includeComments: v.boolean(),
    includeAttachments: v.boolean(),
    includeFormData: v.boolean(),
    
    // Email formatting
    emailHeaderText: v.optional(v.string()),
    emailFooterText: v.optional(v.string()),
    emailSignature: v.optional(v.string()),
    
    // General settings
    enabled: v.boolean(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if config already exists
    const existing = await ctx.db
      .query("emailTemplateConfig")
      .collect();
    
    if (existing.length > 0) {
      // Update existing config (use the most recent one)
      const config = existing.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      await ctx.db.patch(config._id, {
        includeTicketTitle: args.includeTicketTitle,
        includeTicketDescription: args.includeTicketDescription,
        includeTicketId: args.includeTicketId,
        includeTicketNumber: args.includeTicketNumber,
        includeCategory: args.includeCategory,
        includePriority: args.includePriority,
        includeStatus: args.includeStatus,
        includeType: args.includeType,
        includeUrgency: args.includeUrgency,
        includeSlaDeadline: args.includeSlaDeadline,
        includeCreatedDate: args.includeCreatedDate,
        includeUpdatedDate: args.includeUpdatedDate,
        includeResolvedDate: args.includeResolvedDate,
        includeCreatorName: args.includeCreatorName,
        includeCreatorEmail: args.includeCreatorEmail,
        includeAssigneeName: args.includeAssigneeName,
        includeAssigneeEmail: args.includeAssigneeEmail,
        includeStatusChange: args.includeStatusChange,
        includePriorityChange: args.includePriorityChange,
        includeAssignmentChange: args.includeAssignmentChange,
        includeTicketLink: args.includeTicketLink,
        includeComments: args.includeComments,
        includeAttachments: args.includeAttachments,
        includeFormData: args.includeFormData,
        emailHeaderText: args.emailHeaderText ?? undefined,
        emailFooterText: args.emailFooterText ?? undefined,
        emailSignature: args.emailSignature ?? undefined,
        enabled: args.enabled,
        updatedAt: now,
      });
      return config._id;
    } else {
      // Create new config
      const configId = await ctx.db.insert("emailTemplateConfig", {
        includeTicketTitle: args.includeTicketTitle,
        includeTicketDescription: args.includeTicketDescription,
        includeTicketId: args.includeTicketId,
        includeTicketNumber: args.includeTicketNumber,
        includeCategory: args.includeCategory,
        includePriority: args.includePriority,
        includeStatus: args.includeStatus,
        includeType: args.includeType,
        includeUrgency: args.includeUrgency,
        includeSlaDeadline: args.includeSlaDeadline,
        includeCreatedDate: args.includeCreatedDate,
        includeUpdatedDate: args.includeUpdatedDate,
        includeResolvedDate: args.includeResolvedDate,
        includeCreatorName: args.includeCreatorName,
        includeCreatorEmail: args.includeCreatorEmail,
        includeAssigneeName: args.includeAssigneeName,
        includeAssigneeEmail: args.includeAssigneeEmail,
        includeStatusChange: args.includeStatusChange,
        includePriorityChange: args.includePriorityChange,
        includeAssignmentChange: args.includeAssignmentChange,
        includeTicketLink: args.includeTicketLink,
        includeComments: args.includeComments,
        includeAttachments: args.includeAttachments,
        includeFormData: args.includeFormData,
        emailHeaderText: args.emailHeaderText ?? undefined,
        emailFooterText: args.emailFooterText ?? undefined,
        emailSignature: args.emailSignature ?? undefined,
        enabled: args.enabled,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      return configId;
    }
  },
});
