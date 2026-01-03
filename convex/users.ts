import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

// Diagnostic query to check database status
export const getDatabaseStatus = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("[users:getDatabaseStatus] Starting diagnostic query...");
      const userCount = await ctx.db.query("users").collect();
      console.log(`[users:getDatabaseStatus] Found ${userCount.length} users`);
      
      const result = {
        userCount: userCount.length,
        hasUsers: userCount.length > 0,
        sampleUsers: userCount.slice(0, 3).map(u => ({
          id: u._id,
          email: u.email,
          name: u.name,
          role: u.role
        })),
        allUserIds: userCount.map(u => u._id),
        timestamp: Date.now()
      };
      
      console.log("[users:getDatabaseStatus] Result:", JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error("[users:getDatabaseStatus] Error:", error);
      console.error("[users:getDatabaseStatus] Error details:", JSON.stringify(error, null, 2));
      return {
        userCount: 0,
        hasUsers: false,
        error: error.message,
        errorStack: error.stack,
        timestamp: Date.now()
      };
    }
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Simple, direct query - no try/catch to ensure errors are visible
    const users = await ctx.db.query("users").collect();
    console.log(`[users:list] Found ${users.length} users`);
    return users;
  },
});

// Admin query to list all users without authentication requirement
// This is safe because the page itself checks for admin role
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    try {
      const users = await ctx.db.query("users").collect();
      return users || [];
    } catch (error: any) {
      console.error("Error fetching users:", error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    currentUserId: v.id("users"), // User making the update
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("user"), v.literal("admin"), v.literal("agent"))
    ),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, currentUserId, ...updates } = args;
    
    // Verify the current user exists and is authenticated
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser) {
      throw new Error("Authentication required");
    }
    
    // Verify the target user exists
    const user = await ctx.db.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Users can only update their own profile (except admins)
    if (currentUser.role !== "admin" && currentUserId !== id) {
      throw new Error("You can only update your own profile");
    }
    
    // Validate and sanitize inputs
    const allowedUpdates: any = {
      updatedAt: Date.now(),
    };
    
    if (updates.name !== undefined) {
      const sanitizedName = updates.name.trim();
      if (sanitizedName.length === 0) {
        throw new Error("Name cannot be empty");
      }
      if (sanitizedName.length > 100) {
        throw new Error("Name must be less than 100 characters");
      }
      allowedUpdates.name = sanitizedName;
    }
    
    if (updates.email !== undefined) {
      const sanitizedEmail = updates.email.trim().toLowerCase();
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail) || sanitizedEmail.length > 254) {
        throw new Error("Invalid email address");
      }
      
      // Check if email is already taken
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", sanitizedEmail))
        .first();
      
      if (existingUser && existingUser._id !== id) {
        throw new Error("Email already in use");
      }
      
      allowedUpdates.email = sanitizedEmail;
    }
    
    // Role can only be updated by admins
    if (updates.role !== undefined) {
      if (currentUser.role !== "admin") {
        throw new Error("Only admins can change user roles");
      }
      allowedUpdates.role = updates.role;
    }
    
    // Onboarding status can only be updated by admins or the user themselves
    if (updates.onboardingCompleted !== undefined) {
      if (currentUser.role !== "admin" && currentUserId !== id) {
        throw new Error("You can only update your own onboarding status");
      }
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

// Generate upload URL for profile picture
export const generateProfilePictureUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      return await ctx.storage.generateUploadUrl();
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      throw new Error(`Failed to generate upload URL: ${error.message || "Unknown error"}`);
    }
  },
});

// Get profile picture URL
export const getProfilePictureUrl = query({
  args: {
    storageId: v.union(v.id("_storage"), v.null()),
  },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    
    try {
      return await ctx.storage.getUrl(args.storageId);
    } catch (error) {
      console.error("Error getting profile picture URL:", error);
      return null;
    }
  },
});

// Update user profile picture
export const updateProfilePicture = mutation({
  args: {
    userId: v.id("users"),
    currentUserId: v.id("users"), // User making the update
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Verify the current user exists
    const currentUser = await ctx.db.get(args.currentUserId);
    if (!currentUser) {
      throw new Error("Authentication required");
    }
    
    // Verify the target user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Users can only update their own profile picture (except admins)
    if (currentUser.role !== "admin" && args.currentUserId !== args.userId) {
      throw new Error("You can only update your own profile picture");
    }

    // Delete old profile picture if it exists
    if (user.profilePictureId) {
      try {
        await ctx.storage.delete(user.profilePictureId);
      } catch (error) {
        // Ignore errors if file doesn't exist
        console.warn("Could not delete old profile picture:", error);
      }
    }

    // Update user with new profile picture
    await ctx.db.patch(args.userId, {
      profilePictureId: args.storageId,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Profile picture updated successfully",
    };
  },
});

// Remove profile picture
export const removeProfilePicture = mutation({
  args: {
    userId: v.id("users"),
    currentUserId: v.id("users"), // User making the update
  },
  handler: async (ctx, args) => {
    // Verify the current user exists
    const currentUser = await ctx.db.get(args.currentUserId);
    if (!currentUser) {
      throw new Error("Authentication required");
    }
    
    // Verify the target user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Users can only remove their own profile picture (except admins)
    if (currentUser.role !== "admin" && args.currentUserId !== args.userId) {
      throw new Error("You can only remove your own profile picture");
    }

    // Delete profile picture if it exists
    if (user.profilePictureId) {
      try {
        await ctx.storage.delete(user.profilePictureId);
      } catch (error) {
        console.warn("Could not delete profile picture:", error);
      }
    }

    // Update user to remove profile picture reference
    await ctx.db.patch(args.userId, {
      profilePictureId: null,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Profile picture removed successfully",
    };
  },
});
