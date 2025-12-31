"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

type FieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "date"
  | "file";

interface FormField {
  _id: Id<"formFields">;
  fieldType: FieldType;
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

interface FormFieldEditorProps {
  field?: FormField;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export function FormFieldEditor({
  field,
  onSave,
  onCancel,
}: FormFieldEditorProps) {
  const [fieldType, setFieldType] = useState<FieldType>(
    field?.fieldType || "text"
  );
  const [label, setLabel] = useState(field?.label || "");
  const [name, setName] = useState(field?.name || "");
  const [placeholder, setPlaceholder] = useState(field?.placeholder || "");
  const [required, setRequired] = useState(field?.required || false);
  const [defaultValue, setDefaultValue] = useState(field?.defaultValue || "");
  const [options, setOptions] = useState(
    field?.options?.join("\n") || ""
  );
  const [helpText, setHelpText] = useState(field?.helpText || "");
  const [min, setMin] = useState(
    field?.validation?.min?.toString() || ""
  );
  const [max, setMax] = useState(
    field?.validation?.max?.toString() || ""
  );
  const [minLength, setMinLength] = useState(
    field?.validation?.minLength?.toString() || ""
  );
  const [maxLength, setMaxLength] = useState(
    field?.validation?.maxLength?.toString() || ""
  );
  const [pattern, setPattern] = useState(
    field?.validation?.pattern || ""
  );

  useEffect(() => {
    if (!name && label) {
      setName(
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
      );
    }
  }, [label, name]);

  const needsOptions = fieldType === "select" || fieldType === "radio";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim() || !name.trim()) {
      return;
    }

    const fieldData: any = {
      fieldType,
      label: label.trim(),
      name: name.trim(),
      placeholder: placeholder.trim() || undefined,
      required,
      defaultValue: defaultValue.trim() || undefined,
      helpText: helpText.trim() || undefined,
    };

    if (needsOptions) {
      const optionsArray = options
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      if (optionsArray.length > 0) {
        fieldData.options = optionsArray;
      }
    }

    const validation: any = {};
    if (min) validation.min = parseFloat(min);
    if (max) validation.max = parseFloat(max);
    if (minLength) validation.minLength = parseInt(minLength);
    if (maxLength) validation.maxLength = parseInt(maxLength);
    if (pattern) validation.pattern = pattern;

    if (Object.keys(validation).length > 0) {
      fieldData.validation = {
        min: validation.min || null,
        max: validation.max || null,
        minLength: validation.minLength || null,
        maxLength: validation.maxLength || null,
        pattern: validation.pattern || null,
      };
    }

    onSave(fieldData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto my-4 animate-scale-in shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 -m-4 sm:-m-6 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {field ? "Edit Field" : "Add New Field"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Field Type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
            options={[
              { value: "text", label: "Text" },
              { value: "email", label: "Email" },
              { value: "number", label: "Number" },
              { value: "textarea", label: "Textarea" },
              { value: "select", label: "Select" },
              { value: "checkbox", label: "Checkbox" },
              { value: "radio", label: "Radio" },
              { value: "date", label: "Date" },
              { value: "file", label: "File" },
            ]}
            required
          />

          <Input
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            placeholder="Field label"
          />

          <Input
            label="Field Name (ID)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="field_name"
          />

          <Input
            label="Placeholder"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            placeholder="Enter placeholder text"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="required" className="text-sm font-medium text-slate-700">
              Required field
            </label>
          </div>

          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Options (one per line)
              </label>
              <textarea
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-serif text-slate-900 placeholder:text-slate-400 transition-all duration-200 resize-y min-h-[100px]"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
              />
            </div>
          )}

          <Input
            label="Default Value"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            placeholder="Default value"
          />

          <Textarea
            label="Help Text"
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            placeholder="Help text to show below the field"
            rows={2}
          />

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
              Validation Rules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Min Value/Length"
                type="number"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="Min"
              />
              <Input
                label="Max Value/Length"
                type="number"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="Max"
              />
              <Input
                label="Min Length"
                type="number"
                value={minLength}
                onChange={(e) => setMinLength(e.target.value)}
                placeholder="Min length"
              />
              <Input
                label="Max Length"
                type="number"
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
                placeholder="Max length"
              />
            </div>
            <div className="mt-4">
              <Input
                label="Pattern (Regex)"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g., ^[A-Za-z]+$"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-200">
            <Button type="submit" variant="gradient" className="flex-1 sm:flex-none order-2 sm:order-1">
              {field ? "Update Field" : "Add Field"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none order-1 sm:order-2">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
