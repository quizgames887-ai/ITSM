"use client";

import React from "react";
import { Button } from "./button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className="w-16 h-16 text-slate-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  const content = (
    <div className="text-center py-12 sm:py-16">
      <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center animate-bounce-subtle">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-slate-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <div>
          {action.href ? (
            <Link href={action.href}>
              <Button variant="gradient">{action.label}</Button>
            </Link>
          ) : (
            <Button variant="gradient" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return content;
}
