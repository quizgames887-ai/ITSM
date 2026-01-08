import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get chat messages for a ticket
export const getMessages = query({
  args: {
    ticketId: v.id("tickets"),
    userId: v.id("users"), // Current user ID
  },
  handler: async (ctx, args) => {
    // Get all messages for this ticket
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .collect();

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
    ticketId: v.id("tickets"),
    senderId: v.id("users"),
    content: v.string(),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const sender = await ctx.db.get(args.senderId);
    if (!sender) {
      throw new Error("Sender not found");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Create the message
    const messageId = await ctx.db.insert("chatMessages", {
      ticketId: args.ticketId,
      senderId: args.senderId,
      content: args.content.trim(),
      attachmentIds: args.attachmentIds ?? [],
      read: false,
      createdAt: Date.now(),
    });

    // Update or create conversation
    const existingConversation = await ctx.db
      .query("chatConversations")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
      .first();

    const participants = new Set([args.senderId, ticket.createdBy]);
    if (ticket.assignedTo) {
      participants.add(ticket.assignedTo);
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
      await ctx.db.insert("notifications", {
        userId: participantId,
        type: "chat",
        title: `New message in ticket #${ticket._id.slice(-6).toUpperCase()}`,
        message: `${sender.name}: ${args.content.substring(0, 100)}${args.content.length > 100 ? "..." : ""}`,
        read: false,
        ticketId: args.ticketId,
        createdAt: Date.now(),
      });
    }

    return messageId;
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    ticketId: v.id("tickets"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
      .filter((q) => 
        q.and(
          q.neq(q.field("senderId"), args.userId),
          q.eq(q.field("read"), false)
        )
      )
      .collect();

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
      if (!conv.ticketId) continue;
      
      const unreadMessages = await ctx.db
        .query("chatMessages")
        .withIndex("by_ticketId", (q) => q.eq("ticketId", conv.ticketId!))
        .filter((q) => 
          q.and(
            q.neq(q.field("senderId"), args.userId),
            q.eq(q.field("read"), false)
          )
        )
        .collect();
      
      totalUnread += unreadMessages.length;
    }

    return totalUnread;
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
