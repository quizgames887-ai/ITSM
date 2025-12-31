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

  if (forms === undefined) {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {forms.map((form, index) => (
              <Card
                key={form._id}
                hover
                padding="md sm:lg"
                className="animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => router.push(`/forms/${form._id}/design`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {form.name}
                    </h3>
                    {form.description && (
                      <p className="text-sm text-slate-600 mb-3">
                        {form.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(form._id, e)}
                    disabled={deletingId === form._id}
                    className="ml-2 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
