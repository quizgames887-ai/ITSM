# Email Settings Configuration Guide

Complete guide to configure email settings in your ITSM application for sending email notifications via Resend.

## Overview

Your application uses Resend to send emails, but you need to configure SMTP settings in the app. These settings are used by Resend to determine the "From" email address and other email metadata.

## Step 1: Access Email Settings

### Option A: If Email Settings UI Page Exists

1. Log in to your application as an **Admin** user
2. Navigate to **Settings** → **Email Settings** (or similar)
3. You should see a form with SMTP configuration fields

### Option B: Configure Programmatically (If No UI)

If there's no Email Settings UI page yet, you can configure it programmatically using the `updateSettings` mutation from `convex/email.ts`.

## Step 2: Configure SMTP Settings

### Required Fields

Fill in the following fields in your Email Settings:

#### 1. **Email Integration Enabled** ✅
   - **Value**: `true` (checked/enabled)
   - **Description**: Master switch to enable/disable email functionality
   - **Required**: Yes

#### 2. **SMTP Enabled** ✅
   - **Value**: `true` (checked/enabled)
   - **Description**: Enable SMTP configuration for sending emails
   - **Required**: Yes

#### 3. **SMTP Host**
   - **Description**: Your SMTP server hostname
   - **Required**: Yes
   - **Examples**:
     - HostGator: `mail.yourdomain.com` (replace with your actual domain)
     - Gmail: `smtp.gmail.com`
     - Outlook: `smtp-mail.outlook.com`
     - Custom: `mail.yourdomain.com` or `smtp.yourdomain.com`

#### 4. **SMTP Port**
   - **Description**: SMTP server port number
   - **Required**: Yes
   - **Common Values**:
     - **465** (SSL/TLS - Recommended for most providers)
     - **587** (STARTTLS - Alternative)
     - **25** (Unencrypted - Not recommended)

#### 5. **Use TLS/SSL** ✅
   - **Value**: `true` (checked)
   - **Description**: Enable encryption for SMTP connection
   - **Required**: Yes (for security)
   - **Note**: Should be enabled for ports 465 and 587

#### 6. **SMTP Username**
   - **Description**: Your email account username
   - **Required**: Yes
   - **Format**: Usually your full email address
   - **Examples**:
     - `info@yourdomain.com`
     - `your-email@gmail.com`
     - `service@yourdomain.com`

#### 7. **SMTP Password**
   - **Description**: Your email account password
   - **Required**: Yes
   - **Security**: Stored encrypted in the database
   - **Note**: Use your email account password (not an app-specific password unless required)

#### 8. **From Email**
   - **Description**: The email address that will appear as the sender
   - **Required**: Yes
   - **Format**: Must be a valid email address
   - **Examples**:
     - `info@yourdomain.com`
     - `noreply@yourdomain.com`
     - `support@yourdomain.com`
   - **Important**: 
     - If using Resend, this should match a verified domain in Resend
     - For testing, you can use `onboarding@resend.dev` (Resend's default)

#### 9. **From Name** (Optional)
   - **Description**: Display name for the sender
   - **Required**: No
   - **Examples**:
     - `Your Company Name`
     - `ITSM Support`
     - `Support Team`
   - **Default**: If not provided, only the email address will be shown

## Step 3: Provider-Specific Configuration

### HostGator Configuration

If you're using HostGator email hosting:

```
Email Integration Enabled: ✅ true
SMTP Enabled: ✅ true
SMTP Host: mail.yourdomain.com
SMTP Port: 465
Use TLS/SSL: ✅ true
SMTP Username: your-email@yourdomain.com
SMTP Password: [Your HostGator email password]
From Email: your-email@yourdomain.com
From Name: Your Company Name
```

**Important Notes for HostGator:**
- Replace `yourdomain.com` with your actual domain name
- Use port **465** with SSL/TLS enabled (recommended)
- Or use port **587** with STARTTLS as alternative
- The username is your full email address
- Use the password for your HostGator email account

### Gmail Configuration

If you're using Gmail:

```
Email Integration Enabled: ✅ true
SMTP Enabled: ✅ true
SMTP Host: smtp.gmail.com
SMTP Port: 465
Use TLS/SSL: ✅ true
SMTP Username: your-email@gmail.com
SMTP Password: [App-specific password - see below]
From Email: your-email@gmail.com
From Name: Your Company Name
```

**Gmail App-Specific Password:**
1. Enable 2-Step Verification on your Google account
2. Go to [Google Account Settings](https://myaccount.google.com/)
3. Navigate to **Security** → **2-Step Verification** → **App passwords**
4. Generate an app-specific password
5. Use this password (not your regular Gmail password)

### Outlook/Office 365 Configuration

```
Email Integration Enabled: ✅ true
SMTP Enabled: ✅ true
SMTP Host: smtp-mail.outlook.com
SMTP Port: 587
Use TLS/SSL: ✅ true
SMTP Username: your-email@outlook.com
SMTP Password: [Your Outlook password]
From Email: your-email@outlook.com
From Name: Your Company Name
```

### Generic SMTP Configuration

For other email providers:

```
Email Integration Enabled: ✅ true
SMTP Enabled: ✅ true
SMTP Host: [Your provider's SMTP server]
SMTP Port: [465 or 587]
Use TLS/SSL: ✅ true
SMTP Username: [Your email address]
SMTP Password: [Your email password]
From Email: [Your email address]
From Name: [Your company name]
```

## Step 4: Save Settings

1. Fill in all required fields
2. Click **"Save Settings"** or **"Update Settings"** button
3. Wait for confirmation message
4. Settings are now saved in the database

## Step 5: Test Your Configuration

### Using the Test SMTP Feature

1. In Email Settings page, scroll to **"Test SMTP Connection"** section
2. Enter a test email address (use your own email for testing)
3. Click **"Test SMTP"** button
4. Wait for the result message

**Expected Results:**
- ✅ **Success**: "SMTP test email sent successfully via Resend"
- ❌ **Error**: Check the error message and refer to troubleshooting guide

### Verify Email Received

1. Check your email inbox
2. Check spam/junk folder (emails might be filtered initially)
3. If received, mark as "Not Spam" to improve deliverability

## Step 6: Verify Resend API Key

Even though you configure SMTP settings, Resend API key is still required:

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Verify `RESEND_API_KEY` exists and is correct
5. If not set, add it:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxxxxxx` (your Resend API key)
6. After adding/updating, run: `npx convex deploy`

## Configuration Examples

### Example 1: HostGator with Custom Domain

```json
{
  "enabled": true,
  "smtpEnabled": true,
  "smtpHost": "mail.example.com",
  "smtpPort": 465,
  "smtpSecure": true,
  "smtpUser": "info@example.com",
  "smtpPassword": "your-email-password",
  "smtpFromEmail": "info@example.com",
  "smtpFromName": "Example Company",
  "createdBy": "user-id-here"
}
```

### Example 2: Testing with Resend Default Domain

```json
{
  "enabled": true,
  "smtpEnabled": true,
  "smtpHost": "smtp.resend.com",
  "smtpPort": 465,
  "smtpSecure": true,
  "smtpUser": "onboarding@resend.dev",
  "smtpPassword": "not-used-with-resend",
  "smtpFromEmail": "onboarding@resend.dev",
  "smtpFromName": "ITSM System",
  "createdBy": "user-id-here"
}
```

**Note**: When using Resend, the SMTP credentials are informational. Resend uses the API key for authentication, but the "From Email" must match a verified domain or use `onboarding@resend.dev`.

## Important Notes

### How Resend Works with SMTP Settings

1. **API Key is Primary**: Resend uses the `RESEND_API_KEY` environment variable for authentication
2. **SMTP Settings are Metadata**: SMTP settings provide:
   - "From" email address
   - "From" name
   - Email formatting information
3. **Domain Verification**: If using a custom domain (e.g., `info@yourdomain.com`), you must verify the domain in Resend
4. **Testing Domain**: For testing, use `onboarding@resend.dev` which doesn't require verification

### Security Best Practices

1. ✅ Always enable TLS/SSL (Use TLS/SSL = true)
2. ✅ Use port 465 or 587 (never use unencrypted port 25)
3. ✅ Store passwords securely (they're encrypted in the database)
4. ✅ Use app-specific passwords for Gmail
5. ✅ Verify domains in Resend for production use
6. ✅ Regularly rotate API keys and passwords

## Troubleshooting

### Settings Not Saving

- **Check**: Are you logged in as an Admin user?
- **Check**: Are all required fields filled in?
- **Check**: Check browser console for errors
- **Solution**: Try refreshing the page and saving again

### Test Email Fails

- **Check**: Is `RESEND_API_KEY` set in Convex?
- **Check**: Are SMTP settings correct?
- **Check**: Is "Email Integration Enabled" turned on?
- **Check**: Is "SMTP Enabled" turned on?
- **Solution**: See [EMAIL_TROUBLESHOOTING.md](./EMAIL_TROUBLESHOOTING.md)

### Emails Not Being Sent

1. **Verify Email Settings**:
   - Email Integration Enabled = ✅
   - SMTP Enabled = ✅
   - All required fields filled

2. **Verify Resend API Key**:
   - Check Convex Dashboard → Environment Variables
   - Verify `RESEND_API_KEY` exists and is correct
   - Run `npx convex deploy` after adding/updating

3. **Check Email Logs**:
   - Go to Email Settings → Email Logs
   - Look for error messages
   - Check status (Sent, Failed, Simulated)

4. **Test Configuration**:
   - Use "Test SMTP" feature
   - Check if test email is received

## Quick Configuration Checklist

- [ ] Logged in as Admin user
- [ ] Navigated to Email Settings page
- [ ] Email Integration Enabled = ✅
- [ ] SMTP Enabled = ✅
- [ ] SMTP Host entered correctly
- [ ] SMTP Port set (465 or 587)
- [ ] Use TLS/SSL = ✅
- [ ] SMTP Username entered (full email address)
- [ ] SMTP Password entered
- [ ] From Email entered (valid email address)
- [ ] From Name entered (optional but recommended)
- [ ] Settings saved successfully
- [ ] Test SMTP sent successfully
- [ ] Test email received
- [ ] `RESEND_API_KEY` set in Convex Dashboard
- [ ] Ran `npx convex deploy` after setting API key

## Next Steps

After configuring email settings:

1. ✅ **Test Email Sending**: Use "Test SMTP" feature
2. ✅ **Create a Ticket**: Test that email notifications are sent
3. ✅ **Check Email Logs**: Verify emails are being sent successfully
4. ✅ **Monitor Deliverability**: Check spam folders and email delivery rates
5. ✅ **Verify Domain** (if using custom domain): Add and verify domain in Resend

## Related Documentation

- [Resend Setup Guide](./RESEND_SETUP.md) - Complete Resend setup instructions
- [Email Troubleshooting Guide](./EMAIL_TROUBLESHOOTING.md) - Troubleshooting common issues
- [Convex Email API](../convex/email.ts) - Technical reference for email functions

## Support

If you need help:

1. Check the troubleshooting guide
2. Review email logs for specific errors
3. Verify all configuration steps
4. Check Resend dashboard for delivery status
5. Contact support with specific error messages

---

**Last Updated**: Configuration guide for email settings in ITSM application
**Version**: 1.0
