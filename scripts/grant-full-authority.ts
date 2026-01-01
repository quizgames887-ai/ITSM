/**
 * Script to grant full authority to a user by email
 * This sets the user to admin role and completes onboarding
 * 
 * Usage: npx tsx scripts/grant-full-authority.ts test@test.com
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
try {
  const envPath = join(process.cwd(), ".env.local");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  // .env.local might not exist, that's okay
}

async function grantFullAuthority(email: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.error("❌ Error: NEXT_PUBLIC_CONVEX_URL environment variable is not set");
    console.log("\nPlease set it in your .env.local file or export it:");
    console.log("export NEXT_PUBLIC_CONVEX_URL=your_convex_url");
    process.exit(1);
  }

  console.log("🔍 Connecting to Convex...");
  console.log(`📍 URL: ${convexUrl}\n`);

  const client = new ConvexHttpClient(convexUrl);

  try {
    console.log(`🔐 Granting full authority to ${email}...\n`);
    
    const result = await client.mutation(api.users.grantFullAuthority, {
      email: email,
    });
    
    if (result.success) {
      console.log("✅ Success!");
      console.log(`   ${result.message}`);
      console.log(`\n   User Details:`);
      console.log(`   - Name: ${result.user.name}`);
      console.log(`   - Email: ${result.user.email}`);
      console.log(`   - Role: ${result.user.role}`);
      console.log(`   - Onboarding Completed: ${result.user.onboardingCompleted ? "Yes" : "No"}`);
      console.log(`   - ID: ${result.user.id}`);
      console.log(`\n   ✨ User now has full authority in the app!`);
    } else {
      console.log("⚠️  Warning:", result.message);
    }
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 Possible solutions:");
    console.log("   1. Make sure your Convex deployment is running");
    console.log("   2. Check that NEXT_PUBLIC_CONVEX_URL is correct");
    console.log("   3. Verify the user email exists in the database");
    console.log("   4. Run 'npx convex dev --once' to sync functions");
    process.exit(1);
  }
}

const email = process.argv[2] || "test@test.com";

if (!email) {
  console.error("❌ Error: Please provide an email address");
  console.log("\nUsage: npx tsx scripts/grant-full-authority.ts <email>");
  console.log("Example: npx tsx scripts/grant-full-authority.ts test@test.com");
  process.exit(1);
}

grantFullAuthority(email);
