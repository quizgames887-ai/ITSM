import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Get Exchange configuration (only one configuration allowed)
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db
      .query("exchangeConfig")
      .collect();
    
    // Return the most recent config (should only be one)
    return configs.length > 0 
      ? configs.sort((a, b) => b.updatedAt - a.updatedAt)[0] 
      : null;
  },
});

// Create or update Exchange configuration
export const updateConfig = mutation({
  args: {
    type: v.union(v.literal("online"), v.literal("server")),
    enabled: v.boolean(),
    
    // Exchange Online settings
    tenantId: v.optional(v.string()),
    clientId: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    
    // Exchange Server settings
    serverUrl: v.optional(v.string()),
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    version: v.optional(v.union(v.literal("ews"), v.literal("rest"))),
    
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Validate based on type
    if (args.type === "online") {
      if (!args.tenantId || !args.clientId || !args.clientSecret || !args.userEmail) {
        throw new Error("Exchange Online requires tenantId, clientId, clientSecret, and userEmail");
      }
    } else if (args.type === "server") {
      if (!args.serverUrl || !args.username || !args.password) {
        throw new Error("Exchange Server requires serverUrl, username, and password");
      }
    }
    
    // Check if config already exists
    const existing = await ctx.db
      .query("exchangeConfig")
      .collect();
    
    if (existing.length > 0) {
      // Update existing config (use the most recent one)
      const config = existing.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      await ctx.db.patch(config._id, {
        type: args.type,
        enabled: args.enabled,
        tenantId: args.tenantId ?? undefined,
        clientId: args.clientId ?? undefined,
        clientSecret: args.clientSecret ?? undefined,
        userEmail: args.userEmail ?? undefined,
        serverUrl: args.serverUrl ?? undefined,
        username: args.username ?? undefined,
        password: args.password ?? undefined,
        version: args.version ?? undefined,
        updatedAt: now,
      });
      return config._id;
    } else {
      // Create new config
      const configId = await ctx.db.insert("exchangeConfig", {
        type: args.type,
        enabled: args.enabled,
        tenantId: args.tenantId ?? undefined,
        clientId: args.clientId ?? undefined,
        clientSecret: args.clientSecret ?? undefined,
        userEmail: args.userEmail ?? undefined,
        serverUrl: args.serverUrl ?? undefined,
        username: args.username ?? undefined,
        password: args.password ?? undefined,
        version: args.version ?? undefined,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      return configId;
    }
  },
});

// Test Exchange connection
export const testConnection = action({
  args: {
    type: v.union(v.literal("online"), v.literal("server")),
    tenantId: v.optional(v.string()),
    clientId: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    serverUrl: v.optional(v.string()),
    username: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      if (args.type === "online") {
        // Test Exchange Online connection via Microsoft Graph API
        if (!args.tenantId || !args.clientId || !args.clientSecret || !args.userEmail) {
          return {
            success: false,
            message: "Missing required Exchange Online credentials",
          };
        }
        
        // Get access token
        const tokenUrl = `https://login.microsoftonline.com/${args.tenantId}/oauth2/v2.0/token`;
        const tokenParams = new URLSearchParams({
          client_id: args.clientId,
          client_secret: args.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        });
        
        const tokenResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: tokenParams.toString(),
        });
        
        if (!tokenResponse.ok) {
          const error = await tokenResponse.json().catch(() => ({}));
          return {
            success: false,
            message: `Failed to authenticate: ${error.error_description || tokenResponse.statusText}`,
          };
        }
        
        const tokenData = await tokenResponse.json();
        
        // Test connection by getting user info
        const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(args.userEmail)}`;
        const graphResponse = await fetch(graphUrl, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        
        if (!graphResponse.ok) {
          const error = await graphResponse.json().catch(() => ({}));
          return {
            success: false,
            message: `Failed to connect to Exchange Online: ${error.error?.message || graphResponse.statusText}`,
          };
        }
        
        return {
          success: true,
          message: "Exchange Online connection successful",
        };
      } else {
        // Test Exchange Server connection
        if (!args.serverUrl || !args.username || !args.password) {
          return {
            success: false,
            message: "Missing required Exchange Server credentials",
          };
        }
        
        // Try to connect via EWS (basic test)
        // For a real test, we'd need to make an EWS request
        // For now, just validate the URL format
        try {
          const url = new URL(args.serverUrl);
          if (!url.protocol.startsWith("http")) {
            return {
              success: false,
              message: "Invalid server URL format",
            };
          }
        } catch {
          return {
            success: false,
            message: "Invalid server URL format",
          };
        }
        
        // Note: Full EWS connection test would require making an actual SOAP request
        // This is a basic validation
        return {
          success: true,
          message: "Exchange Server configuration validated (full connection test requires EWS implementation)",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to test connection",
      };
    }
  },
});
