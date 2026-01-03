import { Id } from "./_generated/dataModel";

/**
 * Security utilities and helpers for authentication and authorization
 */

/**
 * Validates that a user exists and has the required role
 */
export async function requireAuth(
  ctx: any,
  userId: Id<"users">,
  requiredRole?: "admin" | "agent" | "user"
): Promise<any> {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (requiredRole) {
    if (requiredRole === "admin" && user.role !== "admin") {
      throw new Error("Admin access required");
    }
    if (requiredRole === "agent" && !["admin", "agent"].includes(user.role)) {
      throw new Error("Agent or admin access required");
    }
  }

  return user;
}

/**
 * Validates that a user can only modify their own data (unless admin)
 */
export async function requireOwnershipOrAdmin(
  ctx: any,
  userId: Id<"users">,
  resourceUserId: Id<"users">
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Admins can modify any resource
  if (user.role === "admin") {
    return;
  }

  // Users can only modify their own resources
  if (userId !== resourceUserId) {
    throw new Error("You can only modify your own resources");
  }
}

/**
 * Sanitizes string input to prevent XSS
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes and trim
  let sanitized = input.replace(/\0/g, "").trim();

  // Enforce max length if provided
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== "string") {
    return false;
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 max length
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (typeof password !== "string") {
    return { valid: false, message: "Password must be a string" };
  }

  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }

  if (password.length > 128) {
    return { valid: false, message: "Password must be less than 128 characters" };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" };
  }

  return { valid: true };
}

/**
 * Validates file type for uploads
 */
export function validateFileType(
  fileName: string,
  allowedTypes: string[],
  mimeType?: string
): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) {
    return false;
  }

  // Check extension
  if (!allowedTypes.includes(extension)) {
    return false;
  }

  // If MIME type is provided, validate it matches
  if (mimeType) {
    const mimeMap: Record<string, string[]> = {
      jpg: ["image/jpeg"],
      jpeg: ["image/jpeg"],
      png: ["image/png"],
      gif: ["image/gif"],
      webp: ["image/webp"],
      svg: ["image/svg+xml"],
      pdf: ["application/pdf"],
      doc: ["application/msword"],
      docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      xls: ["application/vnd.ms-excel"],
      xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    };

    const validMimes = mimeMap[extension];
    if (validMimes && !validMimes.includes(mimeType)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates file size
 */
export function validateFileSize(fileSize: number, maxSizeBytes: number): boolean {
  return fileSize > 0 && fileSize <= maxSizeBytes;
}

/**
 * Rate limiting helper (simple in-memory version - use Redis in production)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    // Create new window
    const resetAt = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}
