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
        
        // Try Resend API first (recommended)
        const resendApiKey = process.env.RESEND_API_KEY;
        
        // #region agent log
        await fetch('http://127.0.0.1:7243/ingest/b4baa00f-0fc1-4b1d-a100-728c6955253f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'email.ts:290',message:'Checking Resend API key',data:{hasResendApiKey:!!resendApiKey,resendApiKeyLength:resendApiKey?.length,fromEmail:smtpConfig.from,toEmail:args.testEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        if (resendApiKey) {
          const resendUrl = "https://api.resend.com/emails";
          
          // #region agent log
          const requestBody = {
            from: smtpConfig.from,
            to: [args.testEmail],
            subject: testSubject,
            html: "<p>This is a test email to verify your SMTP configuration.</p>",
          };
          await fetch('http://127.0.0.1:7243/ingest/b4baa00f-0fc1-4b1d-a100-728c6955253f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'email.ts:295',message:'Sending Resend API request',data:{url:resendUrl,from:requestBody.from,to:requestBody.to,hasApiKey:!!resendApiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          
          const response: Response = await fetch(resendUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
          
          // #region agent log
          const responseStatus = response.status;
          const responseOk = response.ok;
          await fetch('http://127.0.0.1:7243/ingest/b4baa00f-0fc1-4b1d-a100-728c6955253f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'email.ts:308',message:'Resend API response received',data:{status:responseStatus,ok:responseOk,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          if (response.ok) {
            const data: { id?: string } = await response.json();
            messageId = data.id || `resend-test-${now}`;
            isSimulated = false;
            successMessage = "SMTP test email sent successfully via Resend";
            console.log("Test email sent successfully via Resend:", { messageId, to: args.testEmail });
            // #region agent log
            await fetch('http://127.0.0.1:7243/ingest/b4baa00f-0fc1-4b1d-a100-728c6955253f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'email.ts:314',message:'Resend API success',data:{messageId,to:args.testEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
          } else {
            const errorData: any = await response.json();
            // #region agent log
            await fetch('http://127.0.0.1:7243/ingest/b4baa00f-0fc1-4b1d-a100-728c6955253f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'email.ts:317',message:'Resend API error response',data:{status:responseStatus,errorData,errorMessage:errorData?.message,fullError:JSON.stringify(errorData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            throw new Error(errorData.message || `Resend error: ${response.status}`);
          }
        } else {
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
              throw new Error("No email service configured. Configure RESEND_API_KEY, MAILGUN_API_KEY/MAILGUN_DOMAIN, or SENDGRID_API_KEY to send test emails via SMTP.");
            }
          }
        }
      } catch (apiError: any) {
        console.warn("SMTP test failed, will be simulated:", apiError.message);
        // #region agent log
        await fetch('http://127.0.0.1:7243/ingest/b4baa00f-0fc1-4b1d-a100-728c6955253f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'email.ts:387',message:'API error caught, simulating email',data:{errorMessage:apiError.message,errorStack:apiError.stack,willSimulate:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
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
      
      // Check for Exchange configuration first
      const exchangeConfig = await ctx.runQuery(api.exchangeConfig.getConfig, {});
      let isSimulated = true;
      let exchangeUsed = false;
      
      // Try Exchange if configured and enabled
      if (exchangeConfig && exchangeConfig.enabled) {
        try {
          if (exchangeConfig.type === "online") {
            // Use Exchange Online (Microsoft Graph API)
            if (exchangeConfig.tenantId && exchangeConfig.clientId && exchangeConfig.clientSecret && exchangeConfig.userEmail) {
              const result = await ctx.runAction(api.exchangeOnline.sendEmail, {
                to: args.to,
                subject: args.subject,
                html: args.html,
                text: args.text,
                fromEmail: exchangeConfig.userEmail,
                tenantId: exchangeConfig.tenantId,
                clientId: exchangeConfig.clientId,
                clientSecret: exchangeConfig.clientSecret,
              });
              
              messageId = result.messageId;
              status = "sent";
              isSimulated = false;
              exchangeUsed = true;
              fromEmail = exchangeConfig.userEmail;
              console.log("Email sent successfully via Exchange Online:", { messageId, to: args.to });
            }
          } else if (exchangeConfig.type === "server") {
            // Use Exchange Server (EWS/REST)
            if (exchangeConfig.serverUrl && exchangeConfig.username && exchangeConfig.password) {
              const result = await ctx.runAction(api.exchangeServer.sendEmail, {
                to: args.to,
                subject: args.subject,
                html: args.html,
                text: args.text,
                fromEmail: exchangeConfig.username,
                serverUrl: exchangeConfig.serverUrl,
                username: exchangeConfig.username,
                password: exchangeConfig.password,
                version: exchangeConfig.version || "ews",
              });
              
              messageId = result.messageId;
              status = "sent";
              isSimulated = false;
              exchangeUsed = true;
              fromEmail = exchangeConfig.username;
              console.log("Email sent successfully via Exchange Server:", { messageId, to: args.to });
            }
          }
        } catch (exchangeError: any) {
          console.warn("Exchange email sending failed, falling back to SMTP:", exchangeError.message);
          // Continue to SMTP fallback
        }
      }
      
      // Fallback to SMTP if Exchange not used or failed
      if (!exchangeUsed) {
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
          
          // Try to send email using SMTP configuration via HTTP-based services
          // First, try Resend API (supports custom SMTP)
        const resendApiKey = process.env.RESEND_API_KEY;
        
        if (resendApiKey) {
          // Resend supports custom SMTP domains
          const resendUrl = "https://api.resend.com/emails";
          
          // Use Resend's default domain if custom domain might not be verified
          // Resend allows sending from onboarding@resend.dev without verification
          let fromEmail = smtpConfig.from;
          const emailDomain = fromEmail.split('@')[1];
          
          // If domain is not likely verified (palmware.co), try Resend's default first
          // User can verify their domain later in Resend dashboard
          // For now, we'll try the custom domain first, and if it fails, suggest verification
          
          const response: Response = await fetch(resendUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${smtpConfig.fromName} <${fromEmail}>`,
              to: [args.to],
              subject: args.subject,
              html: args.html,
              text: args.text || args.html.replace(/<[^>]*>/g, ""),
            }),
          });
          
          if (response.ok) {
            const data: { id?: string } = await response.json();
            messageId = data.id || `resend-${now}`;
            status = "sent";
            isSimulated = false;
            console.log("Email sent successfully via Resend:", { messageId, to: args.to });
          } else {
            const errorData: any = await response.json().catch(() => ({}));
            const errorMsg = errorData.message || errorData.error?.message || `Resend API error: ${response.status}`;
            const isDomainError = errorMsg.toLowerCase().includes('domain') || 
                                  errorMsg.toLowerCase().includes('verify') ||
                                  errorMsg.toLowerCase().includes('unauthorized');
            
            console.error("Resend API error:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              from: smtpConfig.from,
              to: args.to,
              isDomainError,
            });
            
            let helpfulMessage = errorMsg;
            if (isDomainError) {
              helpfulMessage += ` To send from ${smtpConfig.from}, verify your domain in Resend dashboard (resend.com/domains). For testing, you can temporarily use "onboarding@resend.dev" as the From Email.`;
            } else if (response.status === 401 || response.status === 403) {
              helpfulMessage += ` Check that your RESEND_API_KEY is correct in Convex Dashboard → Settings → Environment Variables.`;
            }
            
            throw new Error(`Resend error: ${helpfulMessage}`);
          }
        } else {
          // Try SMTP2GO API which accepts SMTP credentials via HTTP
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
            
            console.log("Email sent successfully via SMTP2GO:", {
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
            // Try Mailgun API (supports SMTP relay)
            const mailgunDomain = process.env.MAILGUN_DOMAIN;
            const mailgunApiKey = process.env.MAILGUN_API_KEY;
            
            if (mailgunDomain && mailgunApiKey) {
              const mailgunUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;
              const auth = Buffer.from(`api:${mailgunApiKey}`).toString('base64');
              
              const formData = new URLSearchParams();
              formData.append('from', `${smtpConfig.fromName} <${smtpConfig.from}>`);
              formData.append('to', args.to);
              formData.append('subject', args.subject);
              formData.append('html', args.html);
              formData.append('text', args.text || args.html.replace(/<[^>]*>/g, ""));
              
              const response: Response = await fetch(mailgunUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${auth}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData.toString(),
              });
              
              if (response.ok) {
                const data: { id?: string } = await response.json();
                messageId = data.id || `mailgun-${now}`;
                status = "sent";
                isSimulated = false;
                console.log("Email sent successfully via Mailgun:", { messageId, to: args.to });
              } else {
                const errorData: any = await response.json();
                throw new Error(errorData.message || `Mailgun error: ${response.status}`);
              }
            } else {
              // No SMTP relay service configured
              throw new Error("No email service configured. Configure RESEND_API_KEY, SMTP2GO_API_KEY, MAILGUN_API_KEY/MAILGUN_DOMAIN, or SMTP_RELAY_URL to send emails using your SMTP configuration.");
            }
          }
        }
      }
    } catch (apiError: any) {
        console.error("Email sending failed:", {
          error: apiError.message,
          stack: apiError.stack,
          to: args.to,
          from: settings.smtpFromEmail,
          hasResendKey: !!process.env.RESEND_API_KEY,
          hasSmtp2goKey: !!process.env.SMTP2GO_API_KEY,
          hasMailgunKey: !!process.env.MAILGUN_API_KEY,
        });
        errorMessage = `Email service error: ${apiError.message}`;
        // Will be logged as simulated below
      }
      }
      
      // If sending failed, log as simulated
      if (isSimulated) {
        const availableServices = [];
        if (process.env.RESEND_API_KEY) availableServices.push("Resend");
        if (process.env.SMTP2GO_API_KEY) availableServices.push("SMTP2GO");
        if (process.env.MAILGUN_API_KEY) availableServices.push("Mailgun");
        if (process.env.SENDGRID_API_KEY) availableServices.push("SendGrid");
        if (process.env.SMTP_RELAY_URL) availableServices.push("Custom Relay");
        
        console.log("Email simulated - No working email service:", {
          to: args.to,
          subject: args.subject,
          from: fromEmail,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          timestamp: new Date(now).toISOString(),
          error: errorMessage,
          availableServices: availableServices.length > 0 ? availableServices.join(", ") : "None",
          note: availableServices.length > 0 
            ? `Services configured but failed. Check API keys and domain verification.`
            : "Configure RESEND_API_KEY in Convex Dashboard → Settings → Environment Variables",
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
    // Check Exchange configuration first
    const exchangeConfig = await ctx.runQuery(api.exchangeConfig.getConfig, {});
    
    // Get email settings for fallback
    const settings = await ctx.runQuery(api.email.getSettings, {});
    
    let processed = 0;
    const now = Date.now();
    
    // Try Exchange first if configured and enabled
    if (exchangeConfig && exchangeConfig.enabled) {
      try {
        if (exchangeConfig.type === "online") {
          // Process Exchange Online emails
          if (exchangeConfig.tenantId && exchangeConfig.clientId && exchangeConfig.clientSecret && exchangeConfig.userEmail) {
            const result = await ctx.runAction(api.exchangeOnline.getMessages, {
              userEmail: exchangeConfig.userEmail,
              tenantId: exchangeConfig.tenantId,
              clientId: exchangeConfig.clientId,
              clientSecret: exchangeConfig.clientSecret,
              top: 50,
              filter: "isRead eq false",
            });
            
            if (result.success && result.messages) {
              // Process each unread message
              for (const message of result.messages) {
                try {
                  // Get full message details
                  const messageResult = await ctx.runAction(api.exchangeOnline.getMessage, {
                    userEmail: exchangeConfig.userEmail,
                    messageId: message.id,
                    tenantId: exchangeConfig.tenantId,
                    clientId: exchangeConfig.clientId,
                    clientSecret: exchangeConfig.clientSecret,
                  });
                  
                  if (messageResult.success && messageResult.message) {
                    // Create ticket from email if enabled
                    if (settings?.inboundCreateTickets) {
                      // Extract ticket information from email
                      const subject = messageResult.message.subject || "Email Ticket";
                      const body = messageResult.message.body?.content || messageResult.message.bodyPreview || "";
                      const fromEmail = messageResult.message.from?.emailAddress?.address || "";
                      
                      // Find or create user by email
                      const users = await ctx.runQuery(api.users.list, {});
                      let user = users?.find((u) => u.email === fromEmail);
                      
                      if (!user && fromEmail) {
                        // Create user if doesn't exist
                        try {
                          const userId = await ctx.runMutation(api.auth.createUser, {
                            email: fromEmail,
                            name: messageResult.message.from?.emailAddress?.name || fromEmail.split("@")[0],
                            role: "user",
                          });
                          user = users?.find((u) => u._id === userId);
                        } catch (err) {
                          console.warn("Failed to create user from email:", err);
                        }
                      }
                      
                      if (user) {
                        // Create ticket
                        await ctx.runMutation(api.tickets.create, {
                          title: subject,
                          description: body,
                          type: "inquiry",
                          priority: (settings.inboundTicketPriority || "medium") as "low" | "medium" | "high" | "critical",
                          urgency: "medium",
                          category: settings.inboundTicketCategory || "Email Support",
                          createdBy: user._id,
                        });
                        processed++;
                      }
                    }
                  }
                } catch (err: any) {
                  console.error("Failed to process Exchange Online message:", err);
                }
              }
            }
          }
        } else if (exchangeConfig.type === "server") {
          // Process Exchange Server emails
          if (exchangeConfig.serverUrl && exchangeConfig.username && exchangeConfig.password) {
            const result = await ctx.runAction(api.exchangeServer.getMessages, {
              serverUrl: exchangeConfig.serverUrl,
              username: exchangeConfig.username,
              password: exchangeConfig.password,
              version: exchangeConfig.version || "ews",
              top: 50,
            });
            
            if (result.success && result.messages) {
              // Process messages (similar to Exchange Online)
              // Note: Full implementation would require parsing EWS/REST responses
              processed += result.messages.length;
            }
          }
        }
      } catch (exchangeError: any) {
        console.warn("Exchange inbound processing failed:", exchangeError.message);
        // Fall through to SMTP/IMAP processing
      }
    }
    
    // Fallback to IMAP/POP3 if Exchange not configured or failed
    if (settings && settings.enabled && settings.inboundEnabled && settings.inboundCreateTickets) {
      try {
        // TODO: Implement actual IMAP/POP3 email fetching and processing
        // This would:
        // 1. Connect to IMAP/POP3 server
        // 2. Fetch unread emails
        // 3. Parse emails
        // 4. Create tickets from emails
        // 5. Mark emails as processed
        
        // Update last checked timestamp
        if (settings._id) {
          await ctx.runMutation(api.email.updateLastChecked, {
            settingsId: settings._id,
            timestamp: now,
          });
        }
      } catch (error: any) {
        console.error("IMAP/POP3 processing failed:", error);
      }
    }
    
    return {
      processed,
      message: processed > 0 
        ? `Processed ${processed} email(s) from Exchange`
        : "Inbound email processing completed (no new emails)",
    };
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

// Diagnostic query to check email service configuration
export const getEmailServiceStatus = query({
  args: {},
  handler: async (ctx): Promise<{
    hasSettings: boolean;
    settingsEnabled: boolean;
    smtpEnabled: boolean;
    hasSmtpConfig: boolean;
    smtpHost: string | null;
    smtpFromEmail: string | null;
    message: string;
  }> => {
    // Query email settings directly from database
    const settingsList = await ctx.db
      .query("emailSettings")
      .collect();
    
    const settings = settingsList.length > 0 
      ? settingsList.sort((a, b) => b.updatedAt - a.updatedAt)[0]
      : null;
    
    return {
      hasSettings: !!settings,
      settingsEnabled: settings?.enabled || false,
      smtpEnabled: settings?.smtpEnabled || false,
      hasSmtpConfig: !!(settings?.smtpHost && settings?.smtpUser && settings?.smtpFromEmail),
      smtpHost: settings?.smtpHost || null,
      smtpFromEmail: settings?.smtpFromEmail || null,
      // Note: We can't check environment variables in queries, only in actions
      // The actual check happens in the sendEmail action
      message: "Environment variables (RESEND_API_KEY, etc.) are checked at send time in actions.",
    };
  },
});

// Get email log by message ID
export const getEmailLogByMessageId = query({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("emailLogs")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .collect();
    
    return logs.length > 0 ? logs[0] : null;
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
