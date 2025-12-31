import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  padding = "md",
  hover = false,
  style,
  onClick,
}: CardProps) {
  const paddings = {
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300 ${
        hover ? "hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 hover:scale-[1.01]" : ""
      } ${paddings[padding]} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
