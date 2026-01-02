import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Simple password hashing (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
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
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(args.password);

    // For now, we'll store the hashed password in a separate table
    // In a real implementation, you'd use Convex Auth or a proper auth service
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: "user",
      onboardingCompleted: false,
      profilePictureId: null,
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
        role: user.role 
      };
    } catch (error: any) {
      console.error("Sign in error:", error);
      // Re-throw with a user-friendly message
      throw new Error(error.message || "Failed to sign in. Please try again.");
    }
  },
});
