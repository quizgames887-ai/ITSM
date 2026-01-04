"use client";

import { useState, use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToastContext } from "@/contexts/ToastContext";
import Link from "next/link";
import { FormFieldEditor } from "@/components/forms/FormFieldEditor";
import { FormFieldPreview } from "@/components/forms/FormFieldPreview";
import { EmptyState } from "@/components/ui/EmptyState";

export default function FormDesignerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const formId = id as Id<"forms">;
  const form = useQuery(api.forms.get, { id: formId });
  const addField = useMutation(api.forms.addField);
  const updateField = useMutation(api.forms.updateField);
  const deleteField = useMutation(api.forms.deleteField);
  const updateForm = useMutation(api.forms.update);
  const reorderFields = useMutation(api.forms.reorderFields);
  const { success, error: showError } = useToastContext();

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  
  // Fetch current user directly to check admin status
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  // Check if current user is admin
  const isAdmin = currentUser?.role === "admin";

  const [editingField, setEditingField] = useState<Id<"formFields"> | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formEditData, setFormEditData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  // Wait for both queries to load before checking admin status
  if (form === undefined || (currentUserId && currentUser === undefined)) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded-xl"></div>
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

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-600 mb-4">Form not found</p>
            <Link href="/forms">
              <Button>Back to Forms</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const handleAddField = async (fieldData: any) => {
    try {
      await addField({
        formId,
        ...fieldData,
      });
      success("Field added successfully!");
      setShowAddField(false);
    } catch (err: any) {
      showError(err.message || "Failed to add field");
    }
  };

  const handleUpdateField = async (fieldId: Id<"formFields">, fieldData: any) => {
    try {
      await updateField({
        id: fieldId,
        ...fieldData,
      });
      success("Field updated successfully!");
      setEditingField(null);
    } catch (err: any) {
      showError(err.message || "Failed to update field");
    }
  };

  const handleDeleteField = async (fieldId: Id<"formFields">) => {
    if (!confirm("Are you sure you want to delete this field?")) return;

    try {
      await deleteField({ id: fieldId });
      success("Field deleted successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to delete field");
    }
  };

  const handleEditForm = () => {
    setFormEditData({
      name: form.name,
      description: form.description || "",
      isActive: form.isActive,
    });
    setShowEditForm(true);
  };

  const handleUpdateForm = async () => {
    if (!formEditData.name.trim()) {
      showError("Form name is required");
      return;
    }

    try {
      await updateForm({
        id: formId,
        name: formEditData.name.trim(),
        description: formEditData.description.trim() || undefined,
        isActive: formEditData.isActive,
      });
      success("Form updated successfully!");
      setShowEditForm(false);
    } catch (err: any) {
      showError(err.message || "Failed to update form");
    }
  };

  const handleMoveField = async (fieldId: Id<"formFields">, direction: "up" | "down") => {
    if (!form.fields) return;

    const currentIndex = form.fields.findIndex((f) => f._id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= form.fields.length) return;

    // Create new order array
    const fieldOrders = form.fields.map((field, index) => {
      if (index === currentIndex) {
        return { fieldId: field._id, order: form.fields[newIndex].order };
      } else if (index === newIndex) {
        return { fieldId: field._id, order: form.fields[currentIndex].order };
      }
      return { fieldId: field._id, order: field.order };
    });

    try {
      await reorderFields({
        formId,
        fieldOrders,
      });
      success("Field order updated successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to reorder fields");
    }
  };

  const isTicketForm = form.name.toLowerCase().includes("ticket");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Link href="/forms" className="block mb-4">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              <span className="hidden sm:inline">← Back to Forms</span>
              <span className="sm:hidden">← Back</span>
            </Button>
          </Link>
          
          {/* Administration Info Banner for Ticket Form */}
          {isTicketForm && (
            <Card padding="md" className="mb-4 bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">Ticket Form Administration</h3>
                  <p className="text-xs text-slate-600 mb-2">
                    As an administrator, you can manage the ticket form fields:
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li><strong>Add Fields:</strong> Click the "Add Field" button to create new form fields</li>
                    <li><strong>Remove Fields:</strong> Click "Delete" on any field card to remove it</li>
                    <li><strong>Change Priority:</strong> Use the up/down arrows to reorder fields (priority determines display order)</li>
                    <li><strong>Edit Fields:</strong> Click "Edit" on any field to modify its properties</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent break-words">
                  {form.name}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditForm}
                  className="flex-shrink-0"
                  title="Edit form details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Button>
              </div>
              {form.description && (
                <p className="text-sm sm:text-base text-slate-600 break-words">{form.description}</p>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowAddField(true)}
                className="w-full sm:w-auto"
              >
                <span className="mr-2">+</span>
                Add Field
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            {form.fields.length === 0 ? (
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  }
                  title="No fields yet"
                  description="Start building your form by adding fields. You can add text inputs, dropdowns, checkboxes, and more."
                  action={{
                    label: "Add First Field",
                    onClick: () => setShowAddField(true),
                  }}
                />
              </Card>
            ) : (
              form.fields.map((field, index) => (
                <Card
                  key={field._id}
                  hover
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                          {field.fieldType}
                        </span>
                        {field.required && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                            Required
                          </span>
                        )}
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                          Priority: {field.order + 1}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {field.label}
                      </h3>
                      {field.helpText && (
                        <p className="text-sm text-slate-600 mb-3">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {/* Priority/Order controls */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMoveField(field._id, "up")}
                          disabled={index === 0}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveField(field._id, "down")}
                          disabled={index === form.fields.length - 1}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingField(field._id)}
                        className="flex-1 sm:flex-none"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteField(field._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <FormFieldPreview field={field} />
                </Card>
              ))
            )}
          </div>

          <div className="lg:col-span-1">
            <Card hover>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Form Info
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Fields</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {form.fields.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      form.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Last Updated</p>
                  <p className="text-slate-900">
                    {new Date(form.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {showAddField && (
          <FormFieldEditor
            onSave={handleAddField}
            onCancel={() => setShowAddField(false)}
            maxOrder={form.fields.length}
          />
        )}

        {editingField && (
          <FormFieldEditor
            field={form.fields.find((f) => f._id === editingField)}
            onSave={(data) => handleUpdateField(editingField, data)}
            onCancel={() => setEditingField(null)}
            maxOrder={form.fields.length - 1}
          />
        )}

        {/* Edit Form Modal */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 -m-4 sm:-m-6 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Edit Form</h2>
              </div>

              <div className="space-y-4">
                <Input
                  label="Form Name"
                  value={formEditData.name}
                  onChange={(e) => setFormEditData({ ...formEditData, name: e.target.value })}
                  required
                  placeholder="Form name"
                />

                <Textarea
                  label="Description"
                  value={formEditData.description}
                  onChange={(e) => setFormEditData({ ...formEditData, description: e.target.value })}
                  placeholder="Form description (optional)"
                  rows={3}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formEditData.isActive}
                    onChange={(e) => setFormEditData({ ...formEditData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                    Active (form is available for use)
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-200">
                  <Button
                    variant="gradient"
                    onClick={handleUpdateForm}
                    className="flex-1 sm:flex-none"
                  >
                    Update Form
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditForm(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
