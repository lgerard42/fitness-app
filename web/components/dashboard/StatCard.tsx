import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-6 border border-gray-100 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.positive
                ? "bg-accent-100 text-accent-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-extrabold text-neutral-dark mt-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
