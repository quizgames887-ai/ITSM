# Email Troubleshooting Guide

If you're not receiving emails, follow these steps to diagnose and fix the issue.

## Step 1: Check Email Logs

1. Go to **Email Settings** page in your app
2. Scroll down to **"Email Logs"** section
3. Look for recent email attempts
4. Check the **Status** column:
   - ✅ **Sent** = Email was sent successfully
   - ❌ **Failed** = Email failed (check error message)
   - 🧪 **Simulated** = Email was not actually sent (no API key configured)

## Step 2: Check Error Messages

In the Email Logs table, look at the **Error Message** column. Common errors:

### Error: "No email service configured"
**Solution**: 
- Add `RESEND_API_KEY` to Convex Dashboard → Settings → Environment Variables
- Run `npx convex deploy` to redeploy

### Error: "Resend error: domain not verified" or "domain unauthorized"
**Solution**:
- Option 1: Verify your domain in Resend
  1. Go to [resend.com/domains](https://resend.com/domains)
  2. Click "Add Domain"
  3. Enter your domain (e.g., `palmware.co`)
  4. Add the DNS records Resend provides
  5. Wait for verification (usually a few minutes)

- Option 2: Use Resend's default domain for testing
  1. In Email Settings, change **From Email** to: `onboarding@resend.dev`
  2. Save settings
  3. Try sending again

### Error: "Resend error: 401" or "403"
**Solution**:
- Your `RESEND_API_KEY` is incorrect or expired
- Go to [resend.com/api-keys](https://resend.com/api-keys)
- Create a new API key
- Update it in Convex Dashboard → Settings → Environment Variables
- Run `npx convex deploy`

### Error: "Invalid recipient email address"
**Solution**:
- Check the email address you're sending to
- Make sure it's a valid email format
- Try a different email address

## Step 3: Verify Configuration

### ✅ Check RESEND_API_KEY is Set

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Look for `RESEND_API_KEY`
5. Make sure:
   - It exists
   - It starts with `re_`
   - It's the correct value (no extra spaces)

### ✅ Check SMTP Settings

In Email Settings page, verify all settings are configured correctly:

**Required Settings:**
- **Email Integration Enabled**: ✅ Toggled ON (Master switch)
- **SMTP Enabled**: ✅ Toggled ON
- **SMTP Host**: Your SMTP server (e.g., `mail.yourdomain.com`, `smtp.gmail.com`)
- **SMTP Port**: `465` (SSL/TLS) or `587` (STARTTLS)
- **Use TLS/SSL**: ✅ Checked (Required for security)
- **SMTP Username**: Your full email address (e.g., `info@yourdomain.com`)
- **SMTP Password**: Your email account password
- **From Email**: Valid email address (e.g., `info@yourdomain.com` or `onboarding@resend.dev` for testing)
- **From Name**: Display name (optional but recommended)

**Provider-Specific Examples:**

**HostGator:**
```
SMTP Host: mail.yourdomain.com
SMTP Port: 465
Use TLS/SSL: ✅
SMTP Username: your-email@yourdomain.com
From Email: your-email@yourdomain.com
```

**Gmail:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 465
Use TLS/SSL: ✅
SMTP Username: your-email@gmail.com
SMTP Password: [App-specific password - see EMAIL_SETTINGS_CONFIGURATION.md]
From Email: your-email@gmail.com
```

**For detailed configuration instructions, see: [EMAIL_SETTINGS_CONFIGURATION.md](./EMAIL_SETTINGS_CONFIGURATION.md)**

### ✅ Redeploy After Changes

**IMPORTANT**: After adding/changing environment variables in Convex:
```bash
npx convex deploy
```

Or if using dev mode:
```bash
# Stop current dev (Ctrl+C)
npx convex dev
```

## Step 4: Test Email Sending

1. Go to **Email Settings** page
2. Scroll to **"Test SMTP Connection"** section
3. Enter a test email address (use your own email)
4. Click **"Test SMTP"** button
5. Wait for the result message
6. Check your email inbox (and spam folder)

## Step 5: Check Spam Folder

- Emails might be filtered as spam
- Check your spam/junk folder
- If found, mark as "Not Spam" to improve deliverability

## Step 6: Verify Domain in Resend (If Using Custom Domain)

If you want to send from `info@palmware.co`:

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter: `palmware.co`
4. Resend will show DNS records to add:
   - **TXT record** for domain verification
   - **SPF record** (TXT)
   - **DKIM records** (CNAME)
5. Add these records to your DNS provider
6. Wait for verification (can take a few minutes to 24 hours)
7. Once verified, you can send from `info@palmware.co`

**Note**: Until domain is verified, use `onboarding@resend.dev` for testing.

## Common Issues Summary

| Issue | Solution |
|-------|----------|
| Emails show as "Simulated" | Add `RESEND_API_KEY` to Convex and redeploy |
| "Domain not verified" error | Verify domain in Resend or use `onboarding@resend.dev` |
| "401 Unauthorized" error | Check `RESEND_API_KEY` is correct in Convex |
| Emails not received | Check spam folder, verify recipient email |
| "Invalid API key" | Create new API key in Resend and update in Convex |
| Changes not working | Run `npx convex deploy` after changing env vars |

## Still Not Working?

1. **Check Email Logs** - Look for specific error messages
2. **Check Convex Logs** - Go to Convex Dashboard → Logs
3. **Verify API Key** - Test it directly with Resend API
4. **Try Different Email Service** - Use SMTP2GO or Mailgun as alternative
5. **Contact Support** - Check Resend status page or support

## Quick Checklist

- [ ] `RESEND_API_KEY` added to Convex Dashboard
- [ ] Ran `npx convex deploy` after adding API key
- [ ] Email Integration enabled in Email Settings
- [ ] SMTP settings configured correctly
- [ ] Tested with "Test SMTP" button
- [ ] Checked Email Logs for errors
- [ ] Checked spam folder
- [ ] Domain verified in Resend (if using custom domain)

## Need More Help?

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **Resend Support**: [resend.com/support](https://resend.com/support)
- **Convex Documentation**: [docs.convex.dev](https://docs.convex.dev)
