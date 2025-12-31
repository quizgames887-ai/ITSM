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

export default function UsersPage() {
  const users = useQuery(api.users.list, {});
  const updateUser = useMutation(api.users.update);
  const { success, error: showError } = useToastContext();
  const [editingRole, setEditingRole] = useState<Id<"users"> | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = users?.find((u) => u._id === currentUserId);

  // Check if current user is admin
  const isAdmin = currentUser?.role === "admin";

  const handleRoleChange = async (userId: Id<"users">, newRole: string) => {
    if (!isAdmin) {
      showError("Only admins can change user roles");
      return;
    }

    try {
      await updateUser({
        id: userId,
        role: newRole as "user" | "admin" | "agent",
      });
      success("User role updated successfully!");
      setEditingRole(null);
    } catch (err: any) {
      showError(err.message || "Failed to update role");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "agent":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  if (users === undefined) {
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

  if (!isAdmin) {
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              User Management
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Manage user roles and permissions
            </p>
          </div>
        </div>

        <Card hover padding="lg" className="mb-6">
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
        </Card>

        <div className="space-y-4">
          {filteredUsers && filteredUsers.length === 0 ? (
            <Card hover padding="lg">
              <div className="text-center py-12">
                <p className="text-slate-600">No users found</p>
              </div>
            </Card>
          ) : (
            filteredUsers?.map((user, index) => {
              const getInitials = (name: string) => {
                return name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
              };

              const isCurrentUser = user._id === currentUserId;
              const isEditing = editingRole === user._id;

              return (
                <Card
                  key={user._id}
                  hover
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all hover:scale-110 flex-shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">
                            {user.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs sm:text-sm text-indigo-600 font-normal">
                                (You)
                              </span>
                            )}
                          </h3>
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                              user.role
                            )} self-start`}
                          >
                            {user.role.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 break-words">{user.email}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          <Select
                            value={newRole || user.role}
                            onChange={(e) => setNewRole(e.target.value)}
                            options={[
                              { value: "user", label: "User" },
                              { value: "agent", label: "Agent" },
                              { value: "admin", label: "Admin" },
                            ]}
                            className="w-full sm:w-32"
                          />
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => handleRoleChange(user._id, newRole || user.role)}
                            className="flex-1 sm:flex-none"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRole(null);
                              setNewRole("");
                            }}
                            className="flex-1 sm:flex-none"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRole(user._id);
                              setNewRole(user.role);
                            }}
                            disabled={isCurrentUser}
                            className="w-full sm:w-auto"
                          >
                            Change Role
                          </Button>
                          <Link href={`/profile?userId=${user._id}`} className="w-full sm:w-auto">
                            <Button size="sm" variant="ghost" className="w-full sm:w-auto">
                              View Profile
                            </Button>
                          </Link>
                        </>
                      )}
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
