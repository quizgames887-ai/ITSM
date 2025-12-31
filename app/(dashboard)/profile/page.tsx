"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading profile...</p>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-slate-900">Profile</h1>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
          <p className="text-slate-600">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">
                Personal Information
              </h2>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div className="space-y-6">
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
                <div className="px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-600 capitalize">
                  {user.role}
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Account Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Account Created</p>
                <p className="text-slate-900 font-medium">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Last Updated</p>
                <p className="text-slate-900 font-medium">
                  {new Date(user.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Onboarding Status</p>
                <p className="text-slate-900 font-medium">
                  {user.onboardingCompleted ? (
                    <span className="text-green-600">Completed</span>
                  ) : (
                    <span className="text-yellow-600">Pending</span>
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
