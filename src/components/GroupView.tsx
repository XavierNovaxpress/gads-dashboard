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

  // Daily data for group
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

  // Stacked daily by account
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

  const STACK_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899"];

  const handleSaveOps = (label: string) => {
    const val = parseFloat(opsInput);
    if (!isNaN(val)) {
      updateOpsCost(label, val);
    }
    setEditingOps(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("dashboard")}
          className="p-1.5 rounded hover:bg-accent/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <div>
          <h2 className="text-2xl font-semibold">{group}</h2>
          <p className="text-sm text-muted-foreground">
            {activeAccounts.length} compte{activeAccounts.length > 1 ? "s" : ""} actif{activeAccounts.length > 1 ? "s" : ""} sur {groupAccounts.length}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-xs text-muted-foreground uppercase">Spend MTD</span>
          <div className="text-xl font-semibold mt-1 tabular-nums">{fmtEur(gData?.spend ?? 0)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-xs text-muted-foreground uppercase">Frais 5%</span>
          <div className="text-xl font-semibold mt-1 tabular-nums">{fmtEur(gData?.fees ?? 0)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-xs text-muted-foreground uppercase">À facturer</span>
          <div className="text-xl font-semibold mt-1 tabular-nums">{fmtEur(gData?.totalInvoice ?? 0)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-xs text-muted-foreground uppercase">Clicks / Conv.</span>
          <div className="text-xl font-semibold mt-1 tabular-nums">
            {fmtK(gData?.clicks ?? 0)} / {fmt(gData?.conversions ?? 0, 0)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily group spend */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Dépense journalière</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyGroupData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => {
                  const val = v ?? 0;
                  return [fmtEur(val), "Spend"];
                }}
              />
              <Bar dataKey="spend" fill={color} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stacked by account */}
        {activeAccounts.length > 1 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">Par compte</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stackedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number | undefined) => {
                    const val = v ?? 0;
                    return [fmtEur(val)];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeAccounts.map((a, i) => (
                  <Bar
                    key={a.label}
                    dataKey={a.label}
                    stackId="a"
                    fill={STACK_COLORS[i % STACK_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Accounts table with editable ops cost */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Détail comptes — Facturation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground">Compte</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Spend</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Frais 5%</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">À facturer</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Coût Ops</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Profit</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Clicks</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">CPC</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">CTR</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {groupAccounts.map((a) => (
                <tr
                  key={a.label}
                  className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                >
                  <td className="py-2.5">
                    <button
                      onClick={() => navigate("account", group, a.gname)}
                      className="hover:underline text-left flex items-center gap-1"
                    >
                      {a.label}
                      {a.spend > 0 && <ArrowRight className="w-3 h-3 opacity-40" />}
                    </button>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{fmtEur(a.spend)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtEur(a.fees)}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{fmtEur(a.totalInvoice)}</td>
                  <td className="py-2.5 text-right">
                    {editingOps === a.label ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={opsInput}
                          onChange={(e) => setOpsInput(e.target.value)}
                          className="w-24 text-right bg-background border border-border rounded px-2 py-1 text-xs tabular-nums"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleSaveOps(a.label)}
                        />
                        <button
                          onClick={() => handleSaveOps(a.label)}
                          className="p-1 hover:bg-accent/50 rounded"
                        >
                          <Check className="w-3 h-3 text-emerald-500" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingOps(a.label);
                          setOpsInput(a.opsCost?.toString() ?? "");
                        }}
                        className="inline-flex items-center gap-1 text-xs tabular-nums hover:text-foreground text-muted-foreground"
                      >
                        {a.opsCost !== null ? fmtEur(a.opsCost) : "À renseigner"}
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                  <td className={`py-2.5 text-right tabular-nums ${
                    a.profit !== null ? (a.profit >= 0 ? "text-emerald-500" : "text-red-500") : "text-muted-foreground"
                  }`}>
                    {a.profit !== null ? fmtEur(a.profit) : "—"}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{fmtK(a.clicks)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtEur(a.cpc)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtPct(a.ctr)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmt(a.conversions, 0)}</td>
                </tr>
              ))}
              {/* Subtotal */}
              <tr className="font-semibold">
                <td className="py-2.5">Sous-total {group}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtEur(gData?.spend ?? 0)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtEur(gData?.fees ?? 0)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtEur(gData?.totalInvoice ?? 0)}</td>
                <td className="py-2.5 text-right tabular-nums">—</td>
                <td className="py-2.5 text-right tabular-nums">—</td>
                <td className="py-2.5 text-right tabular-nums">{fmtK(gData?.clicks ?? 0)}</td>
                <td className="py-2.5 text-right tabular-nums">—</td>
                <td className="py-2.5 text-right tabular-nums">—</td>
                <td className="py-2.5 text-right tabular-nums">{fmt(gData?.conversions ?? 0, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
