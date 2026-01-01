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

const TEAM_COLORS = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Teal", value: "bg-teal-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Red", value: "bg-red-500" },
];

export default function UsersPage() {
  const router = useRouter();
  const users = useQuery(api.users.list, {});
  const teams = useQuery(api.teams.list, {});
  const dbStatus = useQuery(api.users.getDatabaseStatus, {});
  const updateUser = useMutation(api.users.update);
  const resetUserPassword = useMutation(api.users.resetUserPassword);
  const createTeam = useMutation(api.teams.create);
  const updateTeam = useMutation(api.teams.update);
  const removeTeam = useMutation(api.teams.remove);
  const addTeamMember = useMutation(api.teams.addMember);
  const removeTeamMember = useMutation(api.teams.removeMember);
  
  const { success, error: showError } = useToastContext();
  const [activeTab, setActiveTab] = useState<"users" | "teams">("users");
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

  // Team management state
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", description: "", color: "bg-blue-500" });
  const [expandedTeam, setExpandedTeam] = useState<Id<"teams"> | null>(null);
  const [showAddMember, setShowAddMember] = useState<Id<"teams"> | null>(null);

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  const currentUserFromList = users?.find((u) => u._id === currentUserId);
  const isAdmin = currentUser?.role === "admin" || currentUserFromList?.role === "admin";

  // Get available agents for a team
  const availableAgents = useQuery(
    api.teams.getAvailableAgents,
    showAddMember ? { teamId: showAddMember } : "skip"
  );

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

    localStorage.setItem("originalAdminId", currentUserId);
    localStorage.setItem("originalAdminName", localStorage.getItem("userName") || "");
    localStorage.setItem("originalAdminEmail", localStorage.getItem("userEmail") || "");
    localStorage.setItem("userId", userId);
    localStorage.setItem("userName", userName);
    localStorage.setItem("userEmail", userEmail);
    localStorage.setItem("isImpersonating", "true");

    success(`Now viewing as ${userName}. You can exit impersonation from the navigation bar.`);
    router.push(`/profile?impersonate=true`);
  };

  // Team management handlers
  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      showError("Team name is required");
      return;
    }

    try {
      await createTeam({
        name: newTeam.name.trim(),
        description: newTeam.description.trim() || undefined,
        color: newTeam.color,
        createdBy: currentUserId as Id<"users">,
      });
      success("Team created successfully!");
      setShowCreateTeam(false);
      setNewTeam({ name: "", description: "", color: "bg-blue-500" });
    } catch (err: any) {
      showError(err.message || "Failed to create team");
    }
  };

  const handleDeleteTeam = async (teamId: Id<"teams">) => {
    if (!confirm("Are you sure you want to delete this team? All members will be removed.")) {
      return;
    }

    try {
      await removeTeam({ id: teamId });
      success("Team deleted successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to delete team");
    }
  };

  const handleAddMember = async (teamId: Id<"teams">, userId: Id<"users">) => {
    try {
      await addTeamMember({ teamId, userId });
      success("Member added to team!");
      setShowAddMember(null);
    } catch (err: any) {
      showError(err.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (teamId: Id<"teams">, userId: Id<"users">) => {
    try {
      await removeTeamMember({ teamId, userId });
      success("Member removed from team!");
    } catch (err: any) {
      showError(err.message || "Failed to remove member");
    }
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
          case "name": return a.name.localeCompare(b.name);
          case "email": return a.email.localeCompare(b.email);
          case "role": return a.role.localeCompare(b.role);
          case "createdAt": return b.createdAt - a.createdAt;
          default: return 0;
        }
      })
    : [];

  const stats = users
    ? {
        total: users.length,
        admins: users.filter((u) => u.role === "admin").length,
        agents: users.filter((u) => u.role === "agent").length,
        regularUsers: users.filter((u) => u.role === "user").length,
        teams: teams?.length || 0,
      }
    : { total: 0, admins: 0, agents: 0, regularUsers: 0, teams: 0 };

  if (users === undefined || (currentUserId && currentUser === undefined)) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!isAdmin && currentUser !== undefined) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to access this page.</p>
          <Link href="/dashboard">
            <Button variant="gradient">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-600">Manage users, roles, and support teams</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-600">Total Users</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-purple-700">{stats.admins}</div>
          <div className="text-xs text-slate-600">Admins</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.agents}</div>
          <div className="text-xs text-slate-600">Agents</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-slate-700">{stats.regularUsers}</div>
          <div className="text-xs text-slate-600">Users</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-teal-700">{stats.teams}</div>
          <div className="text-xs text-slate-600">Teams</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "teams"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Support Teams
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <>
          {/* Filters */}
          <Card padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Search Users"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email..."
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

          {/* Edit User Modal */}
          {editingUser && editingField && (
            <Card padding="lg" className="border-2 border-blue-200 bg-blue-50/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 text-lg">
                  {editingField === "role" && "Change User Role"}
                  {editingField === "password" && "Reset User Password"}
                  {editingField === "name" && "Edit User Name"}
                  {editingField === "email" && "Edit User Email"}
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                  {users?.find(u => u._id === editingUser)?.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{users?.find(u => u._id === editingUser)?.name}</p>
                  <p className="text-sm text-slate-500">{users?.find(u => u._id === editingUser)?.email}</p>
                </div>
              </div>

              {/* Role Change */}
              {editingField === "role" && (
                <div className="space-y-4">
                  <Select
                    label="Select New Role"
                    value={editValues.role || ""}
                    onChange={(e) => setEditValues({ ...editValues, role: e.target.value })}
                    options={[
                      { value: "user", label: "User - Regular user access" },
                      { value: "agent", label: "Agent - Support agent access" },
                      { value: "admin", label: "Admin - Full administrative access" },
                    ]}
                  />
                  <div className="flex gap-2 pt-2">
                    <Button variant="gradient" onClick={() => handleSave(editingUser)}>
                      Update Role
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Password Reset */}
              {editingField === "password" && (
                <div className="space-y-4">
                  <Input
                    label="New Password"
                    type="password"
                    value={editValues.newPassword || ""}
                    onChange={(e) => setEditValues({ ...editValues, newPassword: e.target.value })}
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={editValues.confirmPassword || ""}
                    onChange={(e) => setEditValues({ ...editValues, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                  {editValues.newPassword && editValues.newPassword.length > 0 && editValues.newPassword.length < 8 && (
                    <p className="text-sm text-amber-600">Password must be at least 8 characters</p>
                  )}
                  {editValues.newPassword && editValues.confirmPassword && editValues.newPassword !== editValues.confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="gradient" 
                      onClick={() => handlePasswordReset(editingUser)}
                      disabled={!editValues.newPassword || editValues.newPassword.length < 8 || editValues.newPassword !== editValues.confirmPassword}
                    >
                      Reset Password
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Name Edit */}
              {editingField === "name" && (
                <div className="space-y-4">
                  <Input
                    label="Name"
                    value={editValues.name || ""}
                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                    placeholder="Enter user name"
                  />
                  <div className="flex gap-2 pt-2">
                    <Button variant="gradient" onClick={() => handleSave(editingUser)}>
                      Update Name
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Email Edit */}
              {editingField === "email" && (
                <div className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    value={editValues.email || ""}
                    onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                  <div className="flex gap-2 pt-2">
                    <Button variant="gradient" onClick={() => handleSave(editingUser)}>
                      Update Email
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Users Table */}
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase hidden lg:table-cell">Joined</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedUsers.map((user) => {
                    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                    const isCurrentUser = user._id === currentUserId;

                    return (
                      <tr key={user._id} className={`hover:bg-slate-50 ${isCurrentUser ? "bg-blue-50/30" : ""}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                              {getInitials(user.name)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">
                                {user.name}
                                {isCurrentUser && <span className="ml-1 text-xs text-blue-600">(You)</span>}
                              </p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.onboardingCompleted ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {user.onboardingCompleted ? "Active" : "Pending"}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-sm text-slate-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {!isCurrentUser && (
                              <>
                                <button
                                  onClick={() => handleEdit(user, "role")}
                                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                                  title="Change role"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleEdit(user, "password")}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                  title="Reset password"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-sm text-slate-600">
              Showing {filteredAndSortedUsers.length} of {users?.length || 0} users
            </div>
          </Card>
        </>
      )}

      {/* Teams Tab */}
      {activeTab === "teams" && (
        <>
          {/* Create Team Button */}
          <div className="flex justify-end">
            <Button variant="gradient" onClick={() => setShowCreateTeam(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </Button>
          </div>

          {/* Create Team Modal */}
          {showCreateTeam && (
            <Card padding="lg" className="border-2 border-blue-200 bg-blue-50/30">
              <h3 className="font-semibold text-slate-900 mb-4">Create New Support Team</h3>
              <div className="space-y-4">
                <Input
                  label="Team Name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="e.g., Technical Support"
                />
                <Input
                  label="Description (optional)"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="Team description..."
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Team Color</label>
                  <div className="flex flex-wrap gap-2">
                    {TEAM_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewTeam({ ...newTeam, color: color.value })}
                        className={`w-8 h-8 rounded-full ${color.value} ${
                          newTeam.color === color.value ? "ring-2 ring-offset-2 ring-slate-900" : ""
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="gradient" onClick={handleCreateTeam}>Create Team</Button>
                  <Button variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Teams List */}
          {teams && teams.length > 0 ? (
            <div className="space-y-4">
              {teams.map((team) => (
                <Card key={team._id} padding="none" className="overflow-hidden">
                  {/* Team Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedTeam(expandedTeam === team._id ? null : team._id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${team.color} flex items-center justify-center text-white font-semibold`}>
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{team.name}</h3>
                        <p className="text-xs text-slate-500">
                          {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                          {team.leaderName && ` · Leader: ${team.leaderName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTeam(team._id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete team"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${expandedTeam === team._id ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Team Details */}
                  {expandedTeam === team._id && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50/50">
                      {team.description && (
                        <p className="text-sm text-slate-600 mb-4">{team.description}</p>
                      )}

                      {/* Team Members */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-700">Team Members</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAddMember(team._id)}
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Agent
                          </Button>
                        </div>

                        {team.members.length > 0 ? (
                          <div className="space-y-2">
                            {team.members.map((member: any) => (
                              <div
                                key={member._id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                                    {member.userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">
                                      {member.userName}
                                      {member.role === "leader" && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">Leader</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-slate-500">{member.userEmail}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveMember(team._id, member.userId)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Remove from team"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-4">No members in this team yet</p>
                        )}
                      </div>

                      {/* Add Member Modal */}
                      {showAddMember === team._id && availableAgents && (
                        <div className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-200">
                          <h4 className="text-sm font-medium text-slate-700 mb-3">Add Agent to Team</h4>
                          {availableAgents.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {availableAgents.map((agent) => (
                                <div
                                  key={agent._id}
                                  className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">
                                      {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">{agent.name}</p>
                                      <p className="text-xs text-slate-500">{agent.email}</p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="gradient"
                                    onClick={() => handleAddMember(team._id, agent._id)}
                                  >
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 text-center py-2">No available agents to add</p>
                          )}
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <Button size="sm" variant="outline" onClick={() => setShowAddMember(null)}>
                              Close
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card padding="lg">
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">👥</span>
                <p className="text-slate-600">No support teams yet</p>
                <p className="text-sm text-slate-400 mt-1">Create your first team to organize your agents</p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
