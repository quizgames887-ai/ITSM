import { v } from "convex/values";
import { action } from "./_generated/server";

// Send email via Exchange Server EWS
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    fromEmail: v.string(),
    serverUrl: v.string(),
    username: v.string(),
    password: v.string(),
    version: v.union(v.literal("ews"), v.literal("rest")),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      content: v.string(), // Base64 encoded content
      contentType: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    try {
      if (args.version === "rest") {
        // Use Exchange REST API (Exchange 2013+)
        return await sendEmailViaREST(args);
      } else {
        // Use EWS SOAP API
        return await sendEmailViaEWS(args);
      }
    } catch (error: any) {
      throw new Error(`Exchange Server send failed: ${error.message}`);
    }
  },
});

// Send email via Exchange REST API
async function sendEmailViaREST(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail: string;
  serverUrl: string;
  username: string;
  password: string;
  attachments?: Array<{ name: string; content: string; contentType: string }>;
}): Promise<{ success: boolean; messageId: string }> {
  // Exchange REST API endpoint
  const restUrl = `${args.serverUrl.replace(/\/$/, "")}/api/v2.0/me/sendmail`;
  
  // Prepare email message
  const message: any = {
    Message: {
      Subject: args.subject,
      Body: {
        ContentType: "HTML",
        Content: args.html,
      },
      ToRecipients: args.to.split(",").map((email) => ({
        EmailAddress: {
          Address: email.trim(),
        },
      })),
    },
    SaveToSentItems: true,
  };

  // Add attachments if provided
  if (args.attachments && args.attachments.length > 0) {
    message.Message.Attachments = args.attachments.map((att) => ({
      "@odata.type": "#Microsoft.Exchange.Services.OData.Model.FileAttachment",
      Name: att.name,
      ContentBytes: att.content,
      ContentType: att.contentType,
    }));
  }

  // Basic authentication
  const auth = Buffer.from(`${args.username}:${args.password}`).toString("base64");

  const response = await fetch(restUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to send email via REST: ${error.error?.message || response.statusText}`
    );
  }

  const messageId = response.headers.get("x-request-id") || `ews-rest-${Date.now()}`;
  return {
    success: true,
    messageId,
  };
}

// Send email via EWS SOAP API
async function sendEmailViaEWS(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail: string;
  serverUrl: string;
  username: string;
  password: string;
  attachments?: Array<{ name: string; content: string; contentType: string }>;
}): Promise<{ success: boolean; messageId: string }> {
  // EWS endpoint
  const ewsUrl = args.serverUrl.endsWith("/Exchange.asmx")
    ? args.serverUrl
    : `${args.serverUrl.replace(/\/$/, "")}/EWS/Exchange.asmx`;

  // Build SOAP request for CreateItem
  const toAddresses = args.to.split(",").map((email) => email.trim());
  const toAddressesXml = toAddresses
    .map((email) => `<t:Mailbox><t:EmailAddress>${escapeXml(email)}</t:EmailAddress></t:Mailbox>`)
    .join("");

  let attachmentsXml = "";
  if (args.attachments && args.attachments.length > 0) {
    attachmentsXml = args.attachments
      .map(
        (att) => `
      <t:FileAttachment>
        <t:Name>${escapeXml(att.name)}</t:Name>
        <t:Content>${att.content}</t:Content>
        <t:ContentType>${escapeXml(att.contentType)}</t:ContentType>
      </t:FileAttachment>`
      )
      .join("");
  }

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2013" />
  </soap:Header>
  <soap:Body>
    <m:CreateItem MessageDisposition="SendAndSaveCopy">
      <m:Items>
        <t:Message>
          <t:Subject>${escapeXml(args.subject)}</t:Subject>
          <t:Body BodyType="HTML">${escapeXml(args.html)}</t:Body>
          <t:ToRecipients>
            ${toAddressesXml}
          </t:ToRecipients>
          ${attachmentsXml ? `<t:Attachments>${attachmentsXml}</t:Attachments>` : ""}
        </t:Message>
      </m:Items>
    </m:CreateItem>
  </soap:Body>
</soap:Envelope>`;

  // Basic authentication
  const auth = Buffer.from(`${args.username}:${args.password}`).toString("base64");

  const response = await fetch(ewsUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://schemas.microsoft.com/exchange/services/2006/messages/CreateItem",
    },
    body: soapBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email via EWS: ${response.statusText}`);
  }

  const responseText = await response.text();
  
  // Parse SOAP response to extract message ID
  const messageIdMatch = responseText.match(/<t:ItemId Id="([^"]+)"/);
  const messageId = messageIdMatch
    ? messageIdMatch[1]
    : `ews-${Date.now()}`;

  return {
    success: true,
    messageId,
  };
}

// Helper function to escape XML
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Get messages from Exchange Server mailbox
export const getMessages = action({
  args: {
    serverUrl: v.string(),
    username: v.string(),
    password: v.string(),
    version: v.union(v.literal("ews"), v.literal("rest")),
    mailbox: v.optional(v.string()), // Mailbox email address
    top: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      if (args.version === "rest") {
        return await getMessagesViaREST(args);
      } else {
        return await getMessagesViaEWS(args);
      }
    } catch (error: any) {
      throw new Error(`Exchange Server get messages failed: ${error.message}`);
    }
  },
});

// Get messages via REST API
async function getMessagesViaREST(args: {
  serverUrl: string;
  username: string;
  password: string;
  mailbox?: string;
  top?: number;
}): Promise<{ success: boolean; messages: any[] }> {
  const mailbox = args.mailbox || args.username;
  const restUrl = `${args.serverUrl.replace(/\/$/, "")}/api/v2.0/users/${encodeURIComponent(mailbox)}/messages`;
  
  const params = new URLSearchParams();
  if (args.top) {
    params.append("$top", args.top.toString());
  }
  params.append("$select", "Id,Subject,From,ReceivedDateTime,BodyPreview,IsRead");

  const auth = Buffer.from(`${args.username}:${args.password}`).toString("base64");

  const response = await fetch(`${restUrl}?${params.toString()}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to get messages via REST: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return {
    success: true,
    messages: data.value || [],
  };
}

// Get messages via EWS
async function getMessagesViaEWS(args: {
  serverUrl: string;
  username: string;
  password: string;
  mailbox?: string;
  top?: number;
}): Promise<{ success: boolean; messages: any[] }> {
  const ewsUrl = args.serverUrl.endsWith("/Exchange.asmx")
    ? args.serverUrl
    : `${args.serverUrl.replace(/\/$/, "")}/EWS/Exchange.asmx`;

  const maxCount = args.top || 10;
  const mailbox = args.mailbox || args.username;

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2013" />
  </soap:Header>
  <soap:Body>
    <m:FindItem Traversal="Shallow">
      <m:ItemShape>
        <t:BaseShape>IdOnly</t:BaseShape>
        <t:AdditionalProperties>
          <t:FieldURI FieldURI="item:Subject" />
          <t:FieldURI FieldURI="message:From" />
          <t:FieldURI FieldURI="item:DateTimeReceived" />
          <t:FieldURI FieldURI="item:Preview" />
          <t:FieldURI FieldURI="message:IsRead" />
        </t:AdditionalProperties>
      </m:ItemShape>
      <m:IndexedPageItemView MaxEntriesReturned="${maxCount}" Offset="0" BasePoint="Beginning" />
      <m:ParentFolderIds>
        <t:DistinguishedFolderId Id="inbox" />
      </m:ParentFolderIds>
    </m:FindItem>
  </soap:Body>
</soap:Envelope>`;

  const auth = Buffer.from(`${args.username}:${args.password}`).toString("base64");

  const response = await fetch(ewsUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://schemas.microsoft.com/exchange/services/2006/messages/FindItem",
    },
    body: soapBody,
  });

  if (!response.ok) {
    throw new Error(`Failed to get messages via EWS: ${response.statusText}`);
  }

  const responseText = await response.text();
  
  // Parse SOAP response (simplified - in production, use proper XML parser)
  // For now, return empty array and note that full parsing is needed
  const messages: any[] = [];
  
  // TODO: Parse SOAP XML response to extract messages
  // This would require XML parsing which is complex in Convex actions
  // Consider using an external service or implementing proper XML parsing

  return {
    success: true,
    messages,
  };
}
