import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "default" | "elevated" | "outlined";
  id?: string;
}

export function Card({
  children,
  className = "",
  padding = "md",
  hover = false,
  style,
  onClick,
  variant = "default",
  id,
}: CardProps) {
  const paddings = {
    none: "p-0",
    sm: "p-4 sm:p-5",
    md: "p-5 sm:p-6 lg:p-7",
    lg: "p-6 sm:p-8 lg:p-10",
  };

  const variants = {
    default: "bg-white rounded-xl shadow-sm border border-slate-200/60",
    elevated: "bg-white rounded-xl shadow-md border border-slate-200/60",
    outlined: "bg-white rounded-xl shadow-none border-2 border-slate-300",
  };

  const hoverStyles = hover
    ? "hover:shadow-lg hover:shadow-slate-200/40 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    : "";

  return (
    <div
      id={id}
      className={`${variants[variant]} transition-all duration-300 ease-out ${hoverStyles} ${paddings[padding]} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
