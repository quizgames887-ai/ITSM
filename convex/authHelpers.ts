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
    // Validate and sanitize inputs
    const sanitizedEmail = args.email.trim().toLowerCase();
    const sanitizedName = args.name.trim();
    const sanitizedWorkplace = args.workplace?.trim();
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail) || sanitizedEmail.length > 254) {
      throw new Error("Invalid email address");
    }
    
    // Name validation
    if (sanitizedName.length === 0) {
      throw new Error("Name cannot be empty");
    }
    if (sanitizedName.length > 100) {
      throw new Error("Name must be less than 100 characters");
    }
    
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", sanitizedEmail))
      .first();

    if (existingUser) {
      throw new Error("User already exists");
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
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();

      if (!user) {
        throw new Error("Invalid email or password");
      }

      const passwordRecord = await ctx.db
        .query("userPasswords")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();

      if (!passwordRecord) {
        throw new Error("Invalid email or password");
      }

      const hashedPassword = await hashPassword(args.password);
      if (passwordRecord.passwordHash !== hashedPassword) {
        throw new Error("Invalid email or password");
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
      // Re-throw with a user-friendly message
      throw new Error(error.message || "Failed to sign in. Please try again.");
    }
  },
});
