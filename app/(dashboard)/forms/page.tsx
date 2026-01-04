"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/ui/EmptyState";

export default function FormsPage() {
  const router = useRouter();
  const forms = useQuery(api.forms.list, {});
  const deleteForm = useMutation(api.forms.deleteForm);
  const { success, error: showError } = useToastContext();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  
  // Fetch current user directly to check admin status
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  // Check if current user is admin
  const isAdmin = currentUser?.role === "admin";

  const handleDelete = async (id: Id<"forms">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this form?")) return;

    setDeletingId(id);
    try {
      await deleteForm({ id });
      success("Form deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete form");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (id: Id<"forms">, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/forms/${id}/design`);
  };

  // Find ticket form (case-insensitive match)
  const ticketForm = forms?.find(
    (form) => form.name.toLowerCase().includes("ticket")
  );

  // Wait for both queries to load before checking admin status
  if (forms === undefined || (currentUserId && currentUser === undefined)) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
            ))}
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
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              Forms
            </h1>
            <p className="text-sm sm:text-base text-slate-600">Manage and design your custom forms</p>
          </div>
          <Link href="/forms/new" className="w-full sm:w-auto">
            <Button variant="gradient" size="lg" className="w-full sm:w-auto">
              <span className="mr-2">+</span>
              <span className="hidden sm:inline">Create New Form</span>
              <span className="sm:hidden">New Form</span>
            </Button>
          </Link>
        </div>

        {forms.length === 0 ? (
          <Card hover padding="lg">
            <EmptyState
              icon={
                <svg
                  className="w-12 h-12 text-slate-400"
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
              title="No forms yet"
              description="Create custom forms to collect data, gather feedback, or build surveys. Design forms with drag-and-drop fields."
              action={{
                label: "Create your first form",
                href: "/forms/new",
              }}
            />
          </Card>
        ) : (
          <>
            {/* Quick access to Ticket Form - Administration Section */}
            {ticketForm && (
              <Card
                padding="lg"
                className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-blue-600"
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
                        <h3 className="text-lg font-semibold text-slate-900">
                          Ticket Form Administration
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Active Form
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {ticketForm.description || "Manage ticket creation fields and settings"}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Fields
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Remove Fields
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          Change Priority
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Fields
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="gradient"
                      onClick={() => router.push(`/forms/${ticketForm._id}/design`)}
                      className="w-full sm:w-auto"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
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
                      Manage Ticket Form
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {forms.map((form, index) => {
                const isTicketForm = form.name.toLowerCase().includes("ticket");
                return (
                  <Card
                    key={form._id}
                    hover
                    padding="lg"
                    className={`animate-fade-in cursor-pointer ${
                      isTicketForm ? "ring-2 ring-blue-300" : ""
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => router.push(`/forms/${form._id}/design`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-slate-900">
                            {form.name}
                          </h3>
                          {isTicketForm && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Ticket
                            </span>
                          )}
                        </div>
                        {form.description && (
                          <p className="text-sm text-slate-600 mb-3">
                            {form.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleEdit(form._id, e)}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Edit form"
                        >
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(form._id, e)}
                          disabled={deletingId === form._id}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Delete form"
                        >
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          form.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {form.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="text-slate-500">
                        {new Date(form.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
