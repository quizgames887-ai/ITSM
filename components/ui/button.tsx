"use client";

import React from "react";
import { useBranding } from "@/contexts/BrandingContext";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const { branding } = useBranding();
  const baseStyles =
    "font-semibold rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none relative overflow-hidden";
  
  // Get gradient colors from branding or use defaults
  const primaryColor = branding?.enabled ? branding.primaryColor : "#4f46e5";
  const primaryColorHover = branding?.enabled && branding.primaryColorHover ? branding.primaryColorHover : "#4338ca";
  const secondaryColor = branding?.enabled && branding.secondaryColor ? branding.secondaryColor : "#6366f1";
  
  const variants = {
    primary:
      "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500 shadow-sm hover:shadow-md hover:shadow-slate-900/25 active:scale-[0.98]",
    secondary:
      "bg-slate-50 text-slate-900 hover:bg-slate-100 focus:ring-slate-500 shadow-sm hover:shadow border border-slate-200 hover:border-slate-300 active:scale-[0.98]",
    outline:
      "border-2 border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-500 bg-white hover:shadow-sm active:scale-[0.98]",
    ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-500 hover:text-slate-900 active:bg-slate-200",
    gradient: "", // Will be handled with inline styles
  };
  
  // Get gradient style for variant="gradient"
  const getGradientStyle = () => {
    if (variant === "gradient") {
      if (branding?.enabled && branding.secondaryColor) {
        return {
          background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
          color: "white",
        };
      } else {
        return {
          background: `linear-gradient(to right, ${primaryColor}, ${primaryColor})`,
          color: "white",
        };
      }
    }
    return {};
  };
  
  const getGradientHoverStyle = () => {
    if (variant === "gradient") {
      return {
        background: branding?.enabled && branding.secondaryColor
          ? `linear-gradient(to right, ${primaryColorHover}, ${secondaryColor})`
          : `linear-gradient(to right, ${primaryColorHover}, ${primaryColorHover})`,
      };
    }
    return {};
  };

  const sizes = {
    sm: "px-3.5 py-2 text-xs font-semibold",
    md: "px-4 py-2.5 text-sm font-semibold",
    lg: "px-6 py-3 text-base font-semibold",
  };

  const gradientClasses = variant === "gradient"
    ? "text-white focus:ring-indigo-500 shadow-sm hover:shadow-md active:scale-[0.98]"
    : "";
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${gradientClasses} ${sizes[size]} ${className}`}
      style={variant === "gradient" ? getGradientStyle() : undefined}
      onMouseEnter={(e) => {
        if (variant === "gradient") {
          Object.assign(e.currentTarget.style, getGradientHoverStyle());
        }
      }}
      onMouseLeave={(e) => {
        if (variant === "gradient") {
          Object.assign(e.currentTarget.style, getGradientStyle());
        }
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="absolute inset-0 flex items-center justify-center bg-inherit">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
          <span className="invisible">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
