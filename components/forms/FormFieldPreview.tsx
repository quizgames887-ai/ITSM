"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
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
  helpText: string | null;
}

interface FormFieldPreviewProps {
  field: FormField;
}

export function FormFieldPreview({ field }: FormFieldPreviewProps) {
  const renderField = () => {
    const commonProps = {
      label: field.label,
      placeholder: field.placeholder || undefined,
      required: field.required,
      defaultValue: field.defaultValue || undefined,
    };

    switch (field.fieldType) {
      case "text":
      case "email":
      case "date":
        return (
          <Input
            {...commonProps}
            type={field.fieldType}
            disabled
            className="bg-slate-50"
          />
        );

      case "number":
        return (
          <Input
            {...commonProps}
            type="number"
            disabled
            className="bg-slate-50"
          />
        );

      case "textarea":
        return (
          <Textarea
            {...commonProps}
            disabled
            className="bg-slate-50"
            rows={4}
          />
        );

      case "select":
        return (
          <Select
            {...commonProps}
            options={
              field.options?.map((opt) => ({ value: opt, label: opt })) || [
                { value: "", label: "Select an option" },
              ]
            }
            disabled
            className="bg-slate-50"
          />
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.name}
              disabled
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 bg-slate-50"
            />
            <label
              htmlFor={field.name}
              className="text-sm font-medium text-slate-700"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((opt, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`${field.name}_${index}`}
                  name={field.name}
                  disabled
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 bg-slate-50"
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
        );

      case "file":
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="file"
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {renderField()}
      {field.helpText && (
        <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>
      )}
    </div>
  );
}
