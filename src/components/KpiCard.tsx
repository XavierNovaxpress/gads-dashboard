import { type ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { label: string; positive: boolean } | null;
  delay?: number;
  accent?: string;
}

export function KpiCard({ title, value, subtitle, icon, trend, delay = 0, accent }: Props) {
  return (
    <div
      className="card-hover bg-card border border-border rounded-xl p-5 animate-fade-in-up relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle accent bar at top */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
          style={{ backgroundColor: accent }}
        />
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <span className="text-muted-foreground/60 p-1.5 rounded-lg bg-muted/50">
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight animate-count-up" style={{ animationDelay: `${delay + 100}ms` }}>
        {value}
      </div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-2">
          {subtitle && (
            <span className="text-[11px] text-muted-foreground">{subtitle}</span>
          )}
          {trend && (
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                trend.positive
                  ? "text-emerald-500 bg-emerald-500/10"
                  : "text-red-500 bg-red-500/10"
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
