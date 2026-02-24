import { LayoutDashboard, Sun, Moon, ChevronRight } from "lucide-react";
import { GROUP_ORDER, GROUP_COLORS } from "../lib/accounts";
import { fmtEur, type MonthData } from "../lib/data";

interface Props {
  dark: boolean;
  setDark: (v: boolean) => void;
  view: string;
  navigate: (v: "dashboard" | "group" | "account", group?: string) => void;
  selectedGroup: string;
  monthData: MonthData;
}

export function Sidebar({ dark, setDark, view, navigate, selectedGroup, monthData }: Props) {
  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
      {/* Logo / title */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold tracking-tight">Google Ads</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{monthData.label || "Dashboard"}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <button
          onClick={() => navigate("dashboard")}
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
            view === "dashboard"
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50 text-muted-foreground"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Vue d'ensemble
        </button>

        <div className="px-4 pt-4 pb-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Groupes
          </span>
        </div>

        {GROUP_ORDER.map((group) => {
          const gData = monthData.groups.find((g) => g.group === group);
          const active = view === "group" && selectedGroup === group;
          return (
            <button
              key={group}
              onClick={() => navigate("group", group)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: GROUP_COLORS[group] || "#888" }}
              />
              <span className="flex-1 text-left truncate">{group}</span>
              {gData && gData.spend > 0 && (
                <span className="text-[10px] tabular-nums">{fmtEur(gData.spend)}</span>
              )}
              <ChevronRight className="w-3 h-3 opacity-40" />
            </button>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-1"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? "Mode clair" : "Mode sombre"}
        </button>
      </div>
    </aside>
  );
}
