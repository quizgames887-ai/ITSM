import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("agent")),
    onboardingCompleted: v.boolean(),
    profilePictureId: v.optional(v.union(v.id("_storage"), v.null())),
    language: v.optional(v.union(v.literal("en"), v.literal("ar"))), // Language preference: en (English) or ar (Arabic)
    workplace: v.optional(v.string()), // Workplace/organization name
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
    formData: v.optional(v.any()), // Store all form field values including custom fields
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
    visibility: v.optional(v.union(v.literal("internal"), v.literal("external"))), // internal: only agents/admins, external: all users (optional for backward compatibility)
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
    responseTime: v.number(), // Response time in minutes
    resolutionTime: v.number(), // Resolution time in minutes
    enabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_priority", ["priority"])
    .index("by_enabled", ["enabled"]),

  // Escalation Rules
  escalationRules: defineTable({
    name: v.string(),
    description: v.union(v.string(), v.null()),
    isActive: v.boolean(),
    priority: v.number(), // Lower number = higher priority (evaluated first)
    // Conditions for when to escalate
    conditions: v.object({
      priorities: v.optional(v.array(v.string())), // Match ticket priorities
      statuses: v.optional(v.array(v.string())), // Match ticket statuses
      overdueBy: v.optional(v.number()), // Escalate if overdue by X minutes
    }),
    // Escalation actions
    actions: v.object({
      notifyUsers: v.optional(v.array(v.id("users"))), // Users to notify
      notifyTeams: v.optional(v.array(v.id("teams"))), // Teams to notify
      reassignTo: v.union(
        v.object({ type: v.literal("agent"), agentId: v.id("users") }),
        v.object({ type: v.literal("team"), teamId: v.id("teams") }),
        v.object({ type: v.literal("none") })
      ),
      changePriority: v.optional(v.string()), // New priority level
      addComment: v.optional(v.string()), // Auto-comment to add
    }),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_priority", ["priority"]),

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

  // Support Teams
  teams: defineTable({
    name: v.string(),
    description: v.union(v.string(), v.null()),
    color: v.string(), // For visual identification
    leaderId: v.union(v.id("users"), v.null()), // Team leader
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // Team Members (agents assigned to teams)
  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("member"), v.literal("leader")),
    joinedAt: v.number(),
  })
    .index("by_teamId", ["teamId"])
    .index("by_userId", ["userId"])
    .index("by_teamId_userId", ["teamId", "userId"]),

  // Announcements
  announcements: defineTable({
    title: v.string(),
    content: v.string(),
    buttonText: v.optional(v.string()),
    buttonLink: v.optional(v.string()),
    imageId: v.optional(v.union(v.id("_storage"), v.null())), // Optional image for announcement
    isActive: v.boolean(),
    priority: v.number(), // Higher = shown first
    expiresAt: v.optional(v.number()), // Optional expiration date
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_priority", ["priority"]),

  // Auto-assignment Rules
  assignmentRules: defineTable({
    name: v.string(),
    description: v.union(v.string(), v.null()),
    isActive: v.boolean(),
    priority: v.number(), // Lower number = higher priority (evaluated first)
    // Conditions (match any)
    conditions: v.object({
      categories: v.optional(v.array(v.string())), // Match ticket categories
      priorities: v.optional(v.array(v.string())), // Match ticket priorities
      types: v.optional(v.array(v.string())), // Match ticket types
    }),
    // Assignment target
    assignTo: v.union(
      v.object({ type: v.literal("agent"), agentId: v.id("users") }),
      v.object({ type: v.literal("team"), teamId: v.id("teams") }),
      v.object({ type: v.literal("round_robin"), teamId: v.id("teams") }) // Distribute among team members
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_priority", ["priority"]),

  // Service Catalog
  serviceCatalog: defineTable({
    name: v.string(),
    icon: v.string(), // Emoji or icon identifier
    logoId: v.optional(v.union(v.id("_storage"), v.null())), // Uploaded logo image
    color: v.string(), // Background color class (e.g., "bg-blue-100")
    rating: v.number(), // Service rating (0-5)
    description: v.optional(v.string()),
    isActive: v.boolean(),
    order: v.number(), // Display order (lower = shown first)
    requestCount: v.number(), // Number of requests for this service
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_order", ["order"]),

  // Service Favorites (user-service favorites)
  serviceFavorites: defineTable({
    userId: v.id("users"),
    serviceId: v.id("serviceCatalog"),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_userId_serviceId", ["userId", "serviceId"]),

  // Calendar Events
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(), // Time string like "10:00 AM"
    endTime: v.string(), // Time string like "11:00 AM"
    date: v.string(), // Date string in YYYY-MM-DD format
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_createdBy", ["createdBy"])
    .index("by_date_createdBy", ["date", "createdBy"]),

  // Voting Polls
  votes: defineTable({
    question: v.string(),
    options: v.array(v.string()), // Array of option labels
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_createdBy", ["createdBy"]),

  // Translations (for multi-language support)
  translations: defineTable({
    key: v.string(), // Translation key (e.g., "dashboard.title")
    language: v.union(v.literal("en"), v.literal("ar")), // Language code
    value: v.string(), // Translated text
    category: v.optional(v.string()), // Category for organization (e.g., "dashboard", "common", "forms")
    updatedBy: v.id("users"), // User who last updated this translation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_language", ["language"])
    .index("by_key_language", ["key", "language"])
    .index("by_category", ["category"]),

  // User Votes (tracks which user voted for which option in which poll)
  userVotes: defineTable({
    voteId: v.id("votes"),
    userId: v.id("users"),
    option: v.string(), // The option the user selected
    createdAt: v.number(),
  })
    .index("by_voteId", ["voteId"])
    .index("by_userId", ["userId"])
    .index("by_voteId_userId", ["voteId", "userId"]),

  // Suggestions
  suggestions: defineTable({
    category: v.string(), // e.g., "UI/UX", "Features", "Performance", "Other"
    content: v.string(), // The suggestion text
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("implemented"),
      v.literal("rejected")
    ),
    createdBy: v.id("users"),
    reviewedBy: v.union(v.id("users"), v.null()),
    reviewNotes: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_createdBy", ["createdBy"])
    .index("by_createdAt", ["createdAt"]),

  // Todos
  todos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(), // Timestamp for due date
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("overdue")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    createdBy: v.id("users"),
    completedAt: v.union(v.number(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_dueDate", ["dueDate"])
    .index("by_createdBy_status", ["createdBy", "status"]),

  // Email Integration Configuration
  emailSettings: defineTable({
    // SMTP Configuration for sending emails
    smtpEnabled: v.boolean(),
    smtpHost: v.string(),
    smtpPort: v.number(),
    smtpSecure: v.boolean(), // Use TLS/SSL
    smtpUser: v.string(),
    smtpPassword: v.string(), // Encrypted in production
    smtpFromEmail: v.string(), // From email address
    smtpFromName: v.optional(v.string()), // From name
    
    // IMAP/POP3 Configuration for receiving emails
    inboundEnabled: v.boolean(),
    inboundType: v.union(v.literal("imap"), v.literal("pop3")),
    inboundHost: v.string(),
    inboundPort: v.number(),
    inboundSecure: v.boolean(), // Use TLS/SSL
    inboundUser: v.string(),
    inboundPassword: v.string(), // Encrypted in production
    inboundMailbox: v.optional(v.string()), // Mailbox/folder to monitor (default: INBOX)
    
    // Inbound email processing settings
    inboundCreateTickets: v.boolean(), // Create tickets from inbound emails
    inboundTicketCategory: v.optional(v.string()), // Default category for email tickets
    inboundTicketPriority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    )),
    
    // General settings
    enabled: v.boolean(), // Master switch for email integration
    lastCheckedAt: v.union(v.number(), v.null()), // Last time inbound emails were checked
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_enabled", ["enabled"]),
});
