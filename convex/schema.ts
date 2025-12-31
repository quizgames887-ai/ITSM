import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("agent")),
    onboardingCompleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  tickets: defineTable({
    title: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("incident"),
      v.literal("service_request"),
      v.literal("inquiry")
    ),
    status: v.union(
      v.literal("new"),
      v.literal("in_progress"),
      v.literal("on_hold"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.string(),
    createdBy: v.id("users"),
    assignedTo: v.union(v.id("users"), v.null()),
    slaDeadline: v.union(v.number(), v.null()),
    resolvedAt: v.union(v.number(), v.null()),
    aiCategorySuggestion: v.union(v.string(), v.null()),
    aiPrioritySuggestion: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_createdBy", ["createdBy"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_category", ["category"])
    .index("by_createdAt", ["createdAt"]),

  ticketComments: defineTable({
    ticketId: v.id("tickets"),
    userId: v.id("users"),
    content: v.string(),
    attachmentIds: v.array(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ticketId", ["ticketId"])
    .index("by_userId", ["userId"]),

  ticketHistory: defineTable({
    ticketId: v.id("tickets"),
    userId: v.id("users"),
    action: v.string(),
    oldValue: v.any(),
    newValue: v.any(),
    createdAt: v.number(),
  })
    .index("by_ticketId", ["ticketId"])
    .index("by_userId", ["userId"]),

  knowledgeBase: defineTable({
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    views: v.number(),
    helpful: v.number(),
    embedding: v.union(v.array(v.number()), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_tags", ["tags"]),

  slaPolicies: defineTable({
    name: v.string(),
    priority: v.string(),
    responseTime: v.number(),
    resolutionTime: v.number(),
    enabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_priority", ["priority"])
    .index("by_enabled", ["enabled"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    ticketId: v.union(v.id("tickets"), v.null()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_read", ["read"])
    .index("by_userId_read", ["userId", "read"]),

  userPasswords: defineTable({
    userId: v.id("users"),
    passwordHash: v.string(),
  }).index("by_userId", ["userId"]),

  forms: defineTable({
    name: v.string(),
    description: v.union(v.string(), v.null()),
    createdBy: v.id("users"),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_isActive", ["isActive"]),

  formFields: defineTable({
    formId: v.id("forms"),
    fieldType: v.union(
      v.literal("text"),
      v.literal("email"),
      v.literal("number"),
      v.literal("textarea"),
      v.literal("select"),
      v.literal("checkbox"),
      v.literal("radio"),
      v.literal("date"),
      v.literal("file")
    ),
    label: v.string(),
    name: v.string(),
    placeholder: v.union(v.string(), v.null()),
    required: v.boolean(),
    defaultValue: v.union(v.string(), v.null()),
    options: v.union(v.array(v.string()), v.null()), // For select, radio
    validation: v.union(
      v.object({
        min: v.union(v.number(), v.null()),
        max: v.union(v.number(), v.null()),
        pattern: v.union(v.string(), v.null()),
        minLength: v.union(v.number(), v.null()),
        maxLength: v.union(v.number(), v.null()),
      }),
      v.null()
    ),
    order: v.number(),
    helpText: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_formId", ["formId"])
    .index("by_formId_order", ["formId", "order"]),
});
