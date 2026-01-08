import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Password validation
function validatePassword(password: string): { valid: boolean; message?: string } {
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

// Simple password hashing (in production, use bcrypt or similar)
// Note: SHA-256 is not ideal for password hashing. Consider using bcrypt, argon2, or scrypt
// This is a temporary solution. For production, implement proper password hashing with salt.
async function hashPassword(password: string): Promise<string> {
  // Validate password before hashing
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(validation.message || "Invalid password");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    workplace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate and sanitize inputs
      const sanitizedEmail = args.email.trim().toLowerCase();
      const sanitizedName = args.name.trim();
      const sanitizedWorkplace = args.workplace?.trim();
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!sanitizedEmail || sanitizedEmail.trim().length === 0) {
        const error = new Error("Email is required");
        error.name = "ValidationError";
        throw error;
      }
      if (!emailRegex.test(sanitizedEmail)) {
        const error = new Error("Please enter a valid email address");
        error.name = "ValidationError";
        throw error;
      }
      if (sanitizedEmail.length > 254) {
        const error = new Error("Email address is too long. Please use an email address with less than 254 characters");
        error.name = "ValidationError";
        throw error;
      }
      
      // Name validation
      if (!sanitizedName || sanitizedName.length === 0) {
        const error = new Error("Name is required");
        error.name = "ValidationError";
        throw error;
      }
      if (sanitizedName.length > 100) {
        const error = new Error("Name is too long. Please use a name with less than 100 characters");
        error.name = "ValidationError";
        throw error;
      }
      
      // Check if user exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", sanitizedEmail))
        .first();

      if (existingUser) {
        const error = new Error("An account with this email already exists. Please sign in instead");
        error.name = "AccountError";
        throw error;
      }

      // Hash password (includes password validation)
      const hashedPassword = await hashPassword(args.password);

      // For now, we'll store the hashed password in a separate table
      // In a real implementation, you'd use Convex Auth or a proper auth service
      const now = Date.now();
      const userId = await ctx.db.insert("users", {
        email: sanitizedEmail,
        name: sanitizedName,
        role: "user",
        onboardingCompleted: false,
        profilePictureId: null,
        language: undefined,
        workplace: sanitizedWorkplace || undefined,
        createdAt: now,
        updatedAt: now,
      });

      // Store password hash (in production, use Convex secrets or external auth)
      await ctx.db.insert("userPasswords", {
        userId,
        passwordHash: hashedPassword,
      });

      return { userId };
    } catch (error: any) {
      console.error("Sign up error:", error);
      
      // If it's already a user-friendly error message with proper error name, re-throw it
      if (error.name && (error.name === "ValidationError" || error.name === "AccountError")) {
        throw error;
      }
      
      // If it's already a user-friendly error message, preserve it but ensure it has a name
      if (error.message && (
        error.message.includes("Email is required") ||
        error.message.includes("Please enter a valid email") ||
        error.message.includes("Email address is too long") ||
        error.message.includes("Name is required") ||
        error.message.includes("Name is too long") ||
        error.message.includes("already exists") ||
        error.message.includes("Password must") ||
        error.message.includes("Password does not meet")
      )) {
        error.name = error.name || "ValidationError";
        throw error;
      }
      
      // For password validation errors from hashPassword
      if (error.message && error.message.includes("Password must")) {
        const validationError = new Error(`Password requirements: ${error.message}`);
        validationError.name = "ValidationError";
        validationError.stack = error.stack;
        throw validationError;
      }
      
      // For other errors, preserve the original error but add context
      if (error.message) {
        const enhancedError = new Error(`Account creation failed: ${error.message}`);
        enhancedError.name = error.name || "SignUpError";
        enhancedError.stack = error.stack;
        throw enhancedError;
      }
      
      const genericError = new Error("Unable to create account. Please check your information and try again");
      genericError.name = "SignUpError";
      genericError.stack = error.stack;
      throw genericError;
    }
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Validate email format first
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const sanitizedEmail = args.email.trim().toLowerCase();
      
      if (!emailRegex.test(sanitizedEmail)) {
        const error = new Error("Please enter a valid email address");
        error.name = "ValidationError";
        throw error;
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", sanitizedEmail))
        .first();

      if (!user) {
        const error = new Error("Email not registered. Please sign up first or check your email address");
        error.name = "AuthenticationError";
        throw error;
      }

      const passwordRecord = await ctx.db
        .query("userPasswords")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();

      if (!passwordRecord) {
        const error = new Error("Account setup incomplete. Please contact support or reset your password");
        error.name = "AccountError";
        throw error;
      }

      // Validate password before hashing
      if (!args.password || args.password.trim().length === 0) {
        const error = new Error("Password is required");
        error.name = "ValidationError";
        throw error;
      }

      const hashedPassword = await hashPassword(args.password);
      if (passwordRecord.passwordHash !== hashedPassword) {
        const error = new Error("Incorrect password. Please check your password and try again");
        error.name = "AuthenticationError";
        throw error;
      }

      return { 
        userId: user._id, 
        email: user.email, 
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted
      };
    } catch (error: any) {
      console.error("Sign in error:", error);
      
      // If it's already a user-friendly error message with proper error name, re-throw it
      if (error.name && (error.name === "ValidationError" || error.name === "AuthenticationError" || error.name === "AccountError")) {
        throw error;
      }
      
      // If it's already a user-friendly error message, preserve it but ensure it has a name
      if (error.message && (
        error.message.includes("Email not registered") ||
        error.message.includes("Incorrect password") ||
        error.message.includes("Please enter a valid email") ||
        error.message.includes("Password is required") ||
        error.message.includes("Account setup incomplete") ||
        error.message.includes("Password must")
      )) {
        error.name = error.name || "AuthenticationError";
        throw error;
      }
      
      // For password validation errors from hashPassword
      if (error.message && error.message.includes("Password must")) {
        const validationError = new Error("Password does not meet requirements. Please check your password");
        validationError.name = "ValidationError";
        validationError.stack = error.stack;
        throw validationError;
      }
      
      // For other errors, preserve the original error but add context
      if (error.message) {
        const enhancedError = new Error(`Sign in failed: ${error.message}`);
        enhancedError.name = error.name || "SignInError";
        enhancedError.stack = error.stack;
        throw enhancedError;
      }
      
      const genericError = new Error("Unable to sign in. Please check your email and password, then try again");
      genericError.name = "SignInError";
      genericError.stack = error.stack;
      throw genericError;
    }
  },
});
