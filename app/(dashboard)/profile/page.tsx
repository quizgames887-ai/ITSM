"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { ProfileSkeleton } from "@/components/ui/LoadingSkeleton";
import { PasswordStrength } from "@/components/ui/PasswordStrength";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminName, setOriginalAdminName] = useState<string | null>(null);
  
  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const impersonating = localStorage.getItem("isImpersonating") === "true";
    const adminName = localStorage.getItem("originalAdminName");
    
    if (storedUserId) {
      setUserId(storedUserId);
    }
    
    setIsImpersonating(impersonating);
    setOriginalAdminName(adminName);
  }, []);

  const user = useQuery(
    api.users.get,
    userId ? { id: userId as Id<"users"> } : "skip"
  );

  const updateUser = useMutation(api.users.update);
  const resetOwnPassword = useMutation(api.users.resetOwnPassword);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      // Store role in localStorage for navigation
      localStorage.setItem("userRole", user.role);
    }
  }, [user]);

  const handleSave = async () => {
    if (!userId) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await updateUser({
        id: userId as Id<"users">,
        name: name.trim(),
        email: email.trim(),
      });

      // Update localStorage
      localStorage.setItem("userName", name.trim());
      localStorage.setItem("userEmail", email.trim());

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    setError("");
    setSuccess("");
    setIsEditing(false);
  };

  const handleExitImpersonation = () => {
    const originalAdminId = localStorage.getItem("originalAdminId");
    const originalAdminName = localStorage.getItem("originalAdminName");
    const originalAdminEmail = localStorage.getItem("originalAdminEmail");

    if (originalAdminId && originalAdminName && originalAdminEmail) {
      // Restore original admin session
      localStorage.setItem("userId", originalAdminId);
      localStorage.setItem("userName", originalAdminName);
      localStorage.setItem("userEmail", originalAdminEmail);
      
      // Clear impersonation data
      localStorage.removeItem("isImpersonating");
      localStorage.removeItem("originalAdminId");
      localStorage.removeItem("originalAdminName");
      localStorage.removeItem("originalAdminEmail");

      // Navigate back to users page
      router.push("/users");
    }
  };

  const handlePasswordReset = async () => {
    if (!userId) return;

    setPasswordError("");
    setPasswordSuccess("");

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setPasswordLoading(true);

    try {
      await resetOwnPassword({
        userId: userId as Id<"users">,
        currentPassword,
        newPassword,
      });

      setPasswordSuccess("Password reset successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordReset(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccess("");
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to reset password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelPasswordReset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
    setShowPasswordReset(false);
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <p className="text-center text-slate-600 mb-4">
            Please log in to view your profile
          </p>
          <Link href="/login" className="block text-center">
            <Button>Go to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (user === undefined) {
    return <ProfileSkeleton />;
  }

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <p className="text-center text-slate-600 mb-4">User not found</p>
          <Link href="/login" className="block text-center">
            <Button>Go to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50" padding="md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg
                    className="w-5 h-5 text-amber-600"
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
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 mb-1">
                    Viewing as {user?.name}
                  </h3>
                  <p className="text-xs text-amber-700">
                    You are viewing this profile as an administrator. Changes are disabled in impersonation mode.
                    {originalAdminName && ` Logged in as: ${originalAdminName}`}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitImpersonation}
                className="border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400 whitespace-nowrap"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Exit Impersonation
              </Button>
            </div>
          </Card>
        )}

        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {isImpersonating ? `Profile - ${user?.name}` : "Profile"}
            </h1>
            <div className="flex gap-2 w-full sm:w-auto">
              {isImpersonating ? (
                <Button
                  variant="outline"
                  onClick={handleExitImpersonation}
                  className="w-full sm:w-auto"
                >
                  Exit Impersonation
                </Button>
              ) : (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <span className="hidden sm:inline">← Back to Dashboard</span>
                    <span className="sm:hidden">← Back</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <p className="text-sm sm:text-base text-slate-600">
            {isImpersonating ? "Viewing user profile (read-only)" : "Manage your account information"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2" hover padding="lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
                Personal Information
              </h2>
              {!isEditing && !isImpersonating && (
                <Button
                  variant="gradient"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto"
                >
                  <span className="hidden sm:inline">✏️ Edit Profile</span>
                  <span className="sm:hidden">✏️ Edit</span>
                </Button>
              )}
              {isImpersonating && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
                  Read-only mode
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg animate-slide-in">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg animate-slide-in">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-green-600 font-medium">{success}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 pb-6 border-b border-slate-200">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex-shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                    {user.name}
                    {isImpersonating && (
                      <span className="ml-2 text-xs text-amber-600 font-normal">
                        (Viewing)
                      </span>
                    )}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 break-words">{user.email}</p>
                  <span className="inline-block mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200 capitalize">
                    {user.role}
                  </span>
                </div>
              </div>

              <div>
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Role
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-4 py-2.5 rounded-lg border font-medium capitalize ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-700 border-purple-200"
                        : user.role === "agent"
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {user.role}
                  </span>
                  {user.role === "admin" && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
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
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      Full Access
                    </span>
                  )}
                </div>
                {user.role !== "admin" && (
                  <p className="text-xs text-slate-500 mt-2">
                    Contact an administrator to change your role
                  </p>
                )}
              </div>

              {isEditing && !isImpersonating && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <Button
                    variant="gradient"
                    onClick={handleSave}
                    disabled={loading}
                    loading={loading}
                  >
                    {loading ? "Saving..." : "💾 Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card hover padding="lg" className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-indigo-600"
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
                Password Reset
              </h2>
              {!showPasswordReset && !isImpersonating && (
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full sm:w-auto"
                >
                  Change Password
                </Button>
              )}
              {isImpersonating && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-sm font-medium">
                  Not available in impersonation mode
                </div>
              )}
            </div>

            {showPasswordReset && (
              <div className="space-y-4">
                {passwordError && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg animate-slide-in">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-red-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-red-600 font-medium">{passwordError}</p>
                    </div>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-lg animate-slide-in">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-green-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-green-600 font-medium">{passwordSuccess}</p>
                    </div>
                  </div>
                )}

                <div>
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                  />
                  <PasswordStrength password={newPassword} />
                </div>

                <div>
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-1.5 text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="gradient"
                    onClick={handlePasswordReset}
                    disabled={passwordLoading}
                    loading={passwordLoading}
                    className="flex-1"
                  >
                    {passwordLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelPasswordReset}
                    disabled={passwordLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!showPasswordReset && (
              <p className="text-sm text-slate-600">
                Keep your account secure by regularly updating your password.
              </p>
            )}
          </Card>

          <Card hover padding="lg">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Account Details
            </h2>
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                  Account Created
                </p>
                <p className="text-slate-900 font-semibold">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                  Last Updated
                </p>
                <p className="text-slate-900 font-semibold">
                  {new Date(user.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                  Onboarding Status
                </p>
                <p className="text-slate-900 font-semibold">
                  {user.onboardingCompleted ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-yellow-600">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Pending
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
