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

        {/* Users List */}
        <div className="space-y-4">
          {!users || users === null || (filteredAndSortedUsers && filteredAndSortedUsers.length === 0) ? (
            <Card hover padding="lg">
              <div className="text-center py-12">
                <p className="text-slate-600 mb-2">
                  {!users || users === null ? "Loading users..." : "No users found"}
                </p>
                {users === null && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 font-medium mt-2">
                      ⚠️ Error: Query returned null
                    </p>
                    <p className="text-xs text-slate-500">
                      The users query returned null. This might indicate a connection issue with Convex.
                      Please check the browser console (F12) for more details.
                    </p>
                  </div>
                )}
                {users && Array.isArray(users) && users.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 mt-2">
                      The database appears to be empty. Create a user to get started.
                    </p>
                    {currentUser && (
                      <div className="text-xs text-slate-400 mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="font-medium text-amber-800 mb-1">⚠️ Diagnostic Info:</p>
                        <p>You are logged in as: {currentUser.email}</p>
                        <p>Your user ID: {currentUser._id}</p>
                        {dbStatus && (
                          <div className="mt-2 p-2 bg-white rounded border border-amber-300">
                            <p className="font-medium text-amber-900 mb-1">Database Status Query:</p>
                            <p>User count: {dbStatus.userCount}</p>
                            {"error" in dbStatus && dbStatus.error && (
                              <p className="text-red-600">Error: {dbStatus.error}</p>
                            )}
                            {dbStatus.userCount > 0 && users && users.length === 0 && (
                              <p className="text-red-600 font-semibold mt-1">
                                ⚠️ INCONSISTENCY: Diagnostic found {dbStatus.userCount} users, but list query returned 0!
                              </p>
                            )}
                          </div>
                        )}
                        <p className="mt-2 text-amber-700">
                          Your user exists in the database, but the list query returned empty.
                          This may indicate:
                        </p>
                        <ul className="mt-2 text-amber-700 list-disc list-inside space-y-1">
                          <li>The database is empty (no users created yet)</li>
                          <li>A database connection issue</li>
                          <li>The query is failing silently</li>
                          <li>Check Convex dashboard logs for [users:list] messages</li>
                        </ul>
                        <p className="mt-2 text-amber-700">
                          Check the browser console (F12) for detailed error messages.
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-4">
                      If you're logged in but see this message, try:
                    </p>
                    <ul className="text-xs text-slate-400 mt-2 list-disc list-inside space-y-1">
                      <li>Refreshing the page</li>
                      <li>Checking the browser console (F12) for errors</li>
                      <li>Verifying your Convex deployment is running</li>
                      <li>Creating a new user via registration</li>
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            filteredAndSortedUsers?.map((user, index) => {
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
                <Card
                  key={user._id}
                  hover
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="space-y-4">
                    {/* User Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-base font-semibold shadow-md hover:shadow-lg transition-all hover:scale-110 flex-shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Impersonate Button - Only for admins viewing other users */}
                          {isAdmin && !isCurrentUser && (
                            <div className="mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleImpersonate(user._id, user.name, user.email)}
                                className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                              >
                                <svg
                                  className="w-3.5 h-3.5 mr-1.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                View as {user.name.split(" ")[0]}
                              </Button>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                            {isEditing && editingField === "name" ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editValues.name || ""}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, name: e.target.value })
                                  }
                                  className="flex-1"
                                  placeholder="Name"
                                />
                                <Button
                                  size="sm"
                                  variant="gradient"
                                  onClick={() => handleSave(user._id)}
                                >
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancel}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">
                                  {user.name}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs sm:text-sm text-indigo-600 font-normal">
                                      (You)
                                    </span>
                                  )}
                                </h3>
                                {!isCurrentUser && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(user, "name")}
                                    className="text-xs"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                  </Button>
                                )}
                              </>
                            )}
                            <span
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border uppercase tracking-wide ${getRoleBadgeColor(
                                user.role
                              )} self-start`}
                            >
                              {user.role.toUpperCase()}
                            </span>
                          </div>
                          {isEditing && editingField === "email" ? (
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                value={editValues.email || ""}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, email: e.target.value })
                                }
                                className="flex-1"
                                placeholder="Email"
                                type="email"
                              />
                              <Button
                                size="sm"
                                variant="gradient"
                                onClick={() => handleSave(user._id)}
                              >
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancel}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs sm:text-sm text-slate-600 break-words">
                                {user.email}
                              </p>
                              {!isCurrentUser && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(user, "email")}
                                  className="text-xs p-1"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-200">
                      {/* Role */}
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          Role
                        </label>
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
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="gradient"
                              onClick={() => handleSave(user._id)}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancel}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(
                                user.role
                              )}`}
                            >
                              {user.role.toUpperCase()}
                            </span>
                            {!isCurrentUser && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(user, "role")}
                                className="text-xs p-1"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Onboarding Status */}
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          Onboarding
                        </label>
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
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="gradient"
                              onClick={() => handleSave(user._id)}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancel}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                user.onboardingCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {user.onboardingCompleted ? "Completed" : "Pending"}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(user, "onboarding")}
                              className="text-xs p-1"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Password Reset */}
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          Password
                        </label>
                        {isEditing && editingField === "password" ? (
                          <div className="space-y-2">
                            <Input
                              type="password"
                              value={editValues.newPassword || ""}
                              onChange={(e) =>
                                setEditValues({ ...editValues, newPassword: e.target.value })
                              }
                              placeholder="New password"
                              className="text-xs"
                            />
                            <Input
                              type="password"
                              value={editValues.confirmPassword || ""}
                              onChange={(e) =>
                                setEditValues({ ...editValues, confirmPassword: e.target.value })
                              }
                              placeholder="Confirm password"
                              className="text-xs"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="gradient"
                                onClick={() => handlePasswordReset(user._id)}
                                className="text-xs px-2 py-1"
                              >
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                className="text-xs px-2 py-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">••••••••</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(user, "password")}
                              className="text-xs p-1"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                />
                              </svg>
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Created Date */}
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          Joined
                        </label>
                        <p className="text-xs text-slate-900">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(user.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Last Updated */}
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          Last Updated
                        </label>
                        <p className="text-xs text-slate-900">
                          {new Date(user.updatedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(user.updatedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
