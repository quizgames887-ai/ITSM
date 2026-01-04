import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Get email settings (only one configuration allowed)
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("emailSettings")
      .collect();
    
    // Return the most recent settings (should only be one)
    return settings.length > 0 ? settings.sort((a, b) => b.updatedAt - a.updatedAt)[0] : null;
  },
});

// Create or update email settings
export const updateSettings = mutation({
  args: {
    // SMTP Configuration
    smtpEnabled: v.boolean(),
    smtpHost: v.string(),
    smtpPort: v.number(),
    smtpSecure: v.boolean(),
    smtpUser: v.string(),
    smtpPassword: v.string(),
    smtpFromEmail: v.string(),
    smtpFromName: v.optional(v.string()),
    
    // Inbound Configuration
    inboundEnabled: v.boolean(),
    inboundType: v.union(v.literal("imap"), v.literal("pop3")),
    inboundHost: v.string(),
    inboundPort: v.number(),
    inboundSecure: v.boolean(),
    inboundUser: v.string(),
    inboundPassword: v.string(),
    inboundMailbox: v.optional(v.string()),
    
    // Inbound Processing Settings
    inboundCreateTickets: v.boolean(),
    inboundTicketCategory: v.optional(v.string()),
    inboundTicketPriority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    )),
    
    // General
    enabled: v.boolean(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if settings already exist
    const existing = await ctx.db
      .query("emailSettings")
      .collect();
    
    if (existing.length > 0) {
      // Update existing settings (use the most recent one)
      const settings = existing.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      await ctx.db.patch(settings._id, {
        smtpEnabled: args.smtpEnabled,
        smtpHost: args.smtpHost,
        smtpPort: args.smtpPort,
        smtpSecure: args.smtpSecure,
        smtpUser: args.smtpUser,
        smtpPassword: args.smtpPassword,
        smtpFromEmail: args.smtpFromEmail,
        smtpFromName: args.smtpFromName ?? undefined,
        inboundEnabled: args.inboundEnabled,
        inboundType: args.inboundType,
        inboundHost: args.inboundHost,
        inboundPort: args.inboundPort,
        inboundSecure: args.inboundSecure,
        inboundUser: args.inboundUser,
        inboundPassword: args.inboundPassword,
        inboundMailbox: args.inboundMailbox ?? undefined,
        inboundCreateTickets: args.inboundCreateTickets,
        inboundTicketCategory: args.inboundTicketCategory ?? undefined,
        inboundTicketPriority: args.inboundTicketPriority ?? undefined,
        enabled: args.enabled,
        updatedAt: now,
      });
      return settings._id;
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert("emailSettings", {
        smtpEnabled: args.smtpEnabled,
        smtpHost: args.smtpHost,
        smtpPort: args.smtpPort,
        smtpSecure: args.smtpSecure,
        smtpUser: args.smtpUser,
        smtpPassword: args.smtpPassword,
        smtpFromEmail: args.smtpFromEmail,
        smtpFromName: args.smtpFromName ?? undefined,
        inboundEnabled: args.inboundEnabled,
        inboundType: args.inboundType,
        inboundHost: args.inboundHost,
        inboundPort: args.inboundPort,
        inboundSecure: args.inboundSecure,
        inboundUser: args.inboundUser,
        inboundPassword: args.inboundPassword,
        inboundMailbox: args.inboundMailbox ?? undefined,
        inboundCreateTickets: args.inboundCreateTickets,
        inboundTicketCategory: args.inboundTicketCategory ?? undefined,
        inboundTicketPriority: args.inboundTicketPriority ?? undefined,
        enabled: args.enabled,
        lastCheckedAt: null,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      return settingsId;
    }
  },
});

// Test SMTP connection
export const testSMTP = action({
  args: {
    smtpHost: v.string(),
    smtpPort: v.number(),
    smtpSecure: v.boolean(),
    smtpUser: v.string(),
    smtpPassword: v.string(),
    smtpFromEmail: v.string(),
    testEmail: v.string(), // Email address to send test email to
  },
  handler: async (ctx, args) => {
    // This would use an HTTP action to call an email service
    // For now, we'll return a mock response
    // In production, you would integrate with a service like Resend, SendGrid, AWS SES, etc.
    
    const now = Date.now();
    const testSubject = "Test Email from ITSM";
    
    try {
      // TODO: Implement actual SMTP test
      // Example with Resend API:
      // const response = await fetch("https://api.resend.com/emails", {
      //   method: "POST",
      //   headers: {
      //     "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     from: args.smtpFromEmail,
      //     to: args.testEmail,
      //     subject: testSubject,
      //     html: "<p>This is a test email to verify your SMTP configuration.</p>",
      //   }),
      // });
      // 
      // if (!response.ok) {
      //   const error = await response.json();
      //   throw new Error(error.message || "Failed to send test email");
      // }
      // 
      // const data = await response.json();
      // 
      // // Log the test email
      // await ctx.runMutation(api.email.logEmail, {
      //   to: args.testEmail,
      //   from: args.smtpFromEmail,
      //   subject: testSubject,
      //   status: "sent",
      //   messageId: data.id,
      //   sentAt: now,
      // });
      
      // For now, simulate success
      const messageId = "test-" + now;
      
      // Log the test email
      await ctx.runMutation(api.email.logEmail, {
        to: args.testEmail,
        from: args.smtpFromEmail,
        subject: testSubject,
        status: "sent",
        messageId,
        sentAt: now,
      });
      
      return {
        success: true,
        message: "SMTP test email sent successfully (simulated)",
      };
    } catch (error: any) {
      // Log the failure
      await ctx.runMutation(api.email.logEmail, {
        to: args.testEmail,
        from: args.smtpFromEmail,
        subject: testSubject,
        status: "failed",
        errorMessage: error.message || "Failed to send test email",
      });
      
      return {
        success: false,
        message: error.message || "Failed to send test email",
      };
    }
  },
});

// Test inbound email connection
export const testInbound = action({
  args: {
    inboundType: v.union(v.literal("imap"), v.literal("pop3")),
    inboundHost: v.string(),
    inboundPort: v.number(),
    inboundSecure: v.boolean(),
    inboundUser: v.string(),
    inboundPassword: v.string(),
    inboundMailbox: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This would use an HTTP action to test IMAP/POP3 connection
    // For now, we'll return a mock response
    // In production, you would use a library like node-imap or similar
    
    try {
      // TODO: Implement actual IMAP/POP3 test
      // Example with node-imap:
      // const Imap = require("imap");
      // const imap = new Imap({
      //   user: args.inboundUser,
      //   password: args.inboundPassword,
      //   host: args.inboundHost,
      //   port: args.inboundPort,
      //   tls: args.inboundSecure,
      // });
      // 
      // await new Promise((resolve, reject) => {
      //   imap.once("ready", resolve);
      //   imap.once("error", reject);
      //   imap.connect();
      // });
      // imap.end();
      
      // For now, simulate success
      return {
        success: true,
        message: "Inbound email connection test successful (simulated)",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to connect to email server",
      };
    }
  },
});

// Send email notification
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get email settings
    const settings = await ctx.runQuery(api.email.getSettings, {});
    
    if (!settings || !settings.enabled || !settings.smtpEnabled) {
      // Log the failure
      await ctx.runMutation(api.email.logEmail, {
        to: args.to,
        from: settings?.smtpFromEmail || "system",
        subject: args.subject,
        status: "failed",
        errorMessage: "Email integration is not enabled or configured",
      });
      throw new Error("Email integration is not enabled or configured");
    }
    
    const now = Date.now();
    let messageId: string | undefined;
    let status: "sent" | "failed" = "failed";
    let errorMessage: string | undefined;
    
    try {
      // TODO: Implement actual email sending
      // Example with Resend:
      // const response = await fetch("https://api.resend.com/emails", {
      //   method: "POST",
      //   headers: {
      //     "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     from: `${settings.smtpFromName || "ITSM"} <${settings.smtpFromEmail}>`,
      //     to: args.to,
      //     subject: args.subject,
      //     html: args.html,
      //     text: args.text || args.html.replace(/<[^>]*>/g, ""),
      //   }),
      // });
      // 
      // if (!response.ok) {
      //   const error = await response.json();
      //   throw new Error(error.message || "Failed to send email");
      // }
      // 
      // const data = await response.json();
      // messageId = data.id;
      // status = "sent";
      
      // For now, simulate success
      console.log("Email would be sent:", {
        to: args.to,
        subject: args.subject,
        from: settings.smtpFromEmail,
      });
      
      messageId = "simulated-" + now;
      status = "sent";
      
      // Log the email
      await ctx.runMutation(api.email.logEmail, {
        to: args.to,
        from: settings.smtpFromEmail,
        subject: args.subject,
        status,
        messageId,
        sentAt: now,
      });
      
      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      errorMessage = error.message || "Failed to send email";
      
      // Log the failure
      await ctx.runMutation(api.email.logEmail, {
        to: args.to,
        from: settings.smtpFromEmail,
        subject: args.subject,
        status: "failed",
        errorMessage,
      });
      
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  },
});

// Process inbound emails (to be called by cron job)
export const processInboundEmails = action({
  args: {},
  handler: async (ctx, args) => {
    // Get email settings
    const settings = await ctx.runQuery(api.email.getSettings, {});
    
    if (!settings || !settings.enabled || !settings.inboundEnabled || !settings.inboundCreateTickets) {
      return { processed: 0, message: "Inbound email processing is not enabled" };
    }
    
    try {
      // TODO: Implement actual email fetching and processing
      // This would:
      // 1. Connect to IMAP/POP3 server
      // 2. Fetch unread emails
      // 3. Parse emails
      // 4. Create tickets from emails
      // 5. Mark emails as processed
      
      // For now, simulate processing
      const now = Date.now();
      
      // Update last checked timestamp
      if (settings._id) {
        await ctx.runMutation(api.email.updateLastChecked, {
          settingsId: settings._id,
          timestamp: now,
        });
      }
      
      return {
        processed: 0,
        message: "Inbound email processing completed (simulated)",
      };
    } catch (error: any) {
      throw new Error(`Failed to process inbound emails: ${error.message}`);
    }
  },
});

// Update last checked timestamp
export const updateLastChecked = mutation({
  args: {
    settingsId: v.id("emailSettings"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.settingsId, {
      lastCheckedAt: args.timestamp,
    });
  },
});

// Log email sending attempt
export const logEmail = mutation({
  args: {
    to: v.string(),
    from: v.string(),
    subject: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("pending")),
    errorMessage: v.optional(v.string()),
    messageId: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLogs", {
      to: args.to,
      from: args.from,
      subject: args.subject,
      status: args.status,
      errorMessage: args.errorMessage ?? undefined,
      messageId: args.messageId ?? undefined,
      sentAt: args.sentAt ?? null,
      createdAt: Date.now(),
    });
  },
});

// Get email logs
export const getEmailLogs = query({
  args: {
    limit: v.optional(v.number()), // Limit number of logs to return (default: 100)
    status: v.optional(v.union(v.literal("sent"), v.literal("failed"), v.literal("pending"))), // Filter by status
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    
    // If status filter is provided, use status index
    if (args.status) {
      const status = args.status; // Capture for TypeScript narrowing
      const logs = await ctx.db
        .query("emailLogs")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
      return logs;
    } else {
      // Otherwise, use createdAt index for chronological order
      const logs = await ctx.db
        .query("emailLogs")
        .withIndex("by_createdAt")
        .order("desc")
        .take(limit);
      return logs;
    }
  },
});
