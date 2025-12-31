import React from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent font-serif text-slate-900 placeholder:text-slate-400 transition-all resize-y min-h-[100px] ${
          error ? "border-red-500 focus:ring-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-600 font-serif">{error}</p>
      )}
    </div>
  );
}
