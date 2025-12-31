"use client";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: "indigo" | "green" | "yellow" | "red" | "blue";
  showValue?: boolean;
  className?: string;
}

const colorClasses = {
  indigo: "bg-indigo-600",
  green: "bg-green-600",
  yellow: "bg-yellow-600",
  red: "bg-red-600",
  blue: "bg-blue-600",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  color = "indigo",
  showValue = true,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {showValue && (
            <span className="text-sm text-slate-600">{value} / {max}</span>
          )}
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
