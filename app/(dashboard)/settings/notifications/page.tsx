"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function NotificationSettingsPage() {
  const notificationSettings = useQuery(api.notificationSettings.getSettings, {});
  const templateConfig = useQuery(api.emailTemplateConfig.getConfig, {});
  const updateNotificationSettings = useMutation(api.notificationSettings.updateSettings);
  const updateTemplateConfig = useMutation(api.emailTemplateConfig.updateConfig);
  
  const { success, error: showError } = useToastContext();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "template">("events");
  
  // Notification Settings State
  const [enabled, setEnabled] = useState(true);
  const [notifyOnTicketCreated, setNotifyOnTicketCreated] = useState(true);
  const [notifyOnTicketCreatedForCreator, setNotifyOnTicketCreatedForCreator] = useState(true);
  const [notifyOnTicketCreatedForAssignee, setNotifyOnTicketCreatedForAssignee] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [notifyOnStatusChangeToNew, setNotifyOnStatusChangeToNew] = useState(false);
  const [notifyOnStatusChangeToInProgress, setNotifyOnStatusChangeToInProgress] = useState(true);
  const [notifyOnStatusChangeToOnHold, setNotifyOnStatusChangeToOnHold] = useState(true);
  const [notifyOnStatusChangeToResolved, setNotifyOnStatusChangeToResolved] = useState(true);
  const [notifyOnStatusChangeToClosed, setNotifyOnStatusChangeToClosed] = useState(true);
  const [notifyOnStatusChangeToRejected, setNotifyOnStatusChangeToRejected] = useState(true);
  const [notifyOnStatusChangeToNeedApproval, setNotifyOnStatusChangeToNeedApproval] = useState(true);
  const [notifyOnAssignment, setNotifyOnAssignment] = useState(true);
  const [notifyOnAssignmentToAssignee, setNotifyOnAssignmentToAssignee] = useState(true);
  const [notifyOnAssignmentToCreator, setNotifyOnAssignmentToCreator] = useState(true);
  const [notifyOnPriorityChange, setNotifyOnPriorityChange] = useState(true);
  const [notifyOnPriorityChangeToLow, setNotifyOnPriorityChangeToLow] = useState(false);
  const [notifyOnPriorityChangeToMedium, setNotifyOnPriorityChangeToMedium] = useState(true);
  const [notifyOnPriorityChangeToHigh, setNotifyOnPriorityChangeToHigh] = useState(true);
  const [notifyOnPriorityChangeToCritical, setNotifyOnPriorityChangeToCritical] = useState(true);
  const [notifyForIncidents, setNotifyForIncidents] = useState(true);
  const [notifyForServiceRequests, setNotifyForServiceRequests] = useState(true);
  const [notifyForInquiries, setNotifyForInquiries] = useState(true);
  const [notifyCreator, setNotifyCreator] = useState(true);
  const [notifyAssignee, setNotifyAssignee] = useState(true);
  const [notifyWatchers, setNotifyWatchers] = useState(false);
  
  // Template Configuration State
  const [templateEnabled, setTemplateEnabled] = useState(true);
  const [includeTicketTitle, setIncludeTicketTitle] = useState(true);
  const [includeTicketDescription, setIncludeTicketDescription] = useState(true);
  const [includeTicketId, setIncludeTicketId] = useState(true);
  const [includeTicketNumber, setIncludeTicketNumber] = useState(false);
  const [includeCategory, setIncludeCategory] = useState(true);
  const [includePriority, setIncludePriority] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [includeType, setIncludeType] = useState(true);
  const [includeUrgency, setIncludeUrgency] = useState(false);
  const [includeSlaDeadline, setIncludeSlaDeadline] = useState(true);
  const [includeCreatedDate, setIncludeCreatedDate] = useState(true);
  const [includeUpdatedDate, setIncludeUpdatedDate] = useState(false);
  const [includeResolvedDate, setIncludeResolvedDate] = useState(true);
  const [includeCreatorName, setIncludeCreatorName] = useState(true);
  const [includeCreatorEmail, setIncludeCreatorEmail] = useState(false);
  const [includeAssigneeName, setIncludeAssigneeName] = useState(true);
  const [includeAssigneeEmail, setIncludeAssigneeEmail] = useState(false);
  const [includeStatusChange, setIncludeStatusChange] = useState(true);
  const [includePriorityChange, setIncludePriorityChange] = useState(true);
  const [includeAssignmentChange, setIncludeAssignmentChange] = useState(true);
  const [includeTicketLink, setIncludeTicketLink] = useState(true);
  const [includeComments, setIncludeComments] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [includeFormData, setIncludeFormData] = useState(true);
  const [emailHeaderText, setEmailHeaderText] = useState("");
  const [emailFooterText, setEmailFooterText] = useState("");
  const [emailSignature, setEmailSignature] = useState("");
  
  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  const isAdmin = currentUser?.role === "admin";
  
  // Load existing notification settings
  useEffect(() => {
    if (notificationSettings) {
      setEnabled(notificationSettings.enabled ?? true);
      setNotifyOnTicketCreated(notificationSettings.notifyOnTicketCreated ?? true);
      setNotifyOnTicketCreatedForCreator(notificationSettings.notifyOnTicketCreatedForCreator ?? true);
      setNotifyOnTicketCreatedForAssignee(notificationSettings.notifyOnTicketCreatedForAssignee ?? true);
      setNotifyOnStatusChange(notificationSettings.notifyOnStatusChange ?? true);
      setNotifyOnStatusChangeToNew(notificationSettings.notifyOnStatusChangeToNew ?? false);
      setNotifyOnStatusChangeToInProgress(notificationSettings.notifyOnStatusChangeToInProgress ?? true);
      setNotifyOnStatusChangeToOnHold(notificationSettings.notifyOnStatusChangeToOnHold ?? true);
      setNotifyOnStatusChangeToResolved(notificationSettings.notifyOnStatusChangeToResolved ?? true);
      setNotifyOnStatusChangeToClosed(notificationSettings.notifyOnStatusChangeToClosed ?? true);
      setNotifyOnStatusChangeToRejected(notificationSettings.notifyOnStatusChangeToRejected ?? true);
      setNotifyOnStatusChangeToNeedApproval(notificationSettings.notifyOnStatusChangeToNeedApproval ?? true);
      setNotifyOnAssignment(notificationSettings.notifyOnAssignment ?? true);
      setNotifyOnAssignmentToAssignee(notificationSettings.notifyOnAssignmentToAssignee ?? true);
      setNotifyOnAssignmentToCreator(notificationSettings.notifyOnAssignmentToCreator ?? true);
      setNotifyOnPriorityChange(notificationSettings.notifyOnPriorityChange ?? true);
      setNotifyOnPriorityChangeToLow(notificationSettings.notifyOnPriorityChangeToLow ?? false);
      setNotifyOnPriorityChangeToMedium(notificationSettings.notifyOnPriorityChangeToMedium ?? true);
      setNotifyOnPriorityChangeToHigh(notificationSettings.notifyOnPriorityChangeToHigh ?? true);
      setNotifyOnPriorityChangeToCritical(notificationSettings.notifyOnPriorityChangeToCritical ?? true);
      setNotifyForIncidents(notificationSettings.notifyForIncidents ?? true);
      setNotifyForServiceRequests(notificationSettings.notifyForServiceRequests ?? true);
      setNotifyForInquiries(notificationSettings.notifyForInquiries ?? true);
      setNotifyCreator(notificationSettings.notifyCreator ?? true);
      setNotifyAssignee(notificationSettings.notifyAssignee ?? true);
      setNotifyWatchers(notificationSettings.notifyWatchers ?? false);
    }
  }, [notificationSettings]);
  
  // Load existing template config
  useEffect(() => {
    if (templateConfig) {
      setTemplateEnabled(templateConfig.enabled ?? true);
      setIncludeTicketTitle(templateConfig.includeTicketTitle ?? true);
      setIncludeTicketDescription(templateConfig.includeTicketDescription ?? true);
      setIncludeTicketId(templateConfig.includeTicketId ?? true);
      setIncludeTicketNumber(templateConfig.includeTicketNumber ?? false);
      setIncludeCategory(templateConfig.includeCategory ?? true);
      setIncludePriority(templateConfig.includePriority ?? true);
      setIncludeStatus(templateConfig.includeStatus ?? true);
      setIncludeType(templateConfig.includeType ?? true);
      setIncludeUrgency(templateConfig.includeUrgency ?? false);
      setIncludeSlaDeadline(templateConfig.includeSlaDeadline ?? true);
      setIncludeCreatedDate(templateConfig.includeCreatedDate ?? true);
      setIncludeUpdatedDate(templateConfig.includeUpdatedDate ?? false);
      setIncludeResolvedDate(templateConfig.includeResolvedDate ?? true);
      setIncludeCreatorName(templateConfig.includeCreatorName ?? true);
      setIncludeCreatorEmail(templateConfig.includeCreatorEmail ?? false);
      setIncludeAssigneeName(templateConfig.includeAssigneeName ?? true);
      setIncludeAssigneeEmail(templateConfig.includeAssigneeEmail ?? false);
      setIncludeStatusChange(templateConfig.includeStatusChange ?? true);
      setIncludePriorityChange(templateConfig.includePriorityChange ?? true);
      setIncludeAssignmentChange(templateConfig.includeAssignmentChange ?? true);
      setIncludeTicketLink(templateConfig.includeTicketLink ?? true);
      setIncludeComments(templateConfig.includeComments ?? false);
      setIncludeAttachments(templateConfig.includeAttachments ?? false);
      setIncludeFormData(templateConfig.includeFormData ?? true);
      setEmailHeaderText(templateConfig.emailHeaderText || "");
      setEmailFooterText(templateConfig.emailFooterText || "");
      setEmailSignature(templateConfig.emailSignature || "");
    }
  }, [templateConfig]);
  
  const handleSaveNotificationSettings = async () => {
    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }
    
    setLoading(true);
    try {
      await updateNotificationSettings({
        enabled,
        notifyOnTicketCreated,
        notifyOnTicketCreatedForCreator,
        notifyOnTicketCreatedForAssignee,
        notifyOnStatusChange,
        notifyOnStatusChangeToNew,
        notifyOnStatusChangeToInProgress,
        notifyOnStatusChangeToOnHold,
        notifyOnStatusChangeToResolved,
        notifyOnStatusChangeToClosed,
        notifyOnStatusChangeToRejected,
        notifyOnStatusChangeToNeedApproval,
        notifyOnAssignment,
        notifyOnAssignmentToAssignee,
        notifyOnAssignmentToCreator,
        notifyOnPriorityChange,
        notifyOnPriorityChangeToLow,
        notifyOnPriorityChangeToMedium,
        notifyOnPriorityChangeToHigh,
        notifyOnPriorityChangeToCritical,
        notifyForIncidents,
        notifyForServiceRequests,
        notifyForInquiries,
        notifyCreator,
        notifyAssignee,
        notifyWatchers,
        createdBy: currentUserId as Id<"users">,
      });
      success("Notification settings saved successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save notification settings");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveTemplateConfig = async () => {
    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }
    
    setLoading(true);
    try {
      await updateTemplateConfig({
        enabled: templateEnabled,
        includeTicketTitle,
        includeTicketDescription,
        includeTicketId,
        includeTicketNumber,
        includeCategory,
        includePriority,
        includeStatus,
        includeType,
        includeUrgency,
        includeSlaDeadline,
        includeCreatedDate,
        includeUpdatedDate,
        includeResolvedDate,
        includeCreatorName,
        includeCreatorEmail,
        includeAssigneeName,
        includeAssigneeEmail,
        includeStatusChange,
        includePriorityChange,
        includeAssignmentChange,
        includeTicketLink,
        includeComments,
        includeAttachments,
        includeFormData,
        emailHeaderText: emailHeaderText.trim() || undefined,
        emailFooterText: emailFooterText.trim() || undefined,
        emailSignature: emailSignature.trim() || undefined,
        createdBy: currentUserId as Id<"users">,
      });
      success("Email template configuration saved successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save template configuration");
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAdmin) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to manage notification settings.</p>
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
          <h1 className="text-2xl font-semibold text-slate-900">Email Notification Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure which events trigger email notifications and what information to include
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("events")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "events"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Notification Events
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "template"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Email Template
          </button>
        </nav>
      </div>
      
      {/* Notification Events Tab */}
      {activeTab === "events" && (
        <Card padding="lg">
          <div className="space-y-6">
            {/* Master Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-slate-900">Enable Email Notifications</h3>
                <p className="text-sm text-slate-600">Master switch for all email notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {/* Ticket Creation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Ticket Creation</h3>
              <div className="space-y-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyOnTicketCreated}
                    onChange={(e) => setNotifyOnTicketCreated(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Send email when ticket is created</span>
                </label>
                {notifyOnTicketCreated && (
                  <div className="pl-7 space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnTicketCreatedForCreator}
                        onChange={(e) => setNotifyOnTicketCreatedForCreator(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Notify ticket creator</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnTicketCreatedForAssignee}
                        onChange={(e) => setNotifyOnTicketCreatedForAssignee(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Notify assigned agent</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            {/* Status Changes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Status Changes</h3>
              <div className="space-y-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyOnStatusChange}
                    onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Send email on status change</span>
                </label>
                {notifyOnStatusChange && (
                  <div className="pl-7 space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnStatusChangeToNew}
                        onChange={(e) => setNotifyOnStatusChangeToNew(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Status: New</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnStatusChangeToInProgress}
                        onChange={(e) => setNotifyOnStatusChangeToInProgress(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Status: In Progress</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnStatusChangeToOnHold}
                        onChange={(e) => setNotifyOnStatusChangeToOnHold(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Status: On Hold</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnStatusChangeToResolved}
                        onChange={(e) => setNotifyOnStatusChangeToResolved(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Status: Resolved</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnStatusChangeToClosed}
                        onChange={(e) => setNotifyOnStatusChangeToClosed(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Status: Closed</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnStatusChangeToRejected}
                        onChange={(e) => setNotifyOnStatusChangeToRejected(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Status: Rejected</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnStatusChangeToNeedApproval}
                        onChange={(e) => setNotifyOnStatusChangeToNeedApproval(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Status: Need Approval</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            {/* Assignment Changes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Assignment Changes</h3>
              <div className="space-y-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyOnAssignment}
                    onChange={(e) => setNotifyOnAssignment(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Send email on assignment change</span>
                </label>
                {notifyOnAssignment && (
                  <div className="pl-7 space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnAssignmentToAssignee}
                        onChange={(e) => setNotifyOnAssignmentToAssignee(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Notify assigned agent</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnAssignmentToCreator}
                        onChange={(e) => setNotifyOnAssignmentToCreator(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Notify ticket creator</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            {/* Priority Changes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Priority Changes</h3>
              <div className="space-y-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyOnPriorityChange}
                    onChange={(e) => setNotifyOnPriorityChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Send email on priority change</span>
                </label>
                {notifyOnPriorityChange && (
                  <div className="pl-7 space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnPriorityChangeToLow}
                        onChange={(e) => setNotifyOnPriorityChangeToLow(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Priority: Low</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnPriorityChangeToMedium}
                        onChange={(e) => setNotifyOnPriorityChangeToMedium(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Priority: Medium</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnPriorityChangeToHigh}
                        onChange={(e) => setNotifyOnPriorityChangeToHigh(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Priority: High</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notifyOnPriorityChangeToCritical}
                        onChange={(e) => setNotifyOnPriorityChangeToCritical(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Priority: Critical</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            {/* Ticket Type Filters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Ticket Type Filters</h3>
              <div className="space-y-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyForIncidents}
                    onChange={(e) => setNotifyForIncidents(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Send notifications for Incidents</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyForServiceRequests}
                    onChange={(e) => setNotifyForServiceRequests(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Send notifications for Service Requests</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyForInquiries}
                    onChange={(e) => setNotifyForInquiries(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Send notifications for Inquiries</span>
                </label>
              </div>
            </div>
            
            {/* Recipient Filters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Recipient Filters</h3>
              <div className="space-y-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyCreator}
                    onChange={(e) => setNotifyCreator(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Always notify ticket creator</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyAssignee}
                    onChange={(e) => setNotifyAssignee(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Always notify assigned agent</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notifyWatchers}
                    onChange={(e) => setNotifyWatchers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Notify ticket watchers (future feature)</span>
                </label>
              </div>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button
                onClick={handleSaveNotificationSettings}
                disabled={loading || !enabled}
                variant="primary"
              >
                {loading ? "Saving..." : "Save Notification Settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Email Template Tab */}
      {activeTab === "template" && (
        <Card padding="lg">
          <div className="space-y-6">
            {/* Master Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-slate-900">Enable Template Configuration</h3>
                <p className="text-sm text-slate-600">Control what information is included in email templates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateEnabled}
                  onChange={(e) => setTemplateEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {/* Basic Ticket Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Basic Ticket Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeTicketTitle}
                    onChange={(e) => setIncludeTicketTitle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Ticket Title</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeTicketDescription}
                    onChange={(e) => setIncludeTicketDescription(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Ticket Description</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeTicketId}
                    onChange={(e) => setIncludeTicketId(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Ticket ID</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeTicketNumber}
                    onChange={(e) => setIncludeTicketNumber(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Ticket Number</span>
                </label>
              </div>
            </div>
            
            {/* Ticket Metadata */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Ticket Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeCategory}
                    onChange={(e) => setIncludeCategory(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Category</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includePriority}
                    onChange={(e) => setIncludePriority(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Priority</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeStatus}
                    onChange={(e) => setIncludeStatus(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Status</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeType}
                    onChange={(e) => setIncludeType(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Type</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeUrgency}
                    onChange={(e) => setIncludeUrgency(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Urgency</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeSlaDeadline}
                    onChange={(e) => setIncludeSlaDeadline(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">SLA Deadline</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeCreatedDate}
                    onChange={(e) => setIncludeCreatedDate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Created Date</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeUpdatedDate}
                    onChange={(e) => setIncludeUpdatedDate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Updated Date</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeResolvedDate}
                    onChange={(e) => setIncludeResolvedDate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Resolved Date</span>
                </label>
              </div>
            </div>
            
            {/* User Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">User Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeCreatorName}
                    onChange={(e) => setIncludeCreatorName(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Creator Name</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeCreatorEmail}
                    onChange={(e) => setIncludeCreatorEmail(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Creator Email</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeAssigneeName}
                    onChange={(e) => setIncludeAssigneeName(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Assignee Name</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeAssigneeEmail}
                    onChange={(e) => setIncludeAssigneeEmail(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Assignee Email</span>
                </label>
              </div>
            </div>
            
            {/* Change Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Change Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeStatusChange}
                    onChange={(e) => setIncludeStatusChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Status Change (old → new)</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includePriorityChange}
                    onChange={(e) => setIncludePriorityChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Priority Change (old → new)</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeAssignmentChange}
                    onChange={(e) => setIncludeAssignmentChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Assignment Change</span>
                </label>
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeTicketLink}
                    onChange={(e) => setIncludeTicketLink(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Ticket Link</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Recent Comments</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeAttachments}
                    onChange={(e) => setIncludeAttachments(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Attachment List</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeFormData}
                    onChange={(e) => setIncludeFormData(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Form Data (Service Requests)</span>
                </label>
              </div>
            </div>
            
            {/* Email Formatting */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Email Formatting</h3>
              <div className="space-y-4 pl-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Header Text (optional)
                  </label>
                  <Input
                    type="text"
                    value={emailHeaderText}
                    onChange={(e) => setEmailHeaderText(e.target.value)}
                    placeholder="e.g., Your Company Name - IT Support"
                    className="max-w-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Footer Text (optional)
                  </label>
                  <Input
                    type="text"
                    value={emailFooterText}
                    onChange={(e) => setEmailFooterText(e.target.value)}
                    placeholder="e.g., This is an automated notification. Please do not reply."
                    className="max-w-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Signature (optional)
                  </label>
                  <textarea
                    value={emailSignature}
                    onChange={(e) => setEmailSignature(e.target.value)}
                    placeholder="e.g., Best regards,&#10;IT Support Team"
                    rows={4}
                    className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button
                onClick={handleSaveTemplateConfig}
                disabled={loading || !templateEnabled}
                variant="primary"
              >
                {loading ? "Saving..." : "Save Template Configuration"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
