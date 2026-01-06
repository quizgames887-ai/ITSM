import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to create notification
async function createNotification(
  ctx: any,
  userId: Id<"users">,
  type: string,
  title: string,
  message: string,
  ticketId?: Id<"tickets">
) {
  await ctx.db.insert("notifications", {
    userId,
    type,
    title,
    message,
    read: false,
    ticketId: ticketId ?? null,
    createdAt: Date.now(),
  });
}

// Get all approval requests for a ticket
export const getByTicket = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("approvalRequests")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    // Get stage details for each request
    const requestsWithStages = await Promise.all(
      requests.map(async (request) => {
        const stage = await ctx.db.get(request.stageId);
        return {
          ...request,
          stage,
        };
      })
    );

    return requestsWithStages.sort((a, b) => {
      const orderA = a.stage?.order ?? 0;
      const orderB = b.stage?.order ?? 0;
      return orderA - orderB;
    });
  },
});

// Get all pending approval requests for a user
export const getPendingForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("approvalRequests")
      .withIndex("by_approverId", (q) => q.eq("approverId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get ticket and stage details for each request
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const ticket = await ctx.db.get(request.ticketId);
        const stage = await ctx.db.get(request.stageId);
        return {
          ...request,
          ticket,
          stage,
        };
      })
    );

    return requestsWithDetails.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

// Approve an approval request
export const approve = mutation({
  args: {
    id: v.id("approvalRequests"),
    approverId: v.id("users"),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Approval request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Approval request is not pending");
    }

    if (request.approverId !== args.approverId) {
      throw new Error("You are not authorized to approve this request");
    }

    const now = Date.now();

    // Update approval request
    await ctx.db.patch(args.id, {
      status: "approved",
      approverId: args.approverId,
      comments: args.comments ?? null,
      respondedAt: now,
      updatedAt: now,
    });

    // Get ticket and stage details
    const ticket = await ctx.db.get(request.ticketId);
    const stage = await ctx.db.get(request.stageId);

    if (!ticket || !stage) {
      throw new Error("Ticket or stage not found");
    }

    // Check if all required stages are approved
    const allRequests = await ctx.db
      .query("approvalRequests")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", request.ticketId))
      .collect();

    const allStages = await ctx.db
      .query("approvalStages")
      .withIndex("by_formId", (q) => {
        // We need to get the formId from the stage
        // Since we already have the stage, we can use it
        return q.eq("formId", stage.formId);
      })
      .collect();

    const requiredStages = allStages.filter((s) => s.isRequired);
    const requiredStageIds = new Set(requiredStages.map((s) => s._id));

    const requiredRequests = allRequests.filter((r) =>
      requiredStageIds.has(r.stageId)
    );

    const allRequiredApproved = requiredRequests.every(
      (r) => r.status === "approved" || r.status === "skipped"
    );

    // Check if any stage was rejected
    const anyRejected = allRequests.some((r) => r.status === "rejected");

    // Update ticket approval status
    let ticketApprovalStatus: "pending" | "approved" | "rejected" | "not_required" =
      "pending";
    if (anyRejected) {
      ticketApprovalStatus = "rejected";
    } else if (allRequiredApproved) {
      ticketApprovalStatus = "approved";
    }

    await ctx.db.patch(request.ticketId, {
      approvalStatus: ticketApprovalStatus,
      updatedAt: now,
    });

    // Notify ticket creator
    await createNotification(
      ctx,
      ticket.createdBy,
      "approval_approved",
      "Approval Approved",
      `Your ticket "${ticket.title}" has been approved at stage: ${stage.name}`,
      request.ticketId
    );

    return { success: true };
  },
});

// Reject an approval request
export const reject = mutation({
  args: {
    id: v.id("approvalRequests"),
    approverId: v.id("users"),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Approval request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Approval request is not pending");
    }

    if (request.approverId !== args.approverId) {
      throw new Error("You are not authorized to reject this request");
    }

    const now = Date.now();

    // Update approval request
    await ctx.db.patch(args.id, {
      status: "rejected",
      approverId: args.approverId,
      comments: args.comments ?? null,
      respondedAt: now,
      updatedAt: now,
    });

    // Get ticket and stage details
    const ticket = await ctx.db.get(request.ticketId);
    const stage = await ctx.db.get(request.stageId);

    if (!ticket || !stage) {
      throw new Error("Ticket or stage not found");
    }

    // Update ticket approval status to rejected
    await ctx.db.patch(request.ticketId, {
      approvalStatus: "rejected",
      updatedAt: now,
    });

    // Notify ticket creator
    await createNotification(
      ctx,
      ticket.createdBy,
      "approval_rejected",
      "Approval Rejected",
      `Your ticket "${ticket.title}" has been rejected at stage: ${stage.name}${args.comments ? ` - ${args.comments}` : ""}`,
      request.ticketId
    );

    return { success: true };
  },
});

// Request more information for an approval request
export const needMoreInfo = mutation({
  args: {
    id: v.id("approvalRequests"),
    approverId: v.id("users"),
    comments: v.string(), // Comments are required when requesting more info
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Approval request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Approval request is not pending");
    }

    if (request.approverId !== args.approverId) {
      throw new Error("You are not authorized to request more information for this request");
    }

    if (!args.comments || args.comments.trim().length === 0) {
      throw new Error("Comments are required when requesting more information");
    }

    const now = Date.now();

    // Update approval request - set status to need_more_info but keep it pending for resubmission
    // We'll keep status as pending but add a flag or use comments to indicate more info is needed
    // Actually, let's use the need_more_info status
    await ctx.db.patch(args.id, {
      status: "need_more_info",
      approverId: args.approverId,
      comments: args.comments.trim(),
      respondedAt: now,
      updatedAt: now,
    });

    // Get ticket and stage details
    const ticket = await ctx.db.get(request.ticketId);
    const stage = await ctx.db.get(request.stageId);

    if (!ticket || !stage) {
      throw new Error("Ticket or stage not found");
    }

    // Notify ticket creator
    await createNotification(
      ctx,
      ticket.createdBy,
      "approval_more_info_needed",
      "More Information Required",
      `More information is needed for your ticket "${ticket.title}" at stage: ${stage.name}. Please review the comments and provide additional details.`,
      request.ticketId
    );

    return { success: true };
  },
});

// Resubmit an approval request after providing more information
export const resubmit = mutation({
  args: {
    id: v.id("approvalRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Approval request not found");
    }

    if (request.status !== "need_more_info") {
      throw new Error("Approval request is not in 'need more info' status");
    }

    const now = Date.now();

    // Reset approval request to pending
    await ctx.db.patch(args.id, {
      status: "pending",
      comments: null, // Clear previous comments
      respondedAt: null,
      updatedAt: now,
    });

    // Get ticket and stage details
    const ticket = await ctx.db.get(request.ticketId);
    const stage = await ctx.db.get(request.stageId);

    if (!ticket || !stage) {
      throw new Error("Ticket or stage not found");
    }

    // Notify the approver again
    if (request.approverId) {
      await createNotification(
        ctx,
        request.approverId,
        "approval_requested",
        "Approval Required",
        `The ticket "${ticket.title}" has been resubmitted for approval at stage: ${stage.name}`,
        request.ticketId
      );
    }

    return { success: true };
  },
});
