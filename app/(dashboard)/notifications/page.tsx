"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const notificationTypes = [
  { value: "info", label: "Information", color: "bg-blue-100 text-blue-700" },
  { value: "success", label: "Success", color: "bg-green-100 text-green-700" },
  { value: "warning", label: "Warning", color: "bg-amber-100 text-amber-700" },
  { value: "error", label: "Error", color: "bg-red-100 text-red-700" },
  { value: "announcement", label: "Announcement", color: "bg-purple-100 text-purple-700" },
];

export default function NotificationsPage() {
  const notifications = useQuery(api.notifications.listAll, {});
  const stats = useQuery(api.notifications.getStats, {});
  const users = useQuery(api.users.list, {});
  const createBroadcast = useMutation(api.notifications.createBroadcast);
  const removeNotification = useMutation(api.notifications.remove);
  const removeAllForUser = useMutation(api.notifications.removeAllForUser);
  const { success, error: showError } = useToastContext();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    type: "info",
    title: "",
    message: "",
    targetType: "all", // "all" or "specific"
    targetUserIds: [] as string[],
    sendEmail: false, // Email notification option
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );

  const isAdmin = currentUser?.role === "admin";

  const handleCreateNotification = async () => {
    if (!newNotification.title.trim()) {
      showError("Please enter a title");
      return;
    }
    if (!newNotification.message.trim()) {
      showError("Please enter a message");
      return;
    }

    try {
      const result = await createBroadcast({
        type: newNotification.type,
        title: newNotification.title.trim(),
        message: newNotification.message.trim(),
        targetUserIds: newNotification.targetType === "specific" 
          ? newNotification.targetUserIds as Id<"users">[]
          : undefined,
        sendEmail: newNotification.sendEmail,
      });

      success(`Notification sent to ${result.count} user(s)!`);
      setNewNotification({
        type: "info",
        title: "",
        message: "",
        targetType: "all",
        targetUserIds: [],
        sendEmail: false,
      });
      setShowCreateForm(false);
    } catch (err: any) {
      showError(err.message || "Failed to create notification");
    }
  };

  const handleDelete = async (id: Id<"notifications">) => {
    try {
      await removeNotification({ id });
      success("Notification deleted");
    } catch (err: any) {
      showError(err.message || "Failed to delete notification");
    }
  };

  const handleDeleteAllForUser = async (userId: Id<"users">) => {
    try {
      const result = await removeAllForUser({ userId });
      success(`Deleted ${result.deleted} notifications`);
    } catch (err: any) {
      showError(err.message || "Failed to delete notifications");
    }
  };

  const getTypeColor = (type: string) => {
    return notificationTypes.find((t) => t.value === type)?.color || "bg-slate-100 text-slate-700";
  };

  const filteredNotifications = notifications?.filter((n) => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || n.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (notifications === undefined || currentUser === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-slate-200 rounded-xl"></div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to access this page.</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md" className="text-center">
          <div className="text-2xl lg:text-3xl font-bold text-slate-900">{stats?.total || 0}</div>
          <div className="text-xs lg:text-sm text-slate-500 mt-1">Total Notifications</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl lg:text-3xl font-bold text-amber-600">{stats?.unread || 0}</div>
          <div className="text-xs lg:text-sm text-slate-500 mt-1">Unread</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl lg:text-3xl font-bold text-green-600">{stats?.read || 0}</div>
          <div className="text-xs lg:text-sm text-slate-500 mt-1">Read</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl lg:text-3xl font-bold text-blue-600">{users?.length || 0}</div>
          <div className="text-xs lg:text-sm text-slate-500 mt-1">Total Users</div>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notifications..."
              className="w-full sm:w-64"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "all", label: "All Types" },
                ...notificationTypes.map((t) => ({ value: t.value, label: t.label })),
              ]}
              className="w-full sm:w-40"
            />
          </div>
          <Button
            variant="gradient"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-full sm:w-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Notification
          </Button>
        </div>
      </Card>

      {/* Create Form */}
      {showCreateForm && (
        <Card padding="md" className="border-2 border-blue-200 bg-blue-50/30">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Notification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <Select
                value={newNotification.type}
                onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                options={notificationTypes.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Send To</label>
              <Select
                value={newNotification.targetType}
                onChange={(e) => setNewNotification({ ...newNotification, targetType: e.target.value, targetUserIds: [] })}
                options={[
                  { value: "all", label: "All Users" },
                  { value: "specific", label: "Specific Users" },
                ]}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <Input
                value={newNotification.title}
                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                placeholder="Notification title..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea
                value={newNotification.message}
                onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                placeholder="Notification message..."
                rows={3}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>
            {newNotification.targetType === "specific" && users && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Users</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {users.map((user) => (
                    <label key={user._id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newNotification.targetUserIds.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewNotification({
                              ...newNotification,
                              targetUserIds: [...newNotification.targetUserIds, user._id],
                            });
                          } else {
                            setNewNotification({
                              ...newNotification,
                              targetUserIds: newNotification.targetUserIds.filter((id) => id !== user._id),
                            });
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-sm text-slate-700">{user.name}</span>
                      <span className="text-xs text-slate-500">({user.email})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newNotification.sendEmail}
                  onChange={(e) => setNewNotification({ ...newNotification, sendEmail: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Notify by email</span>
                </div>
              </label>
              {newNotification.sendEmail && (
                <p className="text-xs text-slate-500 mt-1 ml-7">
                  An email notification will be sent to all recipients
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="gradient" onClick={handleCreateNotification}>
              Send Notification
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Notifications Table */}
      <Card padding="none" className="overflow-hidden">
        {filteredNotifications && filteredNotifications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase hidden lg:table-cell">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase hidden sm:table-cell">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotifications.map((notification) => (
                  <tr key={notification._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(notification.type)}`}>
                        {notification.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{notification.title}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{notification.message}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="text-sm text-slate-700">{notification.userName}</p>
                      <p className="text-xs text-slate-500">{notification.userEmail}</p>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                        notification.read 
                          ? "bg-green-100 text-green-700" 
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {notification.read ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <p className="text-sm text-slate-700">{new Date(notification.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-500">{new Date(notification.createdAt).toLocaleTimeString()}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleDelete(notification._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-slate-600 mb-2">No notifications found</p>
            <p className="text-sm text-slate-500">Create a new notification to get started</p>
          </div>
        )}
        
        {filteredNotifications && filteredNotifications.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-600">
              Showing <span className="font-medium">{filteredNotifications.length}</span> of{" "}
              <span className="font-medium">{notifications?.length || 0}</span> notifications
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
