import { Id } from "@/convex/_generated/dataModel";

export type TicketStatus =
  | "new"
  | "in_progress"
  | "on_hold"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketType = "incident" | "service_request" | "inquiry";

export type TicketUrgency = "low" | "medium" | "high";

export type UserRole = "user" | "admin" | "agent";

export interface Ticket {
  _id: Id<"tickets">;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  urgency: TicketUrgency;
  category: string;
  createdBy: Id<"users">;
  assignedTo: Id<"users"> | null;
  slaDeadline: number | null;
  resolvedAt: number | null;
  aiCategorySuggestion: string | null;
  aiPrioritySuggestion: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  _id: Id<"users">;
  email: string;
  name: string;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}
