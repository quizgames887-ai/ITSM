import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Get access token for Microsoft Graph API
async function getAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to get access token: ${error.error_description || response.statusText}`
    );
  }

  return await response.json();
}

// Send email via Microsoft Graph API
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    fromEmail: v.string(), // Service account email
    tenantId: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      content: v.string(), // Base64 encoded content
      contentType: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    try {
      // Get access token
      const tokenData = await getAccessToken(
        args.tenantId,
        args.clientId,
        args.clientSecret
      );

      // Prepare email message
      const message: any = {
        message: {
          subject: args.subject,
          body: {
            contentType: "HTML",
            content: args.html,
          },
          toRecipients: args.to.split(",").map((email) => ({
            emailAddress: {
              address: email.trim(),
            },
          })),
        },
        saveToSentItems: true,
      };

      // Add plain text alternative if provided
      if (args.text) {
        message.message.body = {
          contentType: "HTML",
          content: args.html,
        };
        // Note: Graph API doesn't support multipart/alternative directly
        // We'll use HTML body, but include text in a comment or use HTML
      }

      // Add attachments if provided
      if (args.attachments && args.attachments.length > 0) {
        message.message.attachments = args.attachments.map((att) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: att.name,
          contentBytes: att.content, // Already base64 encoded
          contentType: att.contentType,
        }));
      }

      // Send email via Graph API
      const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(args.fromEmail)}/sendMail`;
      const response = await fetch(graphUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to send email: ${error.error?.message || response.statusText}`
        );
      }

      // Extract message ID from response headers or generate one
      const messageId = response.headers.get("x-request-id") || `graph-${Date.now()}`;

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      throw new Error(`Exchange Online send failed: ${error.message}`);
    }
  },
});

// Get messages from Exchange Online mailbox
export const getMessages = action({
  args: {
    userEmail: v.string(),
    tenantId: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
    top: v.optional(v.number()), // Number of messages to retrieve
    filter: v.optional(v.string()), // OData filter (e.g., "isRead eq false")
  },
  handler: async (ctx, args) => {
    try {
      // Get access token
      const tokenData = await getAccessToken(
        args.tenantId,
        args.clientId,
        args.clientSecret
      );

      // Build query parameters
      const params = new URLSearchParams();
      if (args.top) {
        params.append("$top", args.top.toString());
      }
      if (args.filter) {
        params.append("$filter", args.filter);
      }
      params.append("$select", "id,subject,from,receivedDateTime,bodyPreview,isRead");

      // Get messages from mailbox
      const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(args.userEmail)}/messages?${params.toString()}`;
      const response = await fetch(graphUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to get messages: ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return {
        success: true,
        messages: data.value || [],
      };
    } catch (error: any) {
      throw new Error(`Exchange Online get messages failed: ${error.message}`);
    }
  },
});

// Get a specific message by ID
export const getMessage = action({
  args: {
    userEmail: v.string(),
    messageId: v.string(),
    tenantId: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get access token
      const tokenData = await getAccessToken(
        args.tenantId,
        args.clientId,
        args.clientSecret
      );

      // Get message
      const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(args.userEmail)}/messages/${args.messageId}`;
      const response = await fetch(graphUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to get message: ${error.error?.message || response.statusText}`
        );
      }

      const message = await response.json();
      return {
        success: true,
        message,
      };
    } catch (error: any) {
      throw new Error(`Exchange Online get message failed: ${error.message}`);
    }
  },
});
