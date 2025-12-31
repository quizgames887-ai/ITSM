"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { ProfileSkeleton } from "@/components/ui/LoadingSkeleton";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const user = useQuery(
    api.users.get,
    userId ? { id: userId as Id<"users"> } : "skip"
  );

  const updateUser = useMutation(api.users.update);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Profile
            </h1>
            <Link href="/dashboard">
              <Button variant="outline">← Back to Dashboard</Button>
            </Link>
          </div>
          <p className="text-slate-600">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" hover>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">
                Personal Information
              </h2>
              {!isEditing && (
                <Button
                  variant="gradient"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Edit Profile
                </Button>
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
              <div className="flex items-center gap-6 mb-6 pb-6 border-b border-slate-200">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {getInitials(user.name)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {user.name}
                  </h3>
                  <p className="text-slate-600">{user.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
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
                <div className="px-4 py-2.5 rounded-lg border border-slate-300 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 capitalize font-medium">
                  {user.role}
                </div>
              </div>

              {isEditing && (
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

          <Card hover>
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
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
