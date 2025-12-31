"use client";

import { useState, use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const { success, error: showError } = useToastContext();

  const [editingField, setEditingField] = useState<Id<"formFields"> | null>(null);
  const [showAddField, setShowAddField] = useState(false);

  if (form === undefined) {
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
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2 break-words">
                {form.name}
              </h1>
              {form.description && (
                <p className="text-sm sm:text-base text-slate-600 break-words">{form.description}</p>
              )}
            </div>
            <Button
              variant="gradient"
              onClick={() => setShowAddField(true)}
              className="w-full sm:w-auto"
            >
              <span className="mr-2">+</span>
              Add Field
            </Button>
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
          />
        )}

        {editingField && (
          <FormFieldEditor
            field={form.fields.find((f) => f._id === editingField)}
            onSave={(data) => handleUpdateField(editingField, data)}
            onCancel={() => setEditingField(null)}
          />
        )}
      </div>
    </div>
  );
}
