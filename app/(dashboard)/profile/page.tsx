"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { ProfileSkeleton } from "@/components/ui/LoadingSkeleton";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { useTranslation } from "@/contexts/TranslationContext";

function ProfilePageContent() {
  const router = useRouter();
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
  const [language, setLanguage] = useState<"en" | "ar">("en");

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

  const { t } = useTranslation();
  
  const user = useQuery(
    api.users.get,
    userId ? { id: userId as Id<"users"> } : "skip"
  );

  const updateUser = useMutation(api.users.update);
  const resetOwnPassword = useMutation(api.users.resetOwnPassword);
  const generateUploadUrl = useMutation(api.users.generateProfilePictureUploadUrl);
  const updateProfilePicture = useMutation(api.users.updateProfilePicture);
  const removeProfilePicture = useMutation(api.users.removeProfilePicture);
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Get profile picture URL
  const profilePictureUrl = useQuery(
    api.users.getProfilePictureUrl,
    user?.profilePictureId ? { storageId: user.profilePictureId } : "skip"
  );

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      // Set language preference
      const userLanguage = (user.language as "en" | "ar" | null) || "en";
      setLanguage(userLanguage);
      // Store role and language in localStorage for navigation
      localStorage.setItem("userRole", user.role);
      localStorage.setItem("userLanguage", userLanguage);
      // Apply language direction
      document.documentElement.setAttribute("dir", userLanguage === "ar" ? "rtl" : "ltr");
      document.documentElement.setAttribute("lang", userLanguage);
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
        currentUserId: userId as Id<"users">,
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

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file to Convex storage
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload image");
      }

      // Get storage ID from the response
      let storageIdText = await uploadResult.text();
      
      // Handle case where response might be a JSON string
      let storageId: Id<"_storage">;
      try {
        const parsed = JSON.parse(storageIdText);
        if (typeof parsed === "object" && parsed.storageId) {
          storageId = parsed.storageId as Id<"_storage">;
        } else if (typeof parsed === "string") {
          storageId = parsed as Id<"_storage">;
        } else {
          storageId = storageIdText as Id<"_storage">;
        }
      } catch {
        // If not JSON, treat as direct storage ID
        storageId = storageIdText as Id<"_storage">;
      }
      
      if (!storageId) {
        throw new Error("Failed to get storage ID from upload");
      }

      // Update user profile with new picture
      await updateProfilePicture({
        userId: userId as Id<"users">,
        currentUserId: userId as Id<"users">,
        storageId: storageId,
      });

      setSuccess("Profile picture updated successfully!");
      
      // Clear the file input
      event.target.value = "";
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to upload profile picture");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!userId) return;

    if (!confirm("Are you sure you want to remove your profile picture?")) {
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      await removeProfilePicture({
        userId: userId as Id<"users">,
        currentUserId: userId as Id<"users">,
      });

      setSuccess("Profile picture removed successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to remove profile picture");
    } finally {
      setUploadingPhoto(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-6 px-4 sm:py-8 sm:px-6 lg:py-12 lg:px-8">
      <div className="max-w-6xl mx-auto animate-fade-in">
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

        <div className="mb-8 sm:mb-10 lg:mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-3">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                {isImpersonating ? `Profile - ${user?.name}` : "Profile"}
              </h1>
              <p className="text-base sm:text-lg text-slate-600">
                {isImpersonating ? "Viewing user profile (read-only)" : "Manage your account information"}
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {/* Personal Information - Main Section */}
          <Card className="lg:col-span-2" hover padding="lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                  {t("profile.personalInformation", "Personal Information")}
                </h2>
                <p className="text-sm sm:text-base text-slate-500">{t("profile.updateDetails", "Update your profile details")}</p>
              </div>
              {!isEditing && !isImpersonating && (
                <Button
                  variant="gradient"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t("profile.editProfile", "Edit Profile")}
                </Button>
              )}
              {isImpersonating && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
                  Read-only mode
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 sm:p-5 bg-red-50 border-l-4 border-red-400 rounded-xl animate-slide-in">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-400 mr-3"
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
                  <p className="text-sm sm:text-base text-red-600 font-medium">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 sm:p-5 bg-green-50 border-l-4 border-green-400 rounded-xl animate-slide-in">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-400 mr-3"
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
                  <p className="text-sm sm:text-base text-green-600 font-medium">{success}</p>
                </div>
              </div>
            )}

            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 pb-8 border-b border-slate-200">
                <div className="relative group flex-shrink-0">
                  {profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt={user.name}
                      className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full object-cover shadow-xl hover:shadow-2xl transition-all hover:scale-105 ring-4 ring-white"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement("div");
                          fallback.className = "w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl sm:text-4xl lg:text-5xl font-bold shadow-xl ring-4 ring-white";
                          fallback.textContent = getInitials(user.name);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl sm:text-4xl lg:text-5xl font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 ring-4 ring-white">
                      {getInitials(user.name)}
                    </div>
                  )}
                  {!isImpersonating && (
                    <div className="absolute bottom-0 right-0 flex gap-2">
                      <label
                        className="p-2.5 sm:p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors border-3 border-white cursor-pointer"
                        title="Change profile picture"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          disabled={uploadingPhoto}
                          className="hidden"
                        />
                        {uploadingPhoto ? (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </label>
                      {user.profilePictureId && (
                        <button
                          onClick={handleRemoveProfilePicture}
                          disabled={uploadingPhoto}
                          className="p-2.5 sm:p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors border-3 border-white"
                          title="Remove profile picture"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                    {user.name}
                    {isImpersonating && (
                      <span className="ml-2 text-sm text-amber-600 font-normal">
                        (Viewing)
                      </span>
                    )}
                  </h3>
                  <p className="text-base sm:text-lg text-slate-600 break-words mb-4">{user.email}</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border capitalize ${
                      user.role === "admin"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : user.role === "agent"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}>
                      {user.role === "admin" && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      )}
                      {user.role}
                    </span>
                    {user.role === "admin" && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Full Access
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-2">
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

                {/* Role Information */}
                <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    {t("profile.role", "Role")}
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-4 py-2 rounded-lg border font-medium capitalize text-sm ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700 border-purple-200"
                          : user.role === "agent"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  {user.role !== "admin" && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-2">
                      Contact an administrator to change your role
                    </p>
                  )}
                </div>
              </div>

              {isEditing && !isImpersonating && (
                <div className="flex gap-3 pt-6 border-t border-slate-200">
                  <Button
                    variant="gradient"
                    onClick={handleSave}
                    disabled={loading}
                    loading={loading}
                    className="px-6"
                  >
                    {loading ? t("common.saving", "Saving...") : `💾 ${t("common.save", "Save")}`}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="px-6">
                    {t("common.cancel", "Cancel")}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Password Reset Section */}
          <Card hover padding="lg" className="border-2 border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <svg
                    className="w-6 h-6 text-indigo-600"
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
                {!showPasswordReset && (
                  <p className="text-sm sm:text-base text-slate-500">
                    Keep your account secure
                  </p>
                )}
              </div>
              {!showPasswordReset && !isImpersonating && (
                <Button
                  variant="gradient"
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Change Password
                </Button>
              )}
              {isImpersonating && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-sm font-medium">
                  Not available
                </div>
              )}
            </div>

            {showPasswordReset && (
              <div className="space-y-5 sm:space-y-6">
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

          </Card>

          {/* Account Details Section */}
          <Card hover padding="lg">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 pb-6 border-b border-slate-200 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-indigo-600"
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
              {t("profile.accountDetails", "Account Details")}
            </h2>
            <div className="space-y-5">
              <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 mb-3">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                    {t("profile.accountCreated", "Account Created")}
                  </p>
                </div>
                <p className="text-slate-900 font-bold text-base">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 mb-3">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                    Last Updated
                  </p>
                </div>
                <p className="text-slate-900 font-bold text-base">
                  {new Date(user.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 mb-3">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                    {t("profile.onboardingStatus", "Onboarding Status")}
                  </p>
                </div>
                <p className="text-slate-900 font-bold text-base">
                  {user.onboardingCompleted ? (
                    <span className="inline-flex items-center gap-2 text-green-600">
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {t("profile.completed", "Completed")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-yellow-600">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {t("profile.pending", "Pending")}
                    </span>
                  )}
                </p>
              </div>

              {/* Language Selection */}
              <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 mb-3">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                    {t("profile.languagePreference", "Language Preference")}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLanguage = e.target.value as "en" | "ar";
                      setLanguage(newLanguage);
                      // Apply immediately
                      localStorage.setItem("userLanguage", newLanguage);
                      document.documentElement.setAttribute("dir", newLanguage === "ar" ? "rtl" : "ltr");
                      document.documentElement.setAttribute("lang", newLanguage);
                      // Trigger language change event
                      window.dispatchEvent(new Event("languageChanged"));
                      // Save to database
                      if (userId) {
                        updateUser({
                          id: userId as Id<"users">,
                          currentUserId: userId as Id<"users">,
                          language: newLanguage,
                        }).catch((err) => {
                          console.error("Failed to update language:", err);
                        });
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-white text-sm font-medium"
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية (Arabic)</option>
                  </select>
                  <p className="text-xs text-slate-500">
                    {language === "ar" 
                      ? t("profile.rightToLeft", "The interface will be displayed from right to left")
                      : t("profile.leftToRight", "The interface will be displayed from left to right")}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfilePageContent />
    </Suspense>
  );
}
