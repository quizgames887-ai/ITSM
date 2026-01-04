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
  // Use type assertion to avoid TypeScript errors until Convex fully syncs
  const emailSettings = useQuery(
    (api as any).email?.getSettings,
    {}
  ) as any;
  const updateSettings = useMutation((api as any).email?.updateSettings);
  const testSMTP = useAction((api as any).email?.testSMTP);
  const testInbound = useAction((api as any).email?.testInbound);
  const { success, error: showError } = useToastContext();
  
  // Email logs
  const [logFilter, setLogFilter] = useState<"all" | "sent" | "failed" | "pending">("all");
  // Using bracket notation to avoid TypeScript errors until Convex syncs
  const emailLogs = useQuery(
    (api as any).email?.getEmailLogs,
    (api as any).email?.getEmailLogs
      ? (logFilter === "all" ? { limit: 100 } : { limit: 100, status: logFilter })
      : "skip"
  ) as any[] | undefined;

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );

  const isAdmin = currentUser?.role === "admin";

  const [formData, setFormData] = useState({
    // General
    enabled: false,
    
    // SMTP
    smtpEnabled: false,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: "",
    smtpPassword: "",
    smtpFromEmail: "",
    smtpFromName: "",
    
    // Inbound
    inboundEnabled: false,
    inboundType: "imap" as "imap" | "pop3",
    inboundHost: "",
    inboundPort: 993,
    inboundSecure: true,
    inboundUser: "",
    inboundPassword: "",
    inboundMailbox: "INBOX",
    
    // Inbound Processing
    inboundCreateTickets: false,
    inboundTicketCategory: "IT Support",
    inboundTicketPriority: "medium" as "low" | "medium" | "high" | "critical",
  });

  const [testingSMTP, setTestingSMTP] = useState(false);
  const [testingInbound, setTestingInbound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // Load existing settings
  useEffect(() => {
    if (emailSettings) {
      setFormData({
        enabled: emailSettings.enabled,
        smtpEnabled: emailSettings.smtpEnabled,
        smtpHost: emailSettings.smtpHost,
        smtpPort: emailSettings.smtpPort,
        smtpSecure: emailSettings.smtpSecure,
        smtpUser: emailSettings.smtpUser,
        smtpPassword: emailSettings.smtpPassword,
        smtpFromEmail: emailSettings.smtpFromEmail,
        smtpFromName: emailSettings.smtpFromName || "",
        inboundEnabled: emailSettings.inboundEnabled,
        inboundType: emailSettings.inboundType,
        inboundHost: emailSettings.inboundHost,
        inboundPort: emailSettings.inboundPort,
        inboundSecure: emailSettings.inboundSecure,
        inboundUser: emailSettings.inboundUser,
        inboundPassword: emailSettings.inboundPassword,
        inboundMailbox: emailSettings.inboundMailbox || "INBOX",
        inboundCreateTickets: emailSettings.inboundCreateTickets,
        inboundTicketCategory: emailSettings.inboundTicketCategory || "IT Support",
        inboundTicketPriority: emailSettings.inboundTicketPriority || "medium",
      });
    }
  }, [emailSettings]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Card padding="lg">
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">🔒</span>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
              <p className="text-slate-600 mb-4">You need admin privileges to access email settings.</p>
              <Link href="/dashboard">
                <Button variant="gradient">Back to Dashboard</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!currentUserId) {
      showError("You must be logged in to save settings");
      return;
    }

    if (formData.smtpEnabled && (!formData.smtpHost || !formData.smtpUser || !formData.smtpFromEmail)) {
      showError("Please fill in all required SMTP fields");
      return;
    }

    if (formData.inboundEnabled && (!formData.inboundHost || !formData.inboundUser)) {
      showError("Please fill in all required inbound email fields");
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        enabled: formData.enabled,
        smtpEnabled: formData.smtpEnabled,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpSecure: formData.smtpSecure,
        smtpUser: formData.smtpUser,
        smtpPassword: formData.smtpPassword,
        smtpFromEmail: formData.smtpFromEmail,
        smtpFromName: formData.smtpFromName || undefined,
        inboundEnabled: formData.inboundEnabled,
        inboundType: formData.inboundType,
        inboundHost: formData.inboundHost,
        inboundPort: formData.inboundPort,
        inboundSecure: formData.inboundSecure,
        inboundUser: formData.inboundUser,
        inboundPassword: formData.inboundPassword,
        inboundMailbox: formData.inboundMailbox || undefined,
        inboundCreateTickets: formData.inboundCreateTickets,
        inboundTicketCategory: formData.inboundTicketCategory || undefined,
        inboundTicketPriority: formData.inboundTicketPriority || undefined,
        createdBy: currentUserId as Id<"users">,
      });
      success("Email settings saved successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to save email settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMTP = async () => {
    if (!testEmail.trim()) {
      showError("Please enter a test email address");
      return;
    }

    if (!formData.smtpHost || !formData.smtpUser || !formData.smtpFromEmail) {
      showError("Please configure SMTP settings first");
      return;
    }

    setTestingSMTP(true);
    try {
      const result = await testSMTP({
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpSecure: formData.smtpSecure,
        smtpUser: formData.smtpUser,
        smtpPassword: formData.smtpPassword,
        smtpFromEmail: formData.smtpFromEmail,
        testEmail: testEmail.trim(),
      });
      
      if (result.success) {
        success(result.message);
      } else {
        showError(result.message);
      }
    } catch (err: any) {
      showError(err.message || "Failed to test SMTP connection");
    } finally {
      setTestingSMTP(false);
    }
  };

  const handleTestInbound = async () => {
    if (!formData.inboundHost || !formData.inboundUser) {
      showError("Please configure inbound email settings first");
      return;
    }

    setTestingInbound(true);
    try {
      const result = await testInbound({
        inboundType: formData.inboundType,
        inboundHost: formData.inboundHost,
        inboundPort: formData.inboundPort,
        inboundSecure: formData.inboundSecure,
        inboundUser: formData.inboundUser,
        inboundPassword: formData.inboundPassword,
        inboundMailbox: formData.inboundMailbox || undefined,
      });
      
      if (result.success) {
        success(result.message);
      } else {
        showError(result.message);
      }
    } catch (err: any) {
      showError(err.message || "Failed to test inbound email connection");
    } finally {
      setTestingInbound(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              Email Integration
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Configure email services for notifications and inbound ticket creation
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <Card padding="lg" className="border-2 border-blue-200 bg-blue-50/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Enable Email Integration</h3>
              <p className="text-sm text-slate-600">Master switch to enable/disable all email features</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </Card>

        {/* SMTP Configuration */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">SMTP Configuration</h2>
              <p className="text-sm text-slate-600">Configure outgoing email for notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.smtpEnabled}
                onChange={(e) => setFormData({ ...formData, smtpEnabled: e.target.checked })}
                className="sr-only peer"
                disabled={!formData.enabled}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {formData.smtpEnabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="SMTP Host"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  disabled={!formData.enabled}
                />
                <Input
                  label="SMTP Port"
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                  placeholder="587"
                  disabled={!formData.enabled}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={formData.smtpSecure}
                  onChange={(e) => setFormData({ ...formData, smtpSecure: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  disabled={!formData.enabled}
                />
                <label htmlFor="smtpSecure" className="text-sm font-medium text-slate-700">
                  Use TLS/SSL (Secure connection)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="SMTP Username"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  placeholder="your-email@gmail.com"
                  disabled={!formData.enabled}
                />
                <Input
                  label="SMTP Password"
                  type="password"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={!formData.enabled}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="From Email Address"
                  type="email"
                  value={formData.smtpFromEmail}
                  onChange={(e) => setFormData({ ...formData, smtpFromEmail: e.target.value })}
                  placeholder="noreply@yourcompany.com"
                  disabled={!formData.enabled}
                />
                <Input
                  label="From Name (Optional)"
                  value={formData.smtpFromName}
                  onChange={(e) => setFormData({ ...formData, smtpFromName: e.target.value })}
                  placeholder="ITSM System"
                  disabled={!formData.enabled}
                />
              </div>

              {/* Test SMTP */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      label="Test Email Address"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      disabled={!formData.enabled}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleTestSMTP}
                    disabled={testingSMTP || !formData.enabled}
                    loading={testingSMTP}
                  >
                    {testingSMTP ? "Testing..." : "Test SMTP"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Inbound Email Configuration */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Inbound Email Configuration</h2>
              <p className="text-sm text-slate-600">Configure incoming email for ticket creation</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.inboundEnabled}
                onChange={(e) => setFormData({ ...formData, inboundEnabled: e.target.checked })}
                className="sr-only peer"
                disabled={!formData.enabled}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {formData.inboundEnabled && (
            <div className="space-y-4">
              <Select
                label="Email Protocol"
                value={formData.inboundType}
                onChange={(e) => setFormData({ ...formData, inboundType: e.target.value as "imap" | "pop3" })}
                options={[
                  { value: "imap", label: "IMAP (Recommended)" },
                  { value: "pop3", label: "POP3" },
                ]}
                disabled={!formData.enabled}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={`${formData.inboundType.toUpperCase()} Host`}
                  value={formData.inboundHost}
                  onChange={(e) => setFormData({ ...formData, inboundHost: e.target.value })}
                  placeholder={formData.inboundType === "imap" ? "imap.gmail.com" : "pop.gmail.com"}
                  disabled={!formData.enabled}
                />
                <Input
                  label={`${formData.inboundType.toUpperCase()} Port`}
                  type="number"
                  value={formData.inboundPort}
                  onChange={(e) => setFormData({ ...formData, inboundPort: parseInt(e.target.value) || 993 })}
                  placeholder={formData.inboundType === "imap" ? "993" : "995"}
                  disabled={!formData.enabled}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inboundSecure"
                  checked={formData.inboundSecure}
                  onChange={(e) => setFormData({ ...formData, inboundSecure: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  disabled={!formData.enabled}
                />
                <label htmlFor="inboundSecure" className="text-sm font-medium text-slate-700">
                  Use TLS/SSL (Secure connection)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Username"
                  value={formData.inboundUser}
                  onChange={(e) => setFormData({ ...formData, inboundUser: e.target.value })}
                  placeholder="your-email@gmail.com"
                  disabled={!formData.enabled}
                />
                <Input
                  label="Email Password"
                  type="password"
                  value={formData.inboundPassword}
                  onChange={(e) => setFormData({ ...formData, inboundPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={!formData.enabled}
                />
              </div>

              <Input
                label="Mailbox/Folder (Optional)"
                value={formData.inboundMailbox}
                onChange={(e) => setFormData({ ...formData, inboundMailbox: e.target.value })}
                placeholder="INBOX"
                disabled={!formData.enabled}
              />

              {/* Inbound Processing Settings */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inboundCreateTickets"
                    checked={formData.inboundCreateTickets}
                    onChange={(e) => setFormData({ ...formData, inboundCreateTickets: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    disabled={!formData.enabled}
                  />
                  <label htmlFor="inboundCreateTickets" className="text-sm font-medium text-slate-700">
                    Automatically create tickets from inbound emails
                  </label>
                </div>

                {formData.inboundCreateTickets && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <Input
                      label="Default Ticket Category"
                      value={formData.inboundTicketCategory}
                      onChange={(e) => setFormData({ ...formData, inboundTicketCategory: e.target.value })}
                      placeholder="IT Support"
                      disabled={!formData.enabled}
                    />
                    <Select
                      label="Default Ticket Priority"
                      value={formData.inboundTicketPriority}
                      onChange={(e) => setFormData({ ...formData, inboundTicketPriority: e.target.value as any })}
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                        { value: "critical", label: "Critical" },
                      ]}
                      disabled={!formData.enabled}
                    />
                  </div>
                )}
              </div>

              {/* Test Inbound */}
              <div className="pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={handleTestInbound}
                  disabled={testingInbound || !formData.enabled}
                  loading={testingInbound}
                >
                  {testingInbound ? "Testing..." : "Test Inbound Connection"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Email Logs */}
        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Email Logs</h2>
            <p className="text-sm text-slate-600">View history of all email sending attempts</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 border-b border-slate-200">
            <button
              onClick={() => setLogFilter("all")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                logFilter === "all"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLogFilter("sent")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                logFilter === "sent"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setLogFilter("failed")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                logFilter === "failed"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Failed
            </button>
            <button
              onClick={() => setLogFilter("pending")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                logFilter === "pending"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending
            </button>
          </div>

          {/* Logs Table */}
          {emailLogs === undefined ? (
            <div className="text-center py-8 text-slate-500">Loading logs...</div>
          ) : emailLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No email logs found{logFilter !== "all" ? ` for status: ${logFilter}` : ""}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">To</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">From</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Subject</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log: any) => {
                    const date = new Date(log.sentAt || log.createdAt);
                    const timeStr = date.toLocaleString();
                    
                    return (
                      <tr key={log._id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{timeStr}</td>
                        <td className="py-3 px-4 text-slate-900">{log.to}</td>
                        <td className="py-3 px-4 text-slate-600">{log.from}</td>
                        <td className="py-3 px-4 text-slate-900">{log.subject}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === "sent"
                                ? "bg-green-100 text-green-800"
                                : log.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {log.status === "sent" ? "✓ Sent" : log.status === "failed" ? "✗ Failed" : "⏳ Pending"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {log.errorMessage ? (
                            <span className="text-red-600" title={log.errorMessage}>
                              {log.errorMessage.length > 50
                                ? log.errorMessage.substring(0, 50) + "..."
                                : log.errorMessage}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            variant="gradient"
            onClick={handleSave}
            disabled={saving || !formData.enabled}
            loading={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
