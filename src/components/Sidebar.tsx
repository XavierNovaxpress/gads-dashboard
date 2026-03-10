import { LayoutDashboard, Sun, Moon, ChevronRight, TrendingUp, Download, BarChart3, Link } from "lucide-react";
import { GROUP_COLORS } from "../lib/accounts";
import { fmtEur, type MonthData } from "../lib/data";

interface Props {
  dark: boolean;
  setDark: (v: boolean) => void;
  view: string;
  navigate: (v: "dashboard" | "group" | "account" | "historysync" | "cumulative" | "mccmanager", group?: string) => void;
  selectedGroup: string;
  monthData: MonthData;
  groupOrder?: string[];
  isAdmin?: boolean;
}

export function Sidebar({ dark, setDark, view, navigate, selectedGroup, monthData, groupOrder, isAdmin }: Props) {
  const activeGroups = groupOrder ?? monthData.groups.map((g) => g.group);
  const activeClass = "bg-white/10 text-white font-medium shadow-sm";
  const inactiveClass = "text-white/50 hover:bg-white/5 hover:text-white/80";

  return (
    <aside className="w-64 h-full dataopp-sidebar flex flex-col shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Logo */}
      <div className="p-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: "linear-gradient(135deg, #EC5760 0%, #D94550 100%)", boxShadow: "0 4px 12px rgba(236,87,96,0.3)" }}>
            <TrendingUp className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">DataOpp</h1>
            <p className="text-[10px] font-medium text-white/40">
              {monthData.label || "Google Ads"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <button
          onClick={() => navigate("dashboard")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
            view === "dashboard" ? activeClass : inactiveClass
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Vue d'ensemble
        </button>

        <button
          onClick={() => navigate("cumulative")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 mt-0.5 ${
            view === "cumulative" ? activeClass : inactiveClass
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Rapport cumul&eacute;
        </button>

        <button
          onClick={() => navigate("historysync")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 mt-0.5 ${
            view === "historysync" ? activeClass : inactiveClass
          }`}
        >
          <Download className="w-4 h-4" />
          Sync historique
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate("mccmanager")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 mt-0.5 ${
              view === "mccmanager" ? activeClass : inactiveClass
            }`}
          >
            <Link className="w-4 h-4" />
            Comptes MCC
          </button>
        )}

        <div className="px-3 pt-5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(236,87,96,0.6)" }}>
            Groupes
          </span>
        </div>

        <div className="space-y-0.5">
          {activeGroups.map((group, i) => {
            const gData = monthData.groups.find((g) => g.group === group);
            const active = view === "group" && selectedGroup === group;
            return (
              <button
                key={group}
                onClick={() => navigate("group", group)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-200 animate-fade-in-up group ${
                  active ? activeClass : inactiveClass
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125"
                  style={{ backgroundColor: GROUP_COLORS[group] || "#888" }}
                />
                <span className="flex-1 text-left truncate">{group}</span>
                {gData && gData.spend > 0 && (
                  <span className="text-[10px] tabular-nums font-medium opacity-50">
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
      <div className="p-3 px-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-2.5 text-sm text-white/40 hover:text-white/70 transition-all duration-200 w-full px-1 py-1.5 rounded-lg hover:bg-white/5"
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
