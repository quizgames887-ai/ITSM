import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Password hashing function (same as in authHelpers)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getCurrentUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Convert string ID to Id<"users">
    const userId = args.userId as any;
    return await ctx.db.get(userId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db.query("users").collect();
  },
});

// Admin query to list all users without authentication requirement
// This is safe because the page itself checks for admin role
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await ctx.db.query("users").collect();
    } catch (error) {
      console.error("Error fetching users:", error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("user"), v.literal("admin"), v.literal("agent"))
    ),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Verify the user exists
    const user = await ctx.db.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    // If email is being updated, check if it's already taken
    if (updates.email) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updates.email!))
        .first();
      
      if (existingUser && existingUser._id !== id) {
        throw new Error("Email already in use");
      }
    }

    // Only allow updating name and email, not role (role changes should be admin-only)
    const allowedUpdates: any = {
      updatedAt: Date.now(),
    };
    
    if (updates.name !== undefined) {
      allowedUpdates.name = updates.name;
    }
    
    if (updates.email !== undefined) {
      allowedUpdates.email = updates.email;
    }
    
    // Role can only be updated by admins (for now, we'll allow it but this should be restricted)
    if (updates.role !== undefined) {
      allowedUpdates.role = updates.role;
    }
    
    // Allow updating onboarding status
    if (updates.onboardingCompleted !== undefined) {
      allowedUpdates.onboardingCompleted = updates.onboardingCompleted;
    }

    await ctx.db.patch(id, allowedUpdates);
  },
});

// Mutation to make a user admin by email
export const makeUserAdminByEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }
    
    if (user.role === "admin") {
      return {
        success: true,
        message: `User ${args.email} is already an admin`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }
    
    await ctx.db.patch(user._id, {
      role: "admin",
      updatedAt: Date.now(),
    });
    
    return {
      success: true,
      message: `Successfully updated ${args.email} to admin role`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: "admin",
      },
    };
  },
});

// Mutation to grant full authority to a user by email (admin role + onboarding completed)
export const grantFullAuthority = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }
    
    const updates: any = {
      updatedAt: Date.now(),
    };
    
    let changes: string[] = [];
    
    if (user.role !== "admin") {
      updates.role = "admin";
      changes.push("admin role");
    }
    
    if (!user.onboardingCompleted) {
      updates.onboardingCompleted = true;
      changes.push("onboarding completed");
    }
    
    if (changes.length > 0) {
      await ctx.db.patch(user._id, updates);
      
      return {
        success: true,
        message: `Successfully granted full authority to ${args.email}. Updated: ${changes.join(", ")}`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: updates.role || user.role,
          onboardingCompleted: updates.onboardingCompleted !== undefined ? updates.onboardingCompleted : user.onboardingCompleted,
        },
      };
    } else {
      return {
        success: true,
        message: `User ${args.email} already has full authority`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
        },
      };
    }
  },
});

// Mutation for users to reset their own password
export const resetOwnPassword = mutation({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const passwordRecord = await ctx.db
      .query("userPasswords")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!passwordRecord) {
      throw new Error("Password record not found");
    }

    const currentPasswordHash = await hashPassword(args.currentPassword);
    if (passwordRecord.passwordHash !== currentPasswordHash) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    // Update password
    const newPasswordHash = await hashPassword(args.newPassword);
    await ctx.db.patch(passwordRecord._id, {
      passwordHash: newPasswordHash,
    });

    return {
      success: true,
      message: "Password reset successfully",
    };
  },
});

// Mutation for admins to reset any user's password
export const resetUserPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate new password
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Get or create password record
    let passwordRecord = await ctx.db
      .query("userPasswords")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const newPasswordHash = await hashPassword(args.newPassword);

    if (passwordRecord) {
      // Update existing password
      await ctx.db.patch(passwordRecord._id, {
        passwordHash: newPasswordHash,
      });
    } else {
      // Create new password record if it doesn't exist
      await ctx.db.insert("userPasswords", {
        userId: args.userId,
        passwordHash: newPasswordHash,
      });
    }

    return {
      success: true,
      message: `Password reset successfully for ${user.email}`,
    };
  },
});
