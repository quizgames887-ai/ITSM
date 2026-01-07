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

export default function ExchangeSettingsPage() {
  const exchangeConfig = useQuery(api.exchangeConfig.getConfig, {});
  const updateConfig = useMutation(api.exchangeConfig.updateConfig);
  const testConnection = useAction(api.exchangeConfig.testConnection);
  
  const { success, error: showError } = useToastContext();
  
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [type, setType] = useState<"online" | "server">("online");
  const [enabled, setEnabled] = useState(false);
  
  // Exchange Online fields
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [userEmail, setUserEmail] = useState("");
  
  // Exchange Server fields
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [version, setVersion] = useState<"ews" | "rest">("ews");
  
  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  const isAdmin = currentUser?.role === "admin";
  
  // Load existing config
  useEffect(() => {
    if (exchangeConfig) {
      setType(exchangeConfig.type);
      setEnabled(exchangeConfig.enabled);
      setTenantId(exchangeConfig.tenantId || "");
      setClientId(exchangeConfig.clientId || "");
      setClientSecret(exchangeConfig.clientSecret || "");
      setUserEmail(exchangeConfig.userEmail || "");
      setServerUrl(exchangeConfig.serverUrl || "");
      setUsername(exchangeConfig.username || "");
      setPassword(exchangeConfig.password || "");
      setVersion(exchangeConfig.version || "ews");
    }
  }, [exchangeConfig]);
  
  const handleSave = async () => {
    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }
    
    // Validate based on type
    if (type === "online") {
      if (!tenantId.trim() || !clientId.trim() || !clientSecret.trim() || !userEmail.trim()) {
        showError("All Exchange Online fields are required");
        return;
      }
    } else {
      if (!serverUrl.trim() || !username.trim() || !password.trim()) {
        showError("All Exchange Server fields are required");
        return;
      }
    }
    
    setLoading(true);
    try {
      await updateConfig({
        type,
        enabled,
        tenantId: type === "online" ? tenantId : undefined,
        clientId: type === "online" ? clientId : undefined,
        clientSecret: type === "online" ? clientSecret : undefined,
        userEmail: type === "online" ? userEmail : undefined,
        serverUrl: type === "server" ? serverUrl : undefined,
        username: type === "server" ? username : undefined,
        password: type === "server" ? password : undefined,
        version: type === "server" ? version : undefined,
        createdBy: currentUserId as Id<"users">,
      });
      success("Exchange configuration saved successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };
  
  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testConnection({
        type,
        tenantId: type === "online" ? tenantId : undefined,
        clientId: type === "online" ? clientId : undefined,
        clientSecret: type === "online" ? clientSecret : undefined,
        userEmail: type === "online" ? userEmail : undefined,
        serverUrl: type === "server" ? serverUrl : undefined,
        username: type === "server" ? username : undefined,
        password: type === "server" ? password : undefined,
      });
      
      if (result && result.success) {
        success(result.message || "Connection test successful");
      } else {
        showError(result?.message || "Connection test failed");
      }
    } catch (err: any) {
      showError(err.message || "Failed to test connection");
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
          <p className="text-slate-600 mb-4">You need admin privileges to manage Exchange configuration.</p>
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
          <h1 className="text-2xl font-semibold text-slate-900">Exchange Integration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure Microsoft Exchange for email sending and receiving
          </p>
        </div>
      </div>
      
      {/* Configuration Card */}
      <Card padding="lg">
        <div className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Exchange Type
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setType("online")}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  type === "online"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                Exchange Online (Microsoft 365)
              </button>
              <button
                type="button"
                onClick={() => setType("server")}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  type === "server"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                Exchange Server (On-Premises)
              </button>
            </div>
          </div>
          
          {/* Enable/Disable */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-slate-700">
              Enable Exchange Integration
            </label>
          </div>
          
          {/* Exchange Online Configuration */}
          {type === "online" && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Exchange Online Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Azure AD Tenant ID <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Found in Azure Portal → Azure Active Directory → Overview
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Client ID (Application ID) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Found in Azure Portal → App registrations → Your app → Overview
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Client Secret <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter client secret"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Created in Azure Portal → App registrations → Your app → Certificates & secrets
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Service Account Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="service@yourdomain.com"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Email address of the service account used to send emails
                </p>
              </div>
            </div>
          )}
          
          {/* Exchange Server Configuration */}
          {type === "server" && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Exchange Server Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Server URL <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://mail.company.com/EWS/Exchange.asmx"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Full URL to Exchange Web Services endpoint
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="domain\\username or username@domain.com"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  API Version
                </label>
                <Select
                  value={version}
                  onChange={(e) => setVersion(e.target.value as "ews" | "rest")}
                  options={[
                    { value: "ews", label: "EWS (Exchange Web Services)" },
                    { value: "rest", label: "REST API (Exchange 2013+)" },
                  ]}
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  EWS works with all Exchange versions. REST API requires Exchange 2013 or later.
                </p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || loading}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          </div>
          
          {/* Info Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Setup Instructions</h4>
              {type === "online" ? (
                <div className="text-sm text-blue-800 space-y-2">
                  <p>1. Register an app in Azure Portal (Azure Active Directory → App registrations)</p>
                  <p>2. Grant Mail.Send and Mail.Read permissions to the app</p>
                  <p>3. Create a client secret in Certificates & secrets</p>
                  <p>4. Enter the Tenant ID, Client ID, Client Secret, and service account email above</p>
                  <p>5. Click "Test Connection" to verify the configuration</p>
                </div>
              ) : (
                <div className="text-sm text-blue-800 space-y-2">
                  <p>1. Ensure Exchange Web Services (EWS) is enabled on your Exchange Server</p>
                  <p>2. Use a service account with mailbox send permissions</p>
                  <p>3. Enter the EWS endpoint URL (typically /EWS/Exchange.asmx)</p>
                  <p>4. For Exchange 2013+, you can use REST API instead of EWS</p>
                  <p>5. Click "Test Connection" to verify the configuration</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
