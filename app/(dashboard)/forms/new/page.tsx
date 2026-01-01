"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToastContext } from "@/contexts/ToastContext";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function NewFormPage() {
  const router = useRouter();
  const { success, error: showError } = useToastContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  
  // Fetch current user directly to check admin status
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  // Check if current user is admin
  const isAdmin = currentUser?.role === "admin";

  const createForm = useMutation(api.forms.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError("Form name is required");
      return;
    }

    setLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("Not authenticated");
      }

      const formId = await createForm({
        name: name.trim(),
        description: description.trim() || undefined,
        createdBy: userId as any,
      });

      success("Form created successfully! 🎉");
      setTimeout(() => {
        router.push(`/forms/${formId}/design`);
      }, 500);
    } catch (err: any) {
      showError(err.message || "Failed to create form");
    } finally {
      setLoading(false);
    }
  };

  // Wait for user query to load before checking admin status
  if (currentUserId && currentUser === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
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
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Link href="/forms" className="block mb-4">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              <span className="hidden sm:inline">← Back to Forms</span>
              <span className="sm:hidden">← Back</span>
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
            Create New Form
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Start by giving your form a name and description
          </p>
        </div>

        <Card hover padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Form Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Contact Form, Survey Form"
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            />

            <Textarea
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this form is for..."
              rows={4}
            />

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-200">
              <Button
                type="submit"
                variant="gradient"
                disabled={loading}
                loading={loading}
                className="flex-1 sm:flex-none order-2 sm:order-1"
              >
                {loading ? "Creating..." : "Create Form"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none order-1 sm:order-2"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
