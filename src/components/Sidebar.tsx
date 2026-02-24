import { LayoutDashboard, Sun, Moon, ChevronRight, Zap, Download, BarChart3 } from "lucide-react";
import { GROUP_ORDER, GROUP_COLORS } from "../lib/accounts";
import { fmtEur, type MonthData } from "../lib/data";

interface Props {
  dark: boolean;
  setDark: (v: boolean) => void;
  view: string;
  navigate: (v: "dashboard" | "group" | "account" | "historysync" | "cumulative", group?: string) => void;
  selectedGroup: string;
  monthData: MonthData;
}

export function Sidebar({ dark, setDark, view, navigate, selectedGroup, monthData }: Props) {
  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
      {/* Logo / title */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Google Ads</h1>
            <p className="text-[10px] text-muted-foreground font-medium">
              {monthData.label || "Dashboard"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <button
          onClick={() => navigate("dashboard")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
            view === "dashboard"
              ? "bg-accent text-accent-foreground font-medium shadow-sm"
              : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Vue d'ensemble
        </button>

        <button
          onClick={() => navigate("cumulative")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 mt-0.5 ${
            view === "cumulative"
              ? "bg-accent text-accent-foreground font-medium shadow-sm"
              : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Rapport cumulé
        </button>

        <button
          onClick={() => navigate("historysync")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 mt-0.5 ${
            view === "historysync"
              ? "bg-accent text-accent-foreground font-medium shadow-sm"
              : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Download className="w-4 h-4" />
          Sync historique
        </button>

        <div className="px-3 pt-5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Groupes
          </span>
        </div>

        <div className="space-y-0.5">
          {GROUP_ORDER.map((group, i) => {
            const gData = monthData.groups.find((g) => g.group === group);
            const active = view === "group" && selectedGroup === group;
            return (
              <button
                key={group}
                onClick={() => navigate("group", group)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-200 animate-fade-in-up group ${
                  active
                    ? "bg-accent text-accent-foreground font-medium shadow-sm"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125"
                  style={{ backgroundColor: GROUP_COLORS[group] || "#888" }}
                />
                <span className="flex-1 text-left truncate">{group}</span>
                {gData && gData.spend > 0 && (
                  <span className="text-[10px] tabular-nums font-medium opacity-60">
                    {fmtEur(gData.spend)}
                  </span>
                )}
                <ChevronRight className={`w-3 h-3 transition-all duration-200 ${
                  active ? "opacity-60 translate-x-0" : "opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0"
                }`} />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Theme toggle */}
      <div className="border-t border-border p-3 px-4">
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 w-full px-1 py-1.5 rounded-lg hover:bg-accent/50"
        >
          <div className="relative w-4 h-4">
            <Sun className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${dark ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"}`} />
            <Moon className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${dark ? "opacity-0 rotate-90" : "opacity-100 rotate-0"}`} />
          </div>
          {dark ? "Mode clair" : "Mode sombre"}
        </button>
      </div>
    </aside>
  );
}
