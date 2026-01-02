import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
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
    default: "bg-white rounded-2xl shadow-sm border border-slate-100",
    elevated: "bg-white rounded-2xl shadow-md border border-slate-100",
    outlined: "bg-white rounded-2xl shadow-none border-2 border-slate-200",
  };

  const hoverStyles = hover
    ? "hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-200 hover:-translate-y-1 hover:scale-[1.01] cursor-pointer"
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
