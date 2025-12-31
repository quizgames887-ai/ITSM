import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
}

export function Card({
  children,
  className = "",
  padding = "md",
  hover = false,
}: CardProps) {
  const paddings = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300 ${
        hover ? "hover:shadow-lg hover:border-slate-300" : ""
      } ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
