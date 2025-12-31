"use client";

import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number;
  color?: "blue" | "yellow" | "green" | "red" | "default";
}

const colorClasses = {
  blue: "text-blue-600",
  yellow: "text-yellow-600",
  green: "text-green-600",
  red: "text-red-600",
  default: "text-slate-900",
};

export function StatsCard({ title, value, color = "default" }: StatsCardProps) {
  return (
    <Card>
      <div className="text-center">
        <p className="text-sm text-slate-600 mb-2">{title}</p>
        <p className={`text-4xl font-bold ${colorClasses[color]}`}>{value}</p>
      </div>
    </Card>
  );
}
