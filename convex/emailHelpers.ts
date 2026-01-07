import { Id } from "./_generated/dataModel";

// Types for notification settings and template config
type NotificationSettings = {
  enabled: boolean;
  notifyOnTicketCreated: boolean;
  notifyOnTicketCreatedForCreator: boolean;
  notifyOnTicketCreatedForAssignee: boolean;
  notifyOnStatusChange: boolean;
  notifyOnStatusChangeToNew: boolean;
  notifyOnStatusChangeToInProgress: boolean;
  notifyOnStatusChangeToOnHold: boolean;
  notifyOnStatusChangeToResolved: boolean;
  notifyOnStatusChangeToClosed: boolean;
  notifyOnStatusChangeToRejected: boolean;
  notifyOnStatusChangeToNeedApproval: boolean;
  notifyOnAssignment: boolean;
  notifyOnAssignmentToAssignee: boolean;
  notifyOnAssignmentToCreator: boolean;
  notifyOnPriorityChange: boolean;
  notifyOnPriorityChangeToLow: boolean;
  notifyOnPriorityChangeToMedium: boolean;
  notifyOnPriorityChangeToHigh: boolean;
  notifyOnPriorityChangeToCritical: boolean;
  notifyForIncidents: boolean;
  notifyForServiceRequests: boolean;
  notifyForInquiries: boolean;
  notifyCreator: boolean;
  notifyAssignee: boolean;
  notifyWatchers: boolean;
};

type EmailTemplateConfig = {
  enabled: boolean;
  includeTicketTitle: boolean;
  includeTicketDescription: boolean;
  includeTicketId: boolean;
  includeTicketNumber: boolean;
  includeCategory: boolean;
  includePriority: boolean;
  includeStatus: boolean;
  includeType: boolean;
  includeUrgency: boolean;
  includeSlaDeadline: boolean;
  includeCreatedDate: boolean;
  includeUpdatedDate: boolean;
  includeResolvedDate: boolean;
  includeCreatorName: boolean;
  includeCreatorEmail: boolean;
  includeAssigneeName: boolean;
  includeAssigneeEmail: boolean;
  includeStatusChange: boolean;
  includePriorityChange: boolean;
  includeAssignmentChange: boolean;
  includeTicketLink: boolean;
  includeComments: boolean;
  includeAttachments: boolean;
  includeFormData: boolean;
  emailHeaderText?: string;
  emailFooterText?: string;
  emailSignature?: string;
};

type Ticket = {
  _id: Id<"tickets">;
  title: string;
  description: string;
  type: "incident" | "service_request" | "inquiry";
  status: "new" | "need_approval" | "in_progress" | "on_hold" | "resolved" | "closed" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  urgency: "low" | "medium" | "high";
  category: string;
  createdBy: Id<"users">;
  assignedTo: Id<"users"> | null;
  slaDeadline: number | null;
  resolvedAt: number | null;
  createdAt: number;
  updatedAt: number;
  formData?: any;
};

type User = {
  _id: Id<"users">;
  name: string;
  email: string;
};

// Check if notification should be sent for ticket creation
export function shouldNotifyOnTicketCreated(
  settings: NotificationSettings | null,
  ticketType: "incident" | "service_request" | "inquiry",
  recipientType: "creator" | "assignee"
): boolean {
  if (!settings || !settings.enabled || !settings.notifyOnTicketCreated) {
    return false;
  }

  // Check ticket type filter
  if (ticketType === "incident" && !settings.notifyForIncidents) return false;
  if (ticketType === "service_request" && !settings.notifyForServiceRequests) return false;
  if (ticketType === "inquiry" && !settings.notifyForInquiries) return false;

  // Check recipient type
  if (recipientType === "creator" && !settings.notifyOnTicketCreatedForCreator) return false;
  if (recipientType === "assignee" && !settings.notifyOnTicketCreatedForAssignee) return false;

  return true;
}

// Check if notification should be sent for status change
export function shouldNotifyOnStatusChange(
  settings: NotificationSettings | null,
  ticketType: "incident" | "service_request" | "inquiry",
  newStatus: string,
  recipientType: "creator" | "assignee"
): boolean {
  if (!settings || !settings.enabled || !settings.notifyOnStatusChange) {
    return false;
  }

  // Check ticket type filter
  if (ticketType === "incident" && !settings.notifyForIncidents) return false;
  if (ticketType === "service_request" && !settings.notifyForServiceRequests) return false;
  if (ticketType === "inquiry" && !settings.notifyForInquiries) return false;

  // Check specific status
  switch (newStatus) {
    case "new":
      if (!settings.notifyOnStatusChangeToNew) return false;
      break;
    case "in_progress":
      if (!settings.notifyOnStatusChangeToInProgress) return false;
      break;
    case "on_hold":
      if (!settings.notifyOnStatusChangeToOnHold) return false;
      break;
    case "resolved":
      if (!settings.notifyOnStatusChangeToResolved) return false;
      break;
    case "closed":
      if (!settings.notifyOnStatusChangeToClosed) return false;
      break;
    case "rejected":
      if (!settings.notifyOnStatusChangeToRejected) return false;
      break;
    case "need_approval":
      if (!settings.notifyOnStatusChangeToNeedApproval) return false;
      break;
  }

  // Check recipient filters
  if (recipientType === "creator" && !settings.notifyCreator) return false;
  if (recipientType === "assignee" && !settings.notifyAssignee) return false;

  return true;
}

// Check if notification should be sent for assignment change
export function shouldNotifyOnAssignment(
  settings: NotificationSettings | null,
  ticketType: "incident" | "service_request" | "inquiry",
  recipientType: "assignee" | "creator"
): boolean {
  if (!settings || !settings.enabled || !settings.notifyOnAssignment) {
    return false;
  }

  // Check ticket type filter
  if (ticketType === "incident" && !settings.notifyForIncidents) return false;
  if (ticketType === "service_request" && !settings.notifyForServiceRequests) return false;
  if (ticketType === "inquiry" && !settings.notifyForInquiries) return false;

  // Check recipient type
  if (recipientType === "assignee" && !settings.notifyOnAssignmentToAssignee) return false;
  if (recipientType === "creator" && !settings.notifyOnAssignmentToCreator) return false;

  return true;
}

// Check if notification should be sent for priority change
export function shouldNotifyOnPriorityChange(
  settings: NotificationSettings | null,
  ticketType: "incident" | "service_request" | "inquiry",
  newPriority: "low" | "medium" | "high" | "critical",
  recipientType: "creator" | "assignee"
): boolean {
  if (!settings || !settings.enabled || !settings.notifyOnPriorityChange) {
    return false;
  }

  // Check ticket type filter
  if (ticketType === "incident" && !settings.notifyForIncidents) return false;
  if (ticketType === "service_request" && !settings.notifyForServiceRequests) return false;
  if (ticketType === "inquiry" && !settings.notifyForInquiries) return false;

  // Check specific priority
  switch (newPriority) {
    case "low":
      if (!settings.notifyOnPriorityChangeToLow) return false;
      break;
    case "medium":
      if (!settings.notifyOnPriorityChangeToMedium) return false;
      break;
    case "high":
      if (!settings.notifyOnPriorityChangeToHigh) return false;
      break;
    case "critical":
      if (!settings.notifyOnPriorityChangeToCritical) return false;
      break;
  }

  // Check recipient filters
  if (recipientType === "creator" && !settings.notifyCreator) return false;
  if (recipientType === "assignee" && !settings.notifyAssignee) return false;

  return true;
}

// Build email HTML content based on template configuration
export function buildEmailTemplate(
  config: EmailTemplateConfig | null,
  ticket: Ticket,
  eventType: "created" | "status_changed" | "assigned" | "priority_changed",
  changes?: { old?: any; new?: any },
  creator?: User,
  assignee?: User | null,
  baseUrl?: string
): string {
  // If template config is disabled or not available, use default template
  if (!config || !config.enabled) {
    return buildDefaultEmailTemplate(ticket, eventType, changes, creator, assignee, baseUrl);
  }

  const parts: string[] = [];

  // Header
  if (config.emailHeaderText) {
    parts.push(`<div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px;">`);
    parts.push(`<p style="margin: 0; color: #6b7280; font-size: 14px;">${config.emailHeaderText}</p>`);
    parts.push(`</div>`);
  }

  // Event-specific title
  let eventTitle = "";
  switch (eventType) {
    case "created":
      eventTitle = "New Ticket Created";
      break;
    case "status_changed":
      eventTitle = "Ticket Status Updated";
      break;
    case "assigned":
      eventTitle = "Ticket Assigned";
      break;
    case "priority_changed":
      eventTitle = "Ticket Priority Updated";
      break;
  }
  parts.push(`<h2 style="color: #2563eb; margin-bottom: 20px;">${eventTitle}</h2>`);

  // Ticket information section
  parts.push(`<div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">`);

  if (config.includeTicketTitle) {
    parts.push(`<p><strong>Title:</strong> ${escapeHtml(ticket.title)}</p>`);
  }

  if (config.includeTicketId) {
    parts.push(`<p><strong>Ticket ID:</strong> ${ticket._id}</p>`);
  }

  if (config.includeTicketDescription && ticket.description) {
    const desc = ticket.description.length > 300 
      ? ticket.description.substring(0, 300) + "..." 
      : ticket.description;
    parts.push(`<p><strong>Description:</strong> ${escapeHtml(desc)}</p>`);
  }

  if (config.includeCategory) {
    parts.push(`<p><strong>Category:</strong> ${escapeHtml(ticket.category)}</p>`);
  }

  if (config.includePriority) {
    parts.push(`<p><strong>Priority:</strong> ${ticket.priority}</p>`);
  }

  if (config.includeStatus) {
    parts.push(`<p><strong>Status:</strong> ${ticket.status}</p>`);
  }

  if (config.includeType) {
    parts.push(`<p><strong>Type:</strong> ${ticket.type}</p>`);
  }

  if (config.includeUrgency) {
    parts.push(`<p><strong>Urgency:</strong> ${ticket.urgency}</p>`);
  }

  if (config.includeSlaDeadline && ticket.slaDeadline) {
    const deadline = new Date(ticket.slaDeadline).toLocaleString();
    parts.push(`<p><strong>SLA Deadline:</strong> ${deadline}</p>`);
  }

  if (config.includeCreatedDate) {
    const created = new Date(ticket.createdAt).toLocaleString();
    parts.push(`<p><strong>Created:</strong> ${created}</p>`);
  }

  if (config.includeUpdatedDate) {
    const updated = new Date(ticket.updatedAt).toLocaleString();
    parts.push(`<p><strong>Last Updated:</strong> ${updated}</p>`);
  }

  if (config.includeResolvedDate && ticket.resolvedAt) {
    const resolved = new Date(ticket.resolvedAt).toLocaleString();
    parts.push(`<p><strong>Resolved:</strong> ${resolved}</p>`);
  }

  // User information
  if (config.includeCreatorName && creator) {
    parts.push(`<p><strong>Created By:</strong> ${escapeHtml(creator.name)}</p>`);
  }

  if (config.includeCreatorEmail && creator) {
    parts.push(`<p><strong>Creator Email:</strong> ${creator.email}</p>`);
  }

  if (config.includeAssigneeName && assignee) {
    parts.push(`<p><strong>Assigned To:</strong> ${escapeHtml(assignee.name)}</p>`);
  }

  if (config.includeAssigneeEmail && assignee) {
    parts.push(`<p><strong>Assignee Email:</strong> ${assignee.email}</p>`);
  }

  // Change information
  if (changes) {
    if (config.includeStatusChange && changes.old?.status && changes.new?.status) {
      parts.push(`<p><strong>Status Change:</strong> ${changes.old.status} → ${changes.new.status}</p>`);
    }

    if (config.includePriorityChange && changes.old?.priority && changes.new?.priority) {
      parts.push(`<p><strong>Priority Change:</strong> ${changes.old.priority} → ${changes.new.priority}</p>`);
    }

    if (config.includeAssignmentChange && (changes.old?.assignedTo || changes.new?.assignedTo)) {
      const oldAssignee = changes.old?.assignedTo ? "Assigned" : "Unassigned";
      const newAssignee = changes.new?.assignedTo ? "Assigned" : "Unassigned";
      parts.push(`<p><strong>Assignment:</strong> ${oldAssignee} → ${newAssignee}</p>`);
    }
  }

  // Form data for service requests
  if (config.includeFormData && ticket.type === "service_request" && ticket.formData) {
    parts.push(`<p><strong>Form Data:</strong></p>`);
    parts.push(`<pre style="background-color: #ffffff; padding: 10px; border-radius: 3px; font-size: 12px;">${JSON.stringify(ticket.formData, null, 2)}</pre>`);
  }

  parts.push(`</div>`);

  // Ticket link
  if (config.includeTicketLink && baseUrl) {
    const ticketUrl = `${baseUrl}/tickets/${ticket._id}`;
    parts.push(`<p style="margin: 20px 0;"><a href="${ticketUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a></p>`);
  }

  // Footer
  if (config.emailFooterText) {
    parts.push(`<div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 20px;">`);
    parts.push(`<p style="margin: 0; color: #6b7280; font-size: 12px;">${config.emailFooterText}</p>`);
    parts.push(`</div>`);
  }

  // Signature
  if (config.emailSignature) {
    parts.push(`<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">`);
    parts.push(`<p style="margin: 0; color: #6b7280; font-size: 14px; white-space: pre-line;">${escapeHtml(config.emailSignature)}</p>`);
    parts.push(`</div>`);
  }

  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${parts.join("")}</div>`;
}

// Build default email template (fallback)
function buildDefaultEmailTemplate(
  ticket: Ticket,
  eventType: "created" | "status_changed" | "assigned" | "priority_changed",
  changes?: { old?: any; new?: any },
  creator?: User,
  assignee?: User | null,
  baseUrl?: string
): string {
  let eventTitle = "";
  let eventMessage = "";

  switch (eventType) {
    case "created":
      eventTitle = "New Ticket Created";
      eventMessage = `A new ticket has been created: "${ticket.title}"`;
      break;
    case "status_changed":
      eventTitle = "Ticket Status Updated";
      eventMessage = `Ticket "${ticket.title}" status has been updated`;
      if (changes?.old?.status && changes?.new?.status) {
        eventMessage += ` from ${changes.old.status} to ${changes.new.status}`;
      }
      break;
    case "assigned":
      eventTitle = "Ticket Assigned";
      eventMessage = `You have been assigned to ticket: "${ticket.title}"`;
      break;
    case "priority_changed":
      eventTitle = "Ticket Priority Updated";
      eventMessage = `Ticket "${ticket.title}" priority has been updated`;
      if (changes?.old?.priority && changes?.new?.priority) {
        eventMessage += ` from ${changes.old.priority} to ${changes.new.priority}`;
      }
      break;
  }

  const parts: string[] = [];
  parts.push(`<h2 style="color: #2563eb;">${eventTitle}</h2>`);
  parts.push(`<p>${eventMessage}</p>`);
  parts.push(`<div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">`);
  parts.push(`<p><strong>Category:</strong> ${ticket.category}</p>`);
  parts.push(`<p><strong>Priority:</strong> ${ticket.priority}</p>`);
  parts.push(`<p><strong>Status:</strong> ${ticket.status}</p>`);
  if (assignee) {
    parts.push(`<p><strong>Assigned To:</strong> ${assignee.name}</p>`);
  }
  parts.push(`</div>`);

  if (baseUrl) {
    const ticketUrl = `${baseUrl}/tickets/${ticket._id}`;
    parts.push(`<p><a href="${ticketUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a></p>`);
  }

  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${parts.join("")}</div>`;
}

// Helper to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
