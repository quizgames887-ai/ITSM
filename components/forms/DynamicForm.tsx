"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";

interface FormField {
  _id: Id<"formFields">;
  fieldType: string;
  label: string;
  name: string;
  placeholder: string | null;
  required: boolean;
  defaultValue: string | null;
  options: string[] | null;
  validation: {
    min: number | null;
    max: number | null;
    pattern: string | null;
    minLength: number | null;
    maxLength: number | null;
  } | null;
  helpText: string | null;
}

interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
  submitLabel?: string;
  loading?: boolean;
}

export function DynamicForm({
  fields,
  onSubmit,
  submitLabel = "Submit",
  loading = false,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((field) => {
      if (field.defaultValue) {
        initial[field.name] = field.defaultValue;
      } else if (field.fieldType === "checkbox") {
        initial[field.name] = false;
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value === "")) {
      return `${field.label} is required`;
    }

    if (!value || value === "") return null;

    if (field.validation) {
      const { min, max, minLength, maxLength, pattern } = field.validation;

      if (minLength && value.length < minLength) {
        return `${field.label} must be at least ${minLength} characters`;
      }

      if (maxLength && value.length > maxLength) {
        return `${field.label} must be at most ${maxLength} characters`;
      }

      if (field.fieldType === "number") {
        const numValue = parseFloat(value);
        if (min !== null && numValue < min) {
          return `${field.label} must be at least ${min}`;
        }
        if (max !== null && numValue > max) {
          return `${field.label} must be at most ${max}`;
        }
      }

      if (pattern) {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return `${field.label} format is invalid`;
        }
      }
    }

    if (field.fieldType === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Please enter a valid email address";
      }
    }

    return null;
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || "";
    const error = errors[field.name];

    switch (field.fieldType) {
      case "text":
      case "email":
      case "date":
        return (
          <Input
            key={field._id}
            label={field.label}
            type={field.fieldType}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder || undefined}
            required={field.required}
            error={error}
          />
        );

      case "number":
        return (
          <Input
            key={field._id}
            label={field.label}
            type="number"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder || undefined}
            required={field.required}
            error={error}
          />
        );

      case "textarea":
        return (
          <Textarea
            key={field._id}
            label={field.label}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder || undefined}
            required={field.required}
            error={error}
            rows={4}
          />
        );

      case "select":
        return (
          <Select
            key={field._id}
            label={field.label}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            options={
              field.options?.map((opt) => ({ value: opt, label: opt })) || []
            }
            required={field.required}
            error={error}
          />
        );

      case "checkbox":
        return (
          <div key={field._id} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.name}
              checked={formData[field.name] || false}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label
              htmlFor={field.name}
              className="text-sm font-medium text-slate-700"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
        );

      case "radio":
        return (
          <div key={field._id}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`${field.name}_${index}`}
                    name={field.name}
                    value={opt}
                    checked={value === opt}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`${field.name}_${index}`}
                    className="text-sm font-medium text-slate-700"
                  >
                    {opt}
                  </label>
                </div>
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
            {field.helpText && (
              <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>
            )}
          </div>
        );

      case "file":
        return (
          <div key={field._id}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleChange(field.name, file);
                }
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 transition-all duration-200"
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
            {field.helpText && (
              <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fields.map((field) => (
        <div key={field._id}>
          {renderField(field)}
          {field.helpText && field.fieldType !== "radio" && field.fieldType !== "file" && (
            <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>
          )}
        </div>
      ))}
      <Button type="submit" variant="gradient" disabled={loading} loading={loading} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
