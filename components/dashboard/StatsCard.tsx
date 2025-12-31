"use client";

import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number;
  color?: "blue" | "yellow" | "green" | "red" | "default";
  icon?: React.ReactNode;
}

const colorConfig = {
  blue: {
    text: "text-blue-600",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    border: "border-blue-200",
  },
  yellow: {
    text: "text-yellow-600",
    bg: "bg-yellow-50",
    iconBg: "bg-yellow-100",
    border: "border-yellow-200",
  },
  green: {
    text: "text-green-600",
    bg: "bg-green-50",
    iconBg: "bg-green-100",
    border: "border-green-200",
  },
  red: {
    text: "text-red-600",
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    border: "border-red-200",
  },
  default: {
    text: "text-slate-900",
    bg: "bg-slate-50",
    iconBg: "bg-slate-100",
    border: "border-slate-200",
  },
};

const defaultIcons = {
  blue: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  yellow: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  green: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  red: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  default: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

export function StatsCard({ title, value, color = "default", icon }: StatsCardProps) {
  const config = colorConfig[color];
  const displayIcon = icon || defaultIcons[color];

  return (
    <Card hover className={`${config.bg} ${config.border} border-2 animate-fade-in group cursor-pointer`} padding="sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1 truncate group-hover:text-slate-700 transition-colors">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${config.text} transition-transform group-hover:scale-105`}>{value}</p>
        </div>
        <div className={`${config.iconBg} p-2 sm:p-3 rounded-lg ${config.text} flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md`}>
          <div className="w-5 h-5 sm:w-6 sm:h-6">
            {displayIcon}
          </div>
        </div>
      </div>
    </Card>
  );
}
