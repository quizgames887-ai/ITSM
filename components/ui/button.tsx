import React from "react";

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
  const baseStyles =
    "font-medium rounded-xl font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none relative overflow-hidden";
  
  const variants = {
    primary:
      "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500 shadow-md hover:shadow-lg hover:shadow-slate-900/20 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-98",
    secondary:
      "bg-slate-50 text-slate-900 hover:bg-slate-100 focus:ring-slate-500 shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300",
    outline:
      "border-2 border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-500 bg-white hover:shadow-sm",
    ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-500 hover:text-slate-900",
    gradient:
      "bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:via-indigo-700 hover:to-purple-700 focus:ring-indigo-500 shadow-md hover:shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-98",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs sm:text-sm font-medium",
    md: "px-5 py-2.5 text-sm sm:py-3 sm:text-base font-medium",
    lg: "px-6 py-3 text-base sm:px-8 sm:py-3.5 sm:text-lg font-semibold",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
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
