import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { ArrowLeft, ArrowRight, Pencil, Check } from "lucide-react";
import { fmtEur, fmtK, fmtPct, fmt, type MonthData } from "../lib/data";
import { GROUP_COLORS } from "../lib/accounts";

interface Props {
  monthData: MonthData;
  group: string;
  navigate: (v: "dashboard" | "group" | "account", group?: string, account?: string) => void;
  updateOpsCost: (label: string, cost: number) => void;
}

export function GroupView({ monthData, group, navigate, updateOpsCost }: Props) {
  const [editingOps, setEditingOps] = useState<string | null>(null);
  const [opsInput, setOpsInput] = useState("");

  const gData = monthData.groups.find((g) => g.group === group);
  const groupAccounts = gData?.accounts ?? [];
  const activeAccounts = groupAccounts.filter((a) => a.spend > 0);
  const color = GROUP_COLORS[group] || "#888";

  const dailyGroupData: { date: string; spend: number }[] = [];
  const dateMap = new Map<string, number>();
  for (const acct of groupAccounts) {
    const acctDaily = monthData.dailyByAccount[acct.gname] || [];
    for (const d of acctDaily) {
      dateMap.set(d.date, (dateMap.get(d.date) || 0) + d.spend);
    }
  }
  for (const [date, spend] of Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    dailyGroupData.push({ date: date.slice(5), spend });
  }

  const stackedData: Record<string, unknown>[] = [];
  const allDates = new Set<string>();
  for (const acct of activeAccounts) {
    const acctDaily = monthData.dailyByAccount[acct.gname] || [];
    for (const d of acctDaily) allDates.add(d.date);
  }
  for (const date of Array.from(allDates).sort()) {
    const row: Record<string, unknown> = { date: date.slice(5) };
    for (const acct of activeAccounts) {
      const acctDaily = monthData.dailyByAccount[acct.gname] || [];
      const found = acctDaily.find((d) => d.date === date);
      row[acct.label] = found ? found.spend : 0;
    }
    stackedData.push(row);
  }

  const STACK_COLORS = ["#EC5760", "#1A2E4A", "#D94550", "#243B5C", "#F2777E", "#0E1A2E", "#C73840"];

  const handleSaveOps = (label: string) => {
    const val = parseFloat(opsInput);
    if (!isNaN(val)) updateOpsCost(label, val);
    setEditingOps(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] page-transition">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <button
          onClick={() => navigate("dashboard")}
          className="p-2 rounded-lg hover:bg-accent/50 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{group}</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground/70">{activeAccounts.length}</span> compte{activeAccounts.length > 1 ? "s" : ""} actif{activeAccounts.length > 1 ? "s" : ""} sur {groupAccounts.length}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Spend MTD", value: fmtEur(gData?.spend ?? 0), accent: color },
          { title: "Frais 5%", value: fmtEur(gData?.fees ?? 0), accent: "#8b5cf6" },
          { title: "À facturer", value: fmtEur(gData?.totalInvoice ?? 0), accent: "#06b6d4" },
          { title: "Clicks / Conv.", value: `${fmtK(gData?.clicks ?? 0)} / ${fmt(gData?.conversions ?? 0, 0)}`, accent: "#10b981" },
        ].map((kpi, i) => (
          <div
            key={kpi.title}
            className="card-hover bg-card border border-border rounded-xl p-5 animate-fade-in-up relative overflow-hidden"
            style={{ animationDelay: `${50 + i * 50}ms` }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60" style={{ backgroundColor: kpi.accent }} />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{kpi.title}</span>
            <div className="text-xl font-bold mt-1.5 tabular-nums tracking-tight">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-5 card-hover">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">Dépense journalière</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyGroupData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                formatter={(v: any) => [fmtEur(Number(v) || 0), "Spend"]}
              />
              <Bar dataKey="spend" fill={color} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {activeAccounts.length > 1 && (
          <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-6 card-hover">
            <h3 className="text-sm font-semibold mb-4 text-foreground/80">Par compte</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stackedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(v: any) => [fmtEur(Number(v) || 0)]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeAccounts.map((a, i) => (
                  <Bar key={a.label} dataKey={a.label} stackId="a" fill={STACK_COLORS[i % STACK_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Accounts table */}
      <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-7">
        <h3 className="text-sm font-semibold mb-4 text-foreground/80">Détail comptes — Facturation</h3>
        <div className="table-responsive">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Compte", "Spend", "Frais 5%", "À facturer", "Coût Ops", "Profit", "Clicks", "CPC", "CTR", "Conv."].map((h, i) => (
                  <th key={h} className={`pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider ${i > 0 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupAccounts.map((a) => (
                <tr key={a.label} className="border-b border-border/40 table-row-hover transition-colors">
                  <td className="py-3">
                    <button
                      onClick={() => navigate("account", group, a.gname)}
                      className="hover:text-foreground text-left flex items-center gap-1.5 text-muted-foreground font-medium transition-colors group"
                    >
                      {a.label}
                      {a.spend > 0 && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform" />}
                    </button>
                  </td>
                  <td className="py-3 text-right tabular-nums font-medium">{fmtEur(a.spend)}</td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">{fmtEur(a.fees)}</td>
                  <td className="py-3 text-right tabular-nums font-semibold">{fmtEur(a.totalInvoice)}</td>
                  <td className="py-3 text-right">
                    {editingOps === a.label ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={opsInput}
                          onChange={(e) => setOpsInput(e.target.value)}
                          className="w-24 text-right bg-background border border-border rounded-lg px-2 py-1 text-xs tabular-nums focus:ring-2 focus:ring-ring/30 focus:border-ring outline-none transition-all"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleSaveOps(a.label)}
                        />
                        <button onClick={() => handleSaveOps(a.label)} className="p-1 hover:bg-accent/50 rounded-lg transition-colors">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingOps(a.label); setOpsInput(a.opsCost?.toString() ?? ""); }}
                        className="inline-flex items-center gap-1 text-xs tabular-nums hover:text-foreground text-muted-foreground transition-colors"
                      >
                        {a.opsCost !== null ? fmtEur(a.opsCost) : "À renseigner"}
                        <Pencil className="w-3 h-3 opacity-50" />
                      </button>
                    )}
                  </td>
                  <td className={`py-3 text-right tabular-nums font-medium ${
                    a.profit !== null ? (a.profit >= 0 ? "text-emerald-500" : "text-red-500") : "text-muted-foreground"
                  }`}>
                    {a.profit !== null ? fmtEur(a.profit) : "—"}
                  </td>
                  <td className="py-3 text-right tabular-nums">{fmtK(a.clicks)}</td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">{fmtEur(a.cpc)}</td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">{fmtPct(a.ctr)}</td>
                  <td className="py-3 text-right tabular-nums">{fmt(a.conversions, 0)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-3">Sous-total {group}</td>
                <td className="py-3 text-right tabular-nums">{fmtEur(gData?.spend ?? 0)}</td>
                <td className="py-3 text-right tabular-nums">{fmtEur(gData?.fees ?? 0)}</td>
                <td className="py-3 text-right tabular-nums">{fmtEur(gData?.totalInvoice ?? 0)}</td>
                <td className="py-3 text-right tabular-nums">—</td>
                <td className="py-3 text-right tabular-nums">—</td>
                <td className="py-3 text-right tabular-nums">{fmtK(gData?.clicks ?? 0)}</td>
                <td className="py-3 text-right tabular-nums">—</td>
                <td className="py-3 text-right tabular-nums">—</td>
                <td className="py-3 text-right tabular-nums">{fmt(gData?.conversions ?? 0, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
