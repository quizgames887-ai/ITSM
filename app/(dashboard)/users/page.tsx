"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = {
  _id: Id<"users">;
  email: string;
  name: string;
  role: "user" | "admin" | "agent";
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
};

type EditingField = "name" | "email" | "role" | "onboarding" | "password" | null;

export default function UsersPage() {
  const router = useRouter();
  const users = useQuery(api.users.list, {});
  // Diagnostic query to check database status
  const dbStatus = useQuery(api.users.getDatabaseStatus, {});
  const updateUser = useMutation(api.users.update);
  const resetUserPassword = useMutation(api.users.resetUserPassword);
  const { success, error: showError } = useToastContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "role" | "createdAt">("name");
  const [editingUser, setEditingUser] = useState<Id<"users"> | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValues, setEditValues] = useState<{
    name?: string;
    email?: string;
    role?: string;
    onboardingCompleted?: boolean;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  
  // Fetch current user directly to check admin status
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  // Also try to find in list as fallback
  const currentUserFromList = users?.find((u) => u._id === currentUserId);
  
  // Check if current user is admin - prefer direct query result
  const isAdmin = currentUser?.role === "admin" || currentUserFromList?.role === "admin";

  const handleEdit = (user: User, field: EditingField) => {
    if (!isAdmin) {
      showError("Only admins can edit user details");
      return;
    }
    setEditingUser(user._id);
    setEditingField(field);
    setEditValues({
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handlePasswordReset = async (userId: Id<"users">) => {
    if (!isAdmin) {
      showError("Only admins can reset passwords");
      return;
    }

    if (!editValues.newPassword || !editValues.confirmPassword) {
      showError("Please enter and confirm the new password");
      return;
    }

    if (editValues.newPassword.length < 8) {
      showError("Password must be at least 8 characters long");
      return;
    }

    if (editValues.newPassword !== editValues.confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    try {
      await resetUserPassword({
        userId: userId,
        newPassword: editValues.newPassword,
      });

      success("Password reset successfully!");
      setEditingUser(null);
      setEditingField(null);
      setEditValues({});
    } catch (err: any) {
      showError(err.message || "Failed to reset password");
    }
  };

  const handleSave = async (userId: Id<"users">) => {
    if (!isAdmin) {
      showError("Only admins can update users");
      return;
    }

    try {
      const updates: any = {};
      
      if (editingField === "name" && editValues.name !== undefined) {
        updates.name = editValues.name.trim();
        if (!updates.name) {
          showError("Name cannot be empty");
          return;
        }
      }
      
      if (editingField === "email" && editValues.email !== undefined) {
        updates.email = editValues.email.trim();
        if (!updates.email || !updates.email.includes("@")) {
          showError("Please enter a valid email address");
          return;
        }
      }
      
      if (editingField === "role" && editValues.role !== undefined) {
        updates.role = editValues.role;
      }
      
      if (editingField === "onboarding" && editValues.onboardingCompleted !== undefined) {
        updates.onboardingCompleted = editValues.onboardingCompleted;
      }

      // Don't handle password reset here - use handlePasswordReset instead
      if (editingField === "password") {
        showError("Use the password reset button to change passwords");
        return;
      }

      await updateUser({
        id: userId,
        ...updates,
      });

      success("User updated successfully!");
      setEditingUser(null);
      setEditingField(null);
      setEditValues({});
    } catch (err: any) {
      showError(err.message || "Failed to update user");
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditingField(null);
    setEditValues({});
  };

  const handleImpersonate = (userId: Id<"users">, userName: string, userEmail: string) => {
    if (!isAdmin) {
      showError("Only admins can impersonate users");
      return;
    }

    if (!currentUserId) {
      showError("Unable to impersonate: No admin session found");
      return;
    }

    // Store the original admin user ID
    localStorage.setItem("originalAdminId", currentUserId);
    localStorage.setItem("originalAdminName", localStorage.getItem("userName") || "");
    localStorage.setItem("originalAdminEmail", localStorage.getItem("userEmail") || "");

    // Set the impersonated user
    localStorage.setItem("userId", userId);
    localStorage.setItem("userName", userName);
    localStorage.setItem("userEmail", userEmail);
    localStorage.setItem("isImpersonating", "true");

    success(`Now viewing as ${userName}. You can exit impersonation from the navigation bar.`);
    
    // Navigate to the profile page to view as this user
    router.push(`/profile?impersonate=true`);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "agent":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const filteredAndSortedUsers = users && Array.isArray(users)
    ? users.filter((user) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.role.toLowerCase().includes(searchLower);
        
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "email":
            return a.email.localeCompare(b.email);
          case "role":
            return a.role.localeCompare(b.role);
          case "createdAt":
            return b.createdAt - a.createdAt;
          default:
            return 0;
        }
      })
    : [];

  // Calculate statistics
  const stats = users
    ? {
        total: users.length,
        admins: users.filter((u) => u.role === "admin").length,
        agents: users.filter((u) => u.role === "agent").length,
        regularUsers: users.filter((u) => u.role === "user").length,
        onboardingCompleted: users.filter((u) => u.onboardingCompleted).length,
        onboardingPending: users.filter((u) => !u.onboardingCompleted).length,
      }
    : {
        total: 0,
        admins: 0,
        agents: 0,
        regularUsers: 0,
        onboardingCompleted: 0,
        onboardingPending: 0,
      };

  // Wait for both queries to load before checking admin status
  if (users === undefined || (currentUserId && currentUser === undefined)) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Debug: If current user exists but list is empty, log a warning
  if (currentUser && users && users.length === 0) {
    console.warn("[UsersPage] Current user exists but list is empty!", {
      currentUserId: currentUser._id,
      currentUserEmail: currentUser.email,
      usersListLength: users.length
    });
  }

  // Debug: Log users data (only in development)
  if (typeof window !== "undefined") {
    if (users === undefined) {
      console.log("[UsersPage] Users query is still loading...");
    } else if (users === null) {
      console.error("[UsersPage] Users query returned null - this should not happen!");
    } else {
      console.log("[UsersPage] Users data:", users);
      console.log("[UsersPage] Users count:", users.length);
      console.log("[UsersPage] Users is array:", Array.isArray(users));
      if (users.length === 0) {
        console.warn("[UsersPage] No users found in database!");
        console.warn("[UsersPage] Current user:", currentUser);
        console.warn("[UsersPage] Current user ID from localStorage:", currentUserId);
        console.warn("[UsersPage] Database status:", dbStatus);
        console.warn("[UsersPage] This might indicate:");
        console.warn("  1. The database is empty");
        console.warn("  2. The query is failing silently");
        console.warn("  3. There's a connection issue with Convex");
        console.warn("  4. Check Convex dashboard logs for [users:list] messages");
      }
    }
    
    if (dbStatus) {
      console.log("[UsersPage] Database status from diagnostic query:", dbStatus);
      if (dbStatus.userCount > 0 && users && users.length === 0) {
        console.error("[UsersPage] INCONSISTENCY DETECTED:");
        console.error("[UsersPage] Diagnostic query found", dbStatus.userCount, "users");
        console.error("[UsersPage] But list query returned", users.length, "users");
        console.error("[UsersPage] This suggests a query issue, not a data issue");
      }
    }
  }

  // Only show access denied if we've confirmed the user is not an admin
  if (!isAdmin && currentUser !== undefined) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Access Denied
              </h2>
              <p className="text-slate-600 mb-4">
                You need admin privileges to access this page.
              </p>
              <Link href="/dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              User Management
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Manage all user details, roles, and permissions
            </p>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-slate-900">{stats?.total || 0}</div>
              <div className="text-xs text-slate-600 mt-1">Total Users</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-purple-700">{stats?.admins || 0}</div>
              <div className="text-xs text-slate-600 mt-1">Admins</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-blue-700">{stats?.agents || 0}</div>
              <div className="text-xs text-slate-600 mt-1">Agents</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-slate-700">{stats?.regularUsers || 0}</div>
              <div className="text-xs text-slate-600 mt-1">Users</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-green-700">{stats?.onboardingCompleted || 0}</div>
              <div className="text-xs text-slate-600 mt-1">Onboarded</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-amber-700">{stats?.onboardingPending || 0}</div>
              <div className="text-xs text-slate-600 mt-1">Pending</div>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card hover padding="lg" className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Search Users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or role..."
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
            <Select
              label="Filter by Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: "all", label: "All Roles" },
                { value: "admin", label: "Admin" },
                { value: "agent", label: "Agent" },
                { value: "user", label: "User" },
              ]}
            />
            <Select
              label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              options={[
                { value: "name", label: "Name" },
                { value: "email", label: "Email" },
                { value: "role", label: "Role" },
                { value: "createdAt", label: "Date Joined" },
              ]}
            />
          </div>
        </Card>

        {/* Users Table */}
        <Card padding="none" className="overflow-hidden">
          {!users || users === null || (filteredAndSortedUsers && filteredAndSortedUsers.length === 0) ? (
            <div className="text-center py-12 px-6">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-slate-600 mb-2">
                {!users || users === null ? "Loading users..." : "No users found"}
              </p>
              {searchTerm && (
                <p className="text-sm text-slate-500">
                  Try adjusting your search or filter criteria
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">
                      Joined
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedUsers?.map((user) => {
                    const getInitials = (name: string) => {
                      return name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                    };

                    const isCurrentUser = user._id === currentUserId;
                    const isEditing = editingUser === user._id;

                    return (
                      <tr
                        key={user._id}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isCurrentUser ? "bg-indigo-50/30" : ""
                        }`}
                      >
                        {/* User Info */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0">
                              {getInitials(user.name)}
                            </div>
                            <div className="min-w-0">
                              {isEditing && editingField === "name" ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editValues.name || ""}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, name: e.target.value })
                                    }
                                    className="w-40"
                                    placeholder="Name"
                                  />
                                  <Button size="sm" variant="gradient" onClick={() => handleSave(user._id)}>
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancel}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-900 truncate">
                                    {user.name}
                                    {isCurrentUser && (
                                      <span className="ml-2 text-xs text-indigo-600 font-normal">
                                        (You)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              )}
                              {isEditing && editingField === "email" ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    value={editValues.email || ""}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, email: e.target.value })
                                    }
                                    className="w-48"
                                    placeholder="Email"
                                    type="email"
                                  />
                                  <Button size="sm" variant="gradient" onClick={() => handleSave(user._id)}>
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancel}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500 truncate">{user.email}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-4 px-4">
                          {isEditing && editingField === "role" ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={editValues.role || user.role}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, role: e.target.value })
                                }
                                options={[
                                  { value: "user", label: "User" },
                                  { value: "agent", label: "Agent" },
                                  { value: "admin", label: "Admin" },
                                ]}
                                className="w-24"
                              />
                              <Button size="sm" variant="gradient" onClick={() => handleSave(user._id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancel}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                                user.role
                              )}`}
                            >
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          {isEditing && editingField === "onboarding" ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={editValues.onboardingCompleted ? "true" : "false"}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    onboardingCompleted: e.target.value === "true",
                                  })
                                }
                                options={[
                                  { value: "true", label: "Completed" },
                                  { value: "false", label: "Pending" },
                                ]}
                                className="w-28"
                              />
                              <Button size="sm" variant="gradient" onClick={() => handleSave(user._id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancel}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                user.onboardingCompleted
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {user.onboardingCompleted ? "Active" : "Pending"}
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-4 px-4 hidden md:table-cell">
                          <p className="text-sm text-slate-900">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6">
                          {isEditing && editingField === "password" ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                type="password"
                                value={editValues.newPassword || ""}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, newPassword: e.target.value })
                                }
                                placeholder="New password"
                                className="w-36 text-xs"
                              />
                              <Input
                                type="password"
                                value={editValues.confirmPassword || ""}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, confirmPassword: e.target.value })
                                }
                                placeholder="Confirm password"
                                className="w-36 text-xs"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="gradient"
                                  onClick={() => handlePasswordReset(user._id)}
                                  className="text-xs"
                                >
                                  Reset
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancel}
                                  className="text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit Name */}
                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleEdit(user, "name")}
                                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Edit name"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}

                              {/* Edit Role */}
                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleEdit(user, "role")}
                                  className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Change role"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                  </svg>
                                </button>
                              )}

                              {/* Edit Status */}
                              <button
                                onClick={() => handleEdit(user, "onboarding")}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Change status"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => handleEdit(user, "password")}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Reset password"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                              </button>

                              {/* Impersonate */}
                              {isAdmin && !isCurrentUser && (
                                <button
                                  onClick={() => handleImpersonate(user._id, user.name, user.email)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title={`View as ${user.name}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Table Footer */}
          {filteredAndSortedUsers && filteredAndSortedUsers.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3">
              <p className="text-sm text-slate-600">
                Showing <span className="font-medium">{filteredAndSortedUsers.length}</span> of{" "}
                <span className="font-medium">{users?.length || 0}</span> users
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
