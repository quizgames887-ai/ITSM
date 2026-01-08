import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get chat messages for a ticket, general chat, or direct conversation with an agent
export const getMessages = query({
  args: {
    ticketId: v.optional(v.id("tickets")), // Optional: can be general chat
    userId: v.id("users"), // Current user ID
    receiverId: v.optional(v.id("users")), // Optional: for direct conversation with specific agent/user
  },
  handler: async (ctx, args) => {
    // Get all messages - either for a ticket, general chat, or direct conversation
    let messages;
    if (args.ticketId) {
      messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
        .order("asc")
        .collect();
    } else if (args.receiverId) {
      // Direct conversation: get messages between current user and receiver
      // Messages where current user is sender and receiverId is receiver, OR vice versa
      const sentMessages = await ctx.db
        .query("chatMessages")
        .withIndex("by_receiverId", (q) => q.eq("receiverId", args.receiverId))
        .filter((q) => 
          q.and(
            q.eq(q.field("senderId"), args.userId),
            q.eq(q.field("ticketId"), undefined)
          )
        )
        .order("asc")
        .collect();
      
      const receivedMessages = await ctx.db
        .query("chatMessages")
        .withIndex("by_receiverId", (q) => q.eq("receiverId", args.userId))
        .filter((q) => 
          q.and(
            q.eq(q.field("senderId"), args.receiverId),
            q.eq(q.field("ticketId"), undefined)
          )
        )
        .order("asc")
        .collect();
      
      messages = [...sentMessages, ...receivedMessages].sort((a, b) => a.createdAt - b.createdAt);
    } else {
      // General chat: get messages without ticketId and without receiverId
      messages = await ctx.db
        .query("chatMessages")
        .filter((q) => 
          q.and(
            q.eq(q.field("ticketId"), undefined),
            q.eq(q.field("receiverId"), undefined)
          )
        )
        .order("asc")
        .collect();
    }

    // Get user details for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        const receiver = message.receiverId ? await ctx.db.get(message.receiverId) : null;
        
        return {
          ...message,
          senderName: sender?.name ?? "Unknown User",
          senderEmail: sender?.email ?? "",
          senderRole: sender?.role ?? "user",
          receiverName: receiver?.name ?? null,
          receiverEmail: receiver?.email ?? null,
        };
      })
    );

    return messagesWithUsers;
  },
});

// Send a chat message
export const sendMessage = mutation({
  args: {
    ticketId: v.optional(v.id("tickets")), // Optional: can be general chat
    senderId: v.id("users"),
    receiverId: v.optional(v.id("users")), // Optional: for direct conversation with specific agent/user
    content: v.string(),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const sender = await ctx.db.get(args.senderId);
    if (!sender) {
      throw new Error("Sender not found");
    }

    // If ticketId is provided, validate ticket exists
    if (args.ticketId) {
      const ticket = await ctx.db.get(args.ticketId);
      if (!ticket) {
        throw new Error("Ticket not found");
      }
    }

    // Create the message
    const messageId = await ctx.db.insert("chatMessages", {
      ticketId: args.ticketId ?? undefined,
      senderId: args.senderId,
      receiverId: args.receiverId ?? undefined,
      content: args.content.trim(),
      attachmentIds: args.attachmentIds ?? [],
      read: false,
      createdAt: Date.now(),
    });

    // Update or create conversation
    let existingConversation;
    if (args.ticketId) {
      existingConversation = await ctx.db
        .query("chatConversations")
        .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
        .first();
    } else if (args.receiverId) {
      // Direct conversation: find conversation between sender and receiver
      const allConversations = await ctx.db
        .query("chatConversations")
        .filter((q) => q.eq(q.field("ticketId"), undefined))
        .collect();
      
      // Find conversation that includes both sender and receiver
      existingConversation = allConversations.find(conv => 
        conv.participantIds.includes(args.senderId) && 
        conv.participantIds.includes(args.receiverId!) &&
        conv.participantIds.length === 2 // Only 2 participants for direct conversation
      );
    } else {
      // General chat: find conversation without ticketId and without specific receiver
      existingConversation = await ctx.db
        .query("chatConversations")
        .filter((q) => q.eq(q.field("ticketId"), undefined))
        .first();
    }

    // Get participants
    let participants: Set<Id<"users">>;
    if (args.ticketId) {
      const ticket = await ctx.db.get(args.ticketId);
      if (!ticket) throw new Error("Ticket not found");
      participants = new Set([args.senderId, ticket.createdBy]);
      if (ticket.assignedTo) {
        participants.add(ticket.assignedTo);
      }
    } else {
      // General chat: include all users (or get from existing conversation)
      if (existingConversation) {
        participants = new Set(existingConversation.participantIds);
        participants.add(args.senderId);
      } else {
        // For general chat, get all users as participants
        const allUsers = await ctx.db.query("users").collect();
        participants = new Set(allUsers.map(u => u._id));
      }
    }

    if (existingConversation) {
      // Update existing conversation
      await ctx.db.patch(existingConversation._id, {
        participantIds: Array.from(participants),
        lastMessageAt: Date.now(),
        lastMessageId: messageId,
        updatedAt: Date.now(),
      });
    } else {
      // Create new conversation
      await ctx.db.insert("chatConversations", {
        ticketId: args.ticketId,
        participantIds: Array.from(participants),
        lastMessageAt: Date.now(),
        lastMessageId: messageId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Create notifications for other participants
    const otherParticipants = Array.from(participants).filter(id => id !== args.senderId);
    for (const participantId of otherParticipants) {
      let notificationTitle: string;
      if (args.ticketId) {
        notificationTitle = `New message in ticket #${args.ticketId.slice(-6).toUpperCase()}`;
      } else if (args.receiverId) {
        notificationTitle = `New message from ${sender.name}`;
      } else {
        notificationTitle = "New chat message";
      }
      
      await ctx.db.insert("notifications", {
        userId: participantId,
        type: "chat",
        title: notificationTitle,
        message: `${sender.name}: ${args.content.substring(0, 100)}${args.content.length > 100 ? "..." : ""}`,
        read: false,
        ticketId: args.ticketId ?? null,
        createdAt: Date.now(),
      });
    }

    return messageId;
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    ticketId: v.optional(v.id("tickets")), // Optional: can be general chat
    userId: v.id("users"),
    receiverId: v.optional(v.id("users")), // Optional: for direct conversation
  },
  handler: async (ctx, args) => {
    let messages;
    if (args.ticketId) {
      messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
        .filter((q) => 
          q.and(
            q.neq(q.field("senderId"), args.userId),
            q.eq(q.field("read"), false)
          )
        )
        .collect();
    } else if (args.receiverId) {
      // Direct conversation: mark messages where user is receiver
      messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_receiverId", (q) => q.eq("receiverId", args.userId))
        .filter((q) => 
          q.and(
            q.eq(q.field("senderId"), args.receiverId),
            q.eq(q.field("ticketId"), undefined),
            q.eq(q.field("read"), false)
          )
        )
        .collect();
    } else {
      // General chat: get messages without ticketId and without receiverId
      messages = await ctx.db
        .query("chatMessages")
        .filter((q) => 
          q.and(
            q.eq(q.field("ticketId"), undefined),
            q.eq(q.field("receiverId"), undefined),
            q.neq(q.field("senderId"), args.userId),
            q.eq(q.field("read"), false)
          )
        )
        .collect();
    }

    const now = Date.now();
    for (const message of messages) {
      await ctx.db.patch(message._id, {
        read: true,
        readAt: now,
      });
    }

    return messages.length;
  },
});

// Get unread message count for a user
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all conversations where user is a participant
    const conversations = await ctx.db
      .query("chatConversations")
      .collect();

    const userConversations = conversations.filter(conv => 
      conv.participantIds.includes(args.userId)
    );

    let totalUnread = 0;
    for (const conv of userConversations) {
      let unreadMessages;
      if (conv.ticketId) {
        // Ticket-based chat
        unreadMessages = await ctx.db
          .query("chatMessages")
          .withIndex("by_ticketId", (q) => q.eq("ticketId", conv.ticketId!))
          .filter((q) => 
            q.and(
              q.neq(q.field("senderId"), args.userId),
              q.eq(q.field("read"), false)
            )
          )
          .collect();
      } else {
        // General chat
        unreadMessages = await ctx.db
          .query("chatMessages")
          .filter((q) => 
            q.and(
              q.eq(q.field("ticketId"), undefined),
              q.neq(q.field("senderId"), args.userId),
              q.eq(q.field("read"), false)
            )
          )
          .collect();
      }
      
      totalUnread += unreadMessages.length;
    }

    return totalUnread;
  },
});

// Get active chat sessions count for a user
export const getActiveSessionsCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all conversations where user is a participant
    const conversations = await ctx.db
      .query("chatConversations")
      .collect();

    // Filter conversations where user is a participant
    const userConversations = conversations.filter(conv => 
      conv.participantIds.includes(args.userId)
    );

    // Count active sessions (conversations with recent activity in last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const activeSessions = userConversations.filter(conv => 
      conv.lastMessageAt && conv.lastMessageAt >= oneDayAgo
    );

    return activeSessions.length;
  },
});

// Get storage URL for attachments
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Generate upload URL for file attachments
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
