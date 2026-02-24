import { type ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { label: string; positive: boolean } | null;
}

export function KpiCard({ title, value, subtitle, icon, trend }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          {trend && (
            <span
              className={`text-xs font-medium ${
                trend.positive ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
