"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function EmailSettingsPage() {
  const emailSettings = useQuery(api.email.getSettings, {});
  const emailLogs = useQuery(api.email.getEmailLogs, { limit: 50 });
  const emailStatus = useQuery(api.email.getEmailServiceStatus, {});
  const updateSettings = useMutation(api.email.updateSettings);
  const testSMTP = useAction(api.email.testSMTP);
  
  const { success, error: showError } = useToastContext();
  
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  
  // General settings
  const [enabled, setEnabled] = useState(false);
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  
  // SMTP Configuration
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  
  // Inbound Configuration
  const [inboundEnabled, setInboundEnabled] = useState(false);
  const [inboundType, setInboundType] = useState<"imap" | "pop3">("imap");
  const [inboundHost, setInboundHost] = useState("");
  const [inboundPort, setInboundPort] = useState(993);
  const [inboundSecure, setInboundSecure] = useState(true);
  const [inboundUser, setInboundUser] = useState("");
  const [inboundPassword, setInboundPassword] = useState("");
  const [inboundMailbox, setInboundMailbox] = useState("");
  const [inboundCreateTickets, setInboundCreateTickets] = useState(false);
  const [inboundTicketCategory, setInboundTicketCategory] = useState("");
  const [inboundTicketPriority, setInboundTicketPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  
  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  const isAdmin = currentUser?.role === "admin";
  
  // Load existing config
  useEffect(() => {
    if (emailSettings) {
      setEnabled(emailSettings.enabled || false);
      setSmtpEnabled(emailSettings.smtpEnabled || false);
      setSmtpHost(emailSettings.smtpHost || "");
      setSmtpPort(emailSettings.smtpPort || 587);
      setSmtpSecure(emailSettings.smtpSecure || false);
      setSmtpUser(emailSettings.smtpUser || "");
      setSmtpPassword(emailSettings.smtpPassword || "");
      setSmtpFromEmail(emailSettings.smtpFromEmail || "");
      setSmtpFromName(emailSettings.smtpFromName || "");
      setInboundEnabled(emailSettings.inboundEnabled || false);
      setInboundType(emailSettings.inboundType || "imap");
      setInboundHost(emailSettings.inboundHost || "");
      setInboundPort(emailSettings.inboundPort || 993);
      setInboundSecure(emailSettings.inboundSecure !== undefined ? emailSettings.inboundSecure : true);
      setInboundUser(emailSettings.inboundUser || "");
      setInboundPassword(emailSettings.inboundPassword || "");
      setInboundMailbox(emailSettings.inboundMailbox || "");
      setInboundCreateTickets(emailSettings.inboundCreateTickets || false);
      setInboundTicketCategory(emailSettings.inboundTicketCategory || "");
      setInboundTicketPriority(emailSettings.inboundTicketPriority || "medium");
    }
  }, [emailSettings]);
  
  const handleSave = async () => {
    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }
    
    // Validate SMTP settings if enabled
    if (smtpEnabled) {
      if (!smtpHost.trim() || !smtpUser.trim() || !smtpFromEmail.trim()) {
        showError("SMTP Host, Username, and From Email are required when SMTP is enabled");
        return;
      }
      if (smtpPort < 1 || smtpPort > 65535) {
        showError("SMTP Port must be between 1 and 65535");
        return;
      }
    }
    
    // Validate inbound settings if enabled
    if (inboundEnabled) {
      if (!inboundHost.trim() || !inboundUser.trim()) {
        showError("Inbound Host and Username are required when Inbound is enabled");
        return;
      }
      if (inboundPort < 1 || inboundPort > 65535) {
        showError("Inbound Port must be between 1 and 65535");
        return;
      }
    }
    
    setLoading(true);
    try {
      await updateSettings({
        enabled,
        smtpEnabled,
        smtpHost: smtpHost.trim(),
        smtpPort,
        smtpSecure,
        smtpUser: smtpUser.trim(),
        smtpPassword: smtpPassword.trim(),
        smtpFromEmail: smtpFromEmail.trim(),
        smtpFromName: smtpFromName.trim() || undefined,
        inboundEnabled,
        inboundType,
        inboundHost: inboundHost.trim(),
        inboundPort,
        inboundSecure,
        inboundUser: inboundUser.trim(),
        inboundPassword: inboundPassword.trim(),
        inboundMailbox: inboundMailbox.trim() || undefined,
        inboundCreateTickets,
        inboundTicketCategory: inboundTicketCategory.trim() || undefined,
        inboundTicketPriority: inboundTicketPriority || undefined,
        createdBy: currentUserId as Id<"users">,
      });
      success("Email settings saved successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save email settings");
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestSMTP = async () => {
    if (!testEmail.trim()) {
      showError("Please enter a test email address");
      return;
    }
    
    if (!smtpHost.trim() || !smtpUser.trim() || !smtpFromEmail.trim()) {
      showError("Please configure SMTP settings before testing");
      return;
    }
    
    setTesting(true);
    try {
      const result = await testSMTP({
        smtpHost: smtpHost.trim(),
        smtpPort,
        smtpSecure,
        smtpUser: smtpUser.trim(),
        smtpPassword: smtpPassword.trim(),
        smtpFromEmail: smtpFromEmail.trim(),
        testEmail: testEmail.trim(),
      });
      
      if (result && result.success) {
        success(result.message || "Test email sent successfully");
      } else {
        showError(result?.message || "Failed to send test email");
      }
    } catch (err: any) {
      showError(err.message || "Failed to test SMTP connection");
    } finally {
      setTesting(false);
    }
  };
  
  if (!isAdmin) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to manage email settings.</p>
          <Link href="/workplace">
            <Button variant="primary">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Email Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure SMTP and inbound email settings for notifications
          </p>
        </div>
      </div>
      
      {/* Status Card */}
      {emailStatus && (
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Email Service Status</h3>
              <div className="text-xs text-slate-600 space-y-1">
                <p>Settings Configured: {emailStatus.hasSettings ? "✓ Yes" : "✗ No"}</p>
                <p>Email Enabled: {emailStatus.settingsEnabled ? "✓ Yes" : "✗ No"}</p>
                <p>SMTP Enabled: {emailStatus.smtpEnabled ? "✓ Yes" : "✗ No"}</p>
                {emailStatus.smtpHost && <p>SMTP Host: {emailStatus.smtpHost}</p>}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              emailStatus.hasSmtpConfig && emailStatus.settingsEnabled
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {emailStatus.hasSmtpConfig && emailStatus.settingsEnabled ? "Ready" : "Not Configured"}
            </div>
          </div>
        </Card>
      )}
      
      {/* Configuration Card */}
      <Card padding="lg">
        <div className="space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">General Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-slate-700">
                  Enable Email Notifications
                </label>
              </div>
            </div>
          </div>
          
          {/* SMTP Configuration */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">SMTP Configuration (Outbound)</h3>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="smtpEnabled"
                  checked={smtpEnabled}
                  onChange={(e) => setSmtpEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="smtpEnabled" className="text-sm font-medium text-slate-700">
                  Enable SMTP
                </label>
              </div>
            </div>
            
            {smtpEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SMTP Host <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.hostgator.com"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Your SMTP server hostname
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SMTP Port <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                      placeholder="587"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Usually 587 (TLS) or 465 (SSL)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="smtpSecure" className="text-sm font-medium text-slate-700">
                    Use SSL/TLS (Secure Connection)
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SMTP Username <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="your-email@domain.com"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SMTP Password <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      From Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={smtpFromEmail}
                      onChange={(e) => setSmtpFromEmail(e.target.value)}
                      placeholder="noreply@yourdomain.com"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Email address to send from
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      From Name (Optional)
                    </label>
                    <Input
                      type="text"
                      value={smtpFromName}
                      onChange={(e) => setSmtpFromName(e.target.value)}
                      placeholder="ITSM System"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Display name for sent emails
                    </p>
                  </div>
                </div>
                
                {/* Test SMTP */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Test SMTP Connection</h4>
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleTestSMTP}
                      disabled={testing || loading}
                    >
                      {testing ? "Sending..." : "Send Test Email"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Inbound Configuration (Collapsed by default) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Inbound Email Configuration</h3>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="inboundEnabled"
                  checked={inboundEnabled}
                  onChange={(e) => setInboundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="inboundEnabled" className="text-sm font-medium text-slate-700">
                  Enable Inbound
                </label>
              </div>
            </div>
            
            {inboundEnabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Protocol Type
                  </label>
                  <Select
                    value={inboundType}
                    onChange={(e) => setInboundType(e.target.value as "imap" | "pop3")}
                    options={[
                      { value: "imap", label: "IMAP" },
                      { value: "pop3", label: "POP3" },
                    ]}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Inbound Host <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={inboundHost}
                      onChange={(e) => setInboundHost(e.target.value)}
                      placeholder="imap.hostgator.com"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Inbound Port <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={inboundPort}
                      onChange={(e) => setInboundPort(parseInt(e.target.value) || 993)}
                      placeholder="993"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="inboundSecure"
                    checked={inboundSecure}
                    onChange={(e) => setInboundSecure(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="inboundSecure" className="text-sm font-medium text-slate-700">
                    Use SSL/TLS (Secure Connection)
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Inbound Username <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={inboundUser}
                      onChange={(e) => setInboundUser(e.target.value)}
                      placeholder="your-email@domain.com"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Inbound Password <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      value={inboundPassword}
                      onChange={(e) => setInboundPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mailbox (Optional)
                  </label>
                  <Input
                    type="text"
                    value={inboundMailbox}
                    onChange={(e) => setInboundMailbox(e.target.value)}
                    placeholder="INBOX"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Mailbox to monitor (default: INBOX)
                  </p>
                </div>
                
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Ticket Creation Settings</h4>
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="inboundCreateTickets"
                      checked={inboundCreateTickets}
                      onChange={(e) => setInboundCreateTickets(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="inboundCreateTickets" className="text-sm font-medium text-slate-700">
                      Automatically create tickets from incoming emails
                    </label>
                  </div>
                  
                  {inboundCreateTickets && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Default Category (Optional)
                        </label>
                        <Input
                          type="text"
                          value={inboundTicketCategory}
                          onChange={(e) => setInboundTicketCategory(e.target.value)}
                          placeholder="Email"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Default Priority
                        </label>
                        <Select
                          value={inboundTicketPriority}
                          onChange={(e) => setInboundTicketPriority(e.target.value as "low" | "medium" | "high" | "critical")}
                          options={[
                            { value: "low", label: "Low" },
                            { value: "medium", label: "Medium" },
                            { value: "high", label: "High" },
                            { value: "critical", label: "Critical" },
                          ]}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
          
          {/* Info Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Setup Instructions</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>1. Configure your SMTP settings (HostGator, Gmail, or other provider)</p>
                <p>2. Enable SMTP and fill in all required fields</p>
                <p>3. Test your SMTP connection using the test email feature</p>
                <p>4. Set the RESEND_API_KEY environment variable in Convex Dashboard for best results</p>
                <p>5. Save your settings to activate email notifications</p>
                <p className="mt-2">
                  <strong>Note:</strong> See <code className="bg-blue-100 px-1 rounded">EMAIL_SETTINGS_CONFIGURATION.md</code> for detailed provider-specific instructions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Email Logs */}
      {emailLogs && emailLogs.length > 0 && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Email Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-700">To</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-700">Subject</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-700">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((log) => (
                  <tr key={log._id} className="border-b border-slate-100">
                    <td className="py-2 px-3 text-slate-600">{log.to}</td>
                    <td className="py-2 px-3 text-slate-600">{log.subject}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.status === "sent"
                          ? "bg-green-100 text-green-800"
                          : log.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
