# Resend.com Setup Guide

Complete guide to set up Resend for sending emails using your SMTP configuration (mail.palmware.co).

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Click **"Sign Up"** (free account available)
3. Sign up with your email or GitHub
4. Verify your email address

## Step 2: Get Your API Key

1. After logging in, you'll see the Resend Dashboard
2. Click on **"API Keys"** in the left sidebar (or go to https://resend.com/api-keys)
3. Click **"Create API Key"**
4. Give it a name (e.g., "ITSM System")
5. Select permissions: **"Sending access"** (or Full access)
6. Click **"Add"**
7. **Copy your API key** - it starts with `re_` (e.g., `re_123456789abcdef`)
   - ⚠️ **Important**: Copy it now! You won't be able to see it again

## Step 3: Add Domain (Optional but Recommended)

To send from `info@palmware.co`, you need to verify your domain:

1. Go to **"Domains"** in Resend dashboard
2. Click **"Add Domain"**
3. Enter: `palmware.co`
4. Resend will provide DNS records to add:
   - Add the TXT record for domain verification
   - Add the SPF record
   - Add the DKIM records
5. Click **"Verify Domain"**
6. Wait for verification (usually a few minutes)

**Note**: If you don't verify your domain, Resend will send from `onboarding@resend.dev` initially, but you can still use it for testing.

## Step 4: Add API Key to Convex

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Click **"Add Variable"**
5. Add:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxxxxxx` (your API key from Step 2)
6. Click **"Save"**

## Step 5: Redeploy Convex

```bash
npx convex deploy
```

Or if you're using Convex dev:
```bash
# Stop current dev server (Ctrl+C)
npx convex dev
```

## Step 6: Test Email Sending

1. Go to your application's **Email Settings** page
2. Make sure your SMTP settings are configured:
   - **SMTP Host**: `mail.palmware.co`
   - **SMTP Port**: `465`
   - **Use TLS/SSL**: ✅ Checked
   - **SMTP Username**: `info@palmware.co`
   - **SMTP Password**: (your email password)
   - **From Email**: `info@palmware.co`
   - **From Name**: `Palmware`
3. Click **"Test SMTP"**
4. Enter a test email address
5. Click **"Test SMTP"** button

You should see: **"SMTP test email sent successfully via Resend"** ✅

## How It Works

1. Your application sends email requests to Convex
2. Convex checks for `RESEND_API_KEY` environment variable
3. If found, Convex sends the email via Resend API
4. Resend delivers the email using your SMTP configuration
5. Email is sent from `info@palmware.co` (if domain verified) or Resend's domain

## Resend Free Tier

- **3,000 emails/month** (free)
- **100 emails/day** limit
- Perfect for testing and small applications
- Upgrade for more volume if needed

## Troubleshooting

### "Invalid API key"
- Make sure you copied the entire key (starts with `re_`)
- Check for extra spaces when pasting
- Verify the key is saved in Convex Dashboard

### "Domain not verified"
- If using `info@palmware.co`, verify the domain in Resend
- Or use Resend's default domain for testing: `onboarding@resend.dev`

### "Rate limit exceeded"
- Free tier: 100 emails/day
- Wait 24 hours or upgrade your Resend plan

### "Email not received"
- Check spam folder
- Verify recipient email address
- Check Resend dashboard → Logs for delivery status

## Next Steps

After setup:
1. ✅ Test email sending works
2. ✅ Create notifications with "Send Email" enabled
3. ✅ Emails will be sent through Resend using your SMTP config
4. ✅ Check email logs in your application

Your emails are now being sent using Resend! 🎉
