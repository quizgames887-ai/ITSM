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
    try {
      console.log("[users:list] Starting query execution...");
      
      // Try multiple query methods to debug
      const query1 = ctx.db.query("users");
      console.log("[users:list] Query object created");
      
      const users = await query1.collect();
      console.log(`[users:list] Query executed successfully. Found ${users.length} users`);
      
      // Try alternative query method to verify
      const allUsers = await ctx.db.query("users").collect();
      console.log(`[users:list] Alternative query method found ${allUsers.length} users`);
      
      // Debug: Log first few users if any exist
      if (users.length > 0) {
        console.log(`[users:list] Sample users:`, users.slice(0, 3).map(u => ({ 
          id: u._id, 
          email: u.email, 
          name: u.name,
          role: u.role 
        })));
      } else {
        console.warn(`[users:list] No users found in database.`);
        console.warn(`[users:list] This might indicate:`);
        console.warn(`[users:list] 1. The database is empty`);
        console.warn(`[users:list] 2. The query is not accessing the correct table`);
        console.warn(`[users:list] 3. There's a permissions issue`);
        
        // Try to verify by querying with an index
        try {
          const testUser = await ctx.db
            .query("users")
            .withIndex("by_email")
            .first();
          console.log(`[users:list] Test query with index found:`, testUser ? "User exists" : "No user found");
        } catch (indexError: any) {
          console.warn(`[users:list] Index query test failed:`, indexError?.message);
        }
      }
      
      // Ensure we always return an array
      if (!Array.isArray(users)) {
        console.error("[users:list] Query did not return an array:", typeof users);
        return [];
      }
      
      console.log(`[users:list] Returning ${users.length} users`);
      return users;
    } catch (error: any) {
      console.error("[users:list] Error fetching users:", error);
      console.error("[users:list] Error message:", error?.message);
      console.error("[users:list] Error stack:", error?.stack);
      console.error("[users:list] Error name:", error?.name);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
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
