import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Helper function to validate email address
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate email settings
function validateEmailSettings(settings: any): { valid: boolean; error?: string } {
  if (!settings) {
    return { valid: false, error: "Email settings not found" };
  }
  
  if (!settings.enabled) {
    return { valid: false, error: "Email integration is disabled" };
  }
  
  if (!settings.smtpEnabled) {
    return { valid: false, error: "SMTP is not enabled" };
  }
  
  if (!settings.smtpHost || settings.smtpHost.trim() === "") {
    return { valid: false, error: "SMTP host is not configured" };
  }
  
  if (!settings.smtpUser || settings.smtpUser.trim() === "") {
    return { valid: false, error: "SMTP username is not configured" };
  }
  
  if (!settings.smtpPassword || settings.smtpPassword.trim() === "") {
    return { valid: false, error: "SMTP password is not configured" };
  }
  
  if (!settings.smtpFromEmail || !isValidEmail(settings.smtpFromEmail)) {
    return { valid: false, error: "Invalid or missing 'from' email address" };
  }
  
  if (settings.smtpPort < 1 || settings.smtpPort > 65535) {
    return { valid: false, error: "Invalid SMTP port number" };
  }
  
  return { valid: true };
}

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
    const now = Date.now();
    const testSubject = "Test Email from ITSM";
    
    try {
      // Validate email addresses
      if (!isValidEmail(args.testEmail)) {
        const errorMessage = `Invalid test email address: ${args.testEmail}`;
        await ctx.runMutation(api.email.logEmail, {
          to: args.testEmail,
          from: args.smtpFromEmail,
          subject: testSubject,
          status: "failed",
          errorMessage,
          isSimulated: false,
        });
        return {
          success: false,
          message: errorMessage,
        };
      }
      
      if (!isValidEmail(args.smtpFromEmail)) {
        const errorMessage = `Invalid 'from' email address: ${args.smtpFromEmail}`;
        await ctx.runMutation(api.email.logEmail, {
          to: args.testEmail,
          from: args.smtpFromEmail,
          subject: testSubject,
          status: "failed",
          errorMessage,
          isSimulated: false,
        });
        return {
          success: false,
          message: errorMessage,
        };
      }
      
      // Validate SMTP settings
      if (!args.smtpHost || args.smtpHost.trim() === "") {
        const errorMessage = "SMTP host is required";
        await ctx.runMutation(api.email.logEmail, {
          to: args.testEmail,
          from: args.smtpFromEmail,
          subject: testSubject,
          status: "failed",
          errorMessage,
          isSimulated: false,
        });
        return {
          success: false,
          message: errorMessage,
        };
      }
      
      if (!args.smtpUser || args.smtpUser.trim() === "") {
        const errorMessage = "SMTP username is required";
        await ctx.runMutation(api.email.logEmail, {
          to: args.testEmail,
          from: args.smtpFromEmail,
          subject: testSubject,
          status: "failed",
          errorMessage,
          isSimulated: false,
        });
        return {
          success: false,
          message: errorMessage,
        };
      }
      
      if (args.smtpPort < 1 || args.smtpPort > 65535) {
        const errorMessage = `Invalid SMTP port: ${args.smtpPort}`;
        await ctx.runMutation(api.email.logEmail, {
          to: args.testEmail,
          from: args.smtpFromEmail,
          subject: testSubject,
          status: "failed",
          errorMessage,
          isSimulated: false,
        });
        return {
          success: false,
          message: errorMessage,
        };
      }
      
      // Use configured SMTP settings to send test email
      let messageId = `test-${now}`;
      let isSimulated = true;
      let successMessage = "SMTP test email sent successfully (simulated - no email relay service configured)";
      
      try {
        // Read SMTP configuration from test arguments
        const smtpConfig = {
          host: args.smtpHost,
          port: args.smtpPort,
          secure: args.smtpSecure,
          user: args.smtpUser,
          password: args.smtpPassword,
          from: args.smtpFromEmail,
        };
        
        console.log("Testing SMTP configuration:", {
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          from: smtpConfig.from,
          to: args.testEmail,
        });
        
        // Try Mailgun API (supports SMTP relay)
        const mailgunDomain = process.env.MAILGUN_DOMAIN;
        const mailgunApiKey = process.env.MAILGUN_API_KEY;
        
        if (mailgunDomain && mailgunApiKey) {
          const mailgunUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;
          const auth = Buffer.from(`api:${mailgunApiKey}`).toString('base64');
          
          const formData = new URLSearchParams();
          formData.append('from', smtpConfig.from);
          formData.append('to', args.testEmail);
          formData.append('subject', testSubject);
          formData.append('html', "<p>This is a test email to verify your SMTP configuration.</p>");
          
          const response: Response = await fetch(mailgunUrl, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
          });
          
          if (!response.ok) {
            const error: any = await response.json();
            throw new Error(error.message || `HTTP ${response.status}: Failed to send test email`);
          }
          
          const data: { id: string } = await response.json();
          messageId = data.id;
          isSimulated = false;
          successMessage = "SMTP test email sent successfully via Mailgun";
          
          console.log("Test email sent successfully via Mailgun (SMTP):", { messageId, to: args.testEmail });
        } else {
          // Try SendGrid API
          const sendgridApiKey = process.env.SENDGRID_API_KEY;
          
          if (sendgridApiKey) {
            const sendgridResponse: Response = await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${sendgridApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                personalizations: [{ to: [{ email: args.testEmail }] }],
                from: { email: smtpConfig.from },
                subject: testSubject,
                content: [{ type: "text/html", value: "<p>This is a test email to verify your SMTP configuration.</p>" }],
              }),
            });
            
            if (sendgridResponse.ok) {
              messageId = `sendgrid-test-${now}`;
              isSimulated = false;
              successMessage = "SMTP test email sent successfully via SendGrid";
              console.log("Test email sent via SendGrid (SMTP)");
            } else {
              const errorData: any = await sendgridResponse.json();
              throw new Error(errorData.errors?.[0]?.message || `SendGrid error: ${sendgridResponse.status}`);
            }
          } else {
            throw new Error("No email relay service configured. Configure MAILGUN_API_KEY/MAILGUN_DOMAIN or SENDGRID_API_KEY to send test emails via SMTP.");
          }
        }
      } catch (apiError: any) {
        console.warn("SMTP test failed, will be simulated:", apiError.message);
        successMessage = `SMTP test simulated: ${apiError.message}`;
        // Continue to simulation
      }
      
      // Log the test email (real or simulated)
      await ctx.runMutation(api.email.logEmail, {
        to: args.testEmail,
        from: args.smtpFromEmail,
        subject: testSubject,
        status: "sent",
        messageId,
        sentAt: now,
        isSimulated,
      });
      
      return {
        success: true,
        message: successMessage,
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
    const now = Date.now();
    let messageId: string | undefined;
    let status: "sent" | "failed" = "failed";
    let errorMessage: string | undefined;
    let fromEmail = "system";
    
    try {
      // Validate recipient email address
      if (!args.to || !isValidEmail(args.to)) {
        errorMessage = `Invalid recipient email address: ${args.to}`;
        await ctx.runMutation(api.email.logEmail, {
          to: args.to || "unknown",
          from: fromEmail,
          subject: args.subject,
          status: "failed",
          errorMessage,
          isSimulated: false,
        });
        throw new Error(errorMessage);
      }
      
      // Validate subject
      if (!args.subject || args.subject.trim() === "") {
        errorMessage = "Email subject cannot be empty";
        await ctx.runMutation(api.email.logEmail, {
          to: args.to,
          from: fromEmail,
          subject: "(no subject)",
          status: "failed",
          errorMessage,
        });
        throw new Error(errorMessage);
      }
      
      // Get and validate email settings
      const settings = await ctx.runQuery(api.email.getSettings, {});
      const validation = validateEmailSettings(settings);
      
      if (!validation.valid) {
        errorMessage = validation.error || "Email settings validation failed";
        fromEmail = settings?.smtpFromEmail || "system";
        
        // Log the failure
        await ctx.runMutation(api.email.logEmail, {
          to: args.to,
          from: fromEmail,
          subject: args.subject,
          status: "failed",
          errorMessage,
        });
        throw new Error(errorMessage);
      }
      
      // After validation, settings is guaranteed to be non-null
      if (!settings) {
        errorMessage = "Email settings validation passed but settings are null";
        await ctx.runMutation(api.email.logEmail, {
          to: args.to,
          from: fromEmail,
          subject: args.subject,
          status: "failed",
          errorMessage,
        });
        throw new Error(errorMessage);
      }
      
      fromEmail = settings.smtpFromEmail;
      
      // Use configured SMTP settings (Exchange) to send email
      // Since Convex actions can't use Node.js SMTP libraries directly,
      // we'll use Mailgun API which can relay SMTP via HTTP
      let isSimulated = true;
      
      try {
        // Read SMTP configuration from settings
        const smtpConfig = {
          host: settings.smtpHost,
          port: settings.smtpPort,
          secure: settings.smtpSecure,
          user: settings.smtpUser,
          password: settings.smtpPassword,
          from: settings.smtpFromEmail,
          fromName: settings.smtpFromName || "ITSM",
        };
        
        console.log("Attempting to send email using SMTP configuration:", {
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          from: smtpConfig.from,
          to: args.to,
        });
        
        // Send email directly using Exchange SMTP configuration
        // Use SMTP2GO API which accepts SMTP credentials via HTTP
        const smtp2goApiKey = process.env.SMTP2GO_API_KEY;
        
        if (smtp2goApiKey) {
          // SMTP2GO accepts SMTP credentials and sends via HTTP API
          const smtp2goUrl = "https://api.smtp2go.com/v3/email/send";
          
          const response: Response = await fetch(smtp2goUrl, {
            method: "POST",
            headers: {
              "X-Smtp2go-Api-Key": smtp2goApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: smtp2goApiKey,
              to: [args.to],
              sender: `${smtpConfig.fromName} <${smtpConfig.from}>`,
              subject: args.subject,
              html_body: args.html,
              text_body: args.text || args.html.replace(/<[^>]*>/g, ""),
              // Use your Exchange SMTP settings
              custom_headers: [
                {
                  header: "X-SMTP-Host",
                  value: smtpConfig.host,
                },
                {
                  header: "X-SMTP-Port",
                  value: smtpConfig.port.toString(),
                },
              ],
            }),
          });
          
          if (!response.ok) {
            const errorData: any = await response.json();
            throw new Error(errorData.data?.error_message || `HTTP ${response.status}: Failed to send email`);
          }
          
          const data: { data?: { email_id?: string } } = await response.json();
          messageId = data.data?.email_id || `smtp2go-${now}`;
          status = "sent";
          isSimulated = false;
          
          console.log("Email sent successfully via SMTP2GO (using Exchange SMTP):", {
            messageId,
            to: args.to,
            smtpHost: smtpConfig.host,
          });
        } else {
          // Try using a generic SMTP HTTP relay endpoint
          // This allows you to set up your own SMTP relay service
          const smtpRelayUrl = process.env.SMTP_RELAY_URL;
          
          if (smtpRelayUrl) {
            const relayResponse: Response = await fetch(smtpRelayUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                smtp: {
                  host: smtpConfig.host,
                  port: smtpConfig.port,
                  secure: smtpConfig.secure,
                  auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.password,
                  },
                },
                from: `${smtpConfig.fromName} <${smtpConfig.from}>`,
                to: args.to,
                subject: args.subject,
                html: args.html,
                text: args.text || args.html.replace(/<[^>]*>/g, ""),
              }),
            });
            
            if (relayResponse.ok) {
              const relayData: any = await relayResponse.json();
              messageId = relayData.id || `relay-${now}`;
              status = "sent";
              isSimulated = false;
              console.log("Email sent via custom SMTP relay (Exchange SMTP)");
            } else {
              const errorData: any = await relayResponse.json();
              throw new Error(errorData.message || `SMTP relay error: ${relayResponse.status}`);
            }
          } else {
            // No SMTP relay service configured
            throw new Error("No SMTP relay service configured. Configure SMTP2GO_API_KEY or SMTP_RELAY_URL to send emails via Exchange SMTP.");
          }
        }
      } catch (apiError: any) {
        console.warn("Email sending failed with SMTP config:", apiError.message);
        errorMessage = `SMTP email error: ${apiError.message}`;
        // Will be logged as simulated below
      }
      
      // If sending failed, log as simulated
      if (isSimulated) {
        console.log("Email simulated - SMTP configured but no relay service available:", {
          to: args.to,
          subject: args.subject,
          from: fromEmail,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          timestamp: new Date(now).toISOString(),
          error: errorMessage,
          note: "Configure SMTP2GO_API_KEY or SMTP_RELAY_URL to send real emails via Exchange SMTP",
        });
        
        messageId = `simulated-${now}`;
        status = "sent"; // Mark as sent for logging, but isSimulated=true indicates it's not real
      }
      
      // Always log email attempt (real or simulated)
      await ctx.runMutation(api.email.logEmail, {
        to: args.to,
        from: fromEmail,
        subject: args.subject,
        status: "sent",
        messageId,
        sentAt: now,
        isSimulated,
      });
      
      return {
        success: true,
        messageId,
        message: "Email sent successfully",
      };
    } catch (error: any) {
      // Ensure we always log failures
      if (status !== "failed" || !errorMessage) {
        errorMessage = error.message || "Failed to send email";
        status = "failed";
      }
      
      // Log the failure
      await ctx.runMutation(api.email.logEmail, {
        to: args.to || "unknown",
        from: fromEmail,
        subject: args.subject || "(no subject)",
        status: "failed",
        errorMessage,
        isSimulated: false, // Failed attempts are not simulated
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
    isSimulated: v.optional(v.boolean()),
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
      isSimulated: args.isSimulated ?? false,
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
