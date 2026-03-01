import { useState, memo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import { ArrowLeft, Pencil, Check } from "lucide-react";
import { fmtEur, fmtK, fmtPct, fmt, type MonthData, type DailyRow } from "../lib/data";
import { getAccountByGname, getLabel, getGroup, GROUP_COLORS, FEE_RATE } from "../lib/accounts";

interface Props {
  monthData: MonthData;
  accountGname: string;
  navigate: (v: "dashboard" | "group" | "account", group?: string, account?: string) => void;
  opsCost: Record<string, number>;
  updateOpsCost: (label: string, cost: number) => void;
}

export const AccountDetail = memo(function AccountDetail({ monthData, accountGname, navigate, opsCost, updateOpsCost }: Props) {
  const [editingOps, setEditingOps] = useState(false);
  const [opsInput, setOpsInput] = useState("");

  const acctConfig = getAccountByGname(accountGname);
  const label = acctConfig?.label ?? getLabel(accountGname);
  const group = acctConfig?.group ?? getGroup(accountGname);
  const color = GROUP_COLORS[group] || "#EC5760";
  const acctSummary = monthData.accounts.find((a) => a.gname === accountGname);
  const daily: DailyRow[] = monthData.dailyByAccount[accountGname] || [];

  const spend = acctSummary?.spend ?? 0;
  const clicks = acctSummary?.clicks ?? 0;
  const impressions = acctSummary?.impressions ?? 0;
  const conversions = acctSummary?.conversions ?? 0;
  const cpc = acctSummary?.cpc ?? 0;
  const ctr = acctSummary?.ctr ?? 0;
  const fees = spend * FEE_RATE;
  const totalInvoice = spend + fees;
  const currentOpsCost = opsCost[label] ?? null;
  const profit = currentOpsCost !== null ? fees - currentOpsCost : null;

  const cumData = daily.reduce<{ date: string; spend: number; cumSpend: number; clicks: number; conversions: number }[]>(
    (acc, d) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumSpend : 0;
      acc.push({ date: d.date.slice(5), spend: d.spend, cumSpend: prev + d.spend, clicks: d.clicks, conversions: d.conversions });
      return acc;
    },
    []
  );

  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const last7Spend = last7.reduce((s, d) => s + d.spend, 0);
  const prev7Spend = prev7.reduce((s, d) => s + d.spend, 0);
  const trendPct = prev7Spend > 0 ? ((last7Spend - prev7Spend) / prev7Spend) * 100 : 0;

  const handleSaveOps = () => {
    const val = parseFloat(opsInput);
    if (!isNaN(val)) updateOpsCost(label, val);
    setEditingOps(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] page-transition">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <button
          onClick={() => navigate("group", group)}
          className="p-2 rounded-lg hover:bg-accent/50 transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="Retour au groupe"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{label}</h2>
          <p className="text-sm text-muted-foreground">
            {group} — CID <span className="font-mono text-xs">{acctConfig?.cid ?? "N/A"}</span>
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { title: "Spend MTD", value: fmtEur(spend), accent: color },
          { title: "À facturer", value: fmtEur(totalInvoice), accent: "#8b5cf6" },
        ].map((kpi, i) => (
          <div key={kpi.title} className="card-hover bg-card border border-border rounded-xl p-4 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: `${50 + i * 50}ms` }}>
            <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60" style={{ backgroundColor: kpi.accent }} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{kpi.title}</span>
            <div className="text-lg font-bold mt-1 tabular-nums tracking-tight">{kpi.value}</div>
          </div>
        ))}

        {/* Ops Cost - editable */}
        <div className="card-hover bg-card border border-border rounded-xl p-4 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: "150ms" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60 bg-amber-500" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Coût Ops</span>
          <div className="text-lg font-bold mt-1 tabular-nums flex items-center gap-1">
            {editingOps ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={opsInput}
                  onChange={(e) => setOpsInput(e.target.value)}
                  className="w-24 bg-background border border-border rounded-lg px-2 py-0.5 text-sm tabular-nums focus:ring-2 focus:ring-ring/30 focus:border-ring outline-none transition-all"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveOps()}
                />
                <button onClick={handleSaveOps} className="p-1 hover:bg-accent/50 rounded-lg transition-colors">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </button>
              </div>
            ) : (
              <>
                <span className={currentOpsCost !== null ? "" : "text-muted-foreground text-sm"}>
                  {currentOpsCost !== null ? fmtEur(currentOpsCost) : "À renseigner"}
                </span>
                <button
                  onClick={() => { setEditingOps(true); setOpsInput(currentOpsCost?.toString() ?? ""); }}
                  className="p-0.5 hover:bg-accent/50 rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground/50" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card-hover bg-card border border-border rounded-xl p-4 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: "200ms" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60" style={{ backgroundColor: profit !== null && profit >= 0 ? "#10b981" : "#ef4444" }} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Profit</span>
          <div className={`text-lg font-bold mt-1 tabular-nums ${profit !== null ? (profit >= 0 ? "text-emerald-500" : "text-red-500") : "text-muted-foreground"}`}>
            {profit !== null ? fmtEur(profit) : "—"}
          </div>
        </div>

        <div className="card-hover bg-card border border-border rounded-xl p-4 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: "250ms" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60" style={{ backgroundColor: trendPct >= 0 ? "#10b981" : "#ef4444" }} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Tendance 7j</span>
          <div className={`text-lg font-bold mt-1 tabular-nums ${trendPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {trendPct >= 0 ? "+" : ""}{trendPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: "Clicks", value: fmtK(clicks), accent: "#EC5760" },
          { title: "Impressions", value: fmtK(impressions), accent: "#8b5cf6" },
          { title: "CPC moyen", value: fmtEur(cpc), accent: "#f59e0b" },
          { title: "CTR", value: fmtPct(ctr), accent: "#06b6d4" },
        ].map((kpi, i) => (
          <div key={kpi.title} className="card-hover bg-card border border-border rounded-xl p-4 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: `${300 + i * 50}ms` }}>
            <div className="absolute top-0 left-0 right-0 h-0.5 opacity-40" style={{ backgroundColor: kpi.accent }} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{kpi.title}</span>
            <div className="text-lg font-bold mt-1 tabular-nums tracking-tight">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-6 card-hover">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">Spend cumulé</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cumData}>
              <defs>
                <linearGradient id="gradAcct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={(v: any) => [fmtEur(Number(v) || 0)]} />
              <Area type="monotone" dataKey="cumSpend" stroke={color} fill="url(#gradAcct)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-7 card-hover">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">Dépense journalière</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cumData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={(v: any) => [fmtEur(Number(v) || 0)]} />
              <Bar dataKey="spend" fill={color} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clicks + Conversions */}
      <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-8 card-hover">
        <h3 className="text-sm font-semibold mb-4 text-foreground/80">Clicks & Conversions</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={cumData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#EC5760" strokeWidth={2} dot={false} name="Clicks" />
            <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={false} name="Conversions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily detail table */}
      <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-8">
        <h3 className="text-sm font-semibold mb-4 text-foreground/80">Détail journalier</h3>
        <div className="table-responsive max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border text-left">
                {["Date", "Spend", "Clicks", "Impr.", "Conv.", "CPC", "CTR"].map((h, i) => (
                  <th key={h} className={`pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider ${i > 0 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} className="border-b border-border/40 table-row-hover transition-colors">
                  <td className="py-2.5 tabular-nums font-medium">{d.date}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{fmtEur(d.spend)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtK(d.clicks)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtK(d.impressions)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmt(d.conversions, 0)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtEur(d.cpc)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtPct(d.ctr)}</td>
                </tr>
              ))}
              <tr className="font-bold border-t border-border">
                <td className="py-2.5">Total</td>
                <td className="py-2.5 text-right tabular-nums">{fmtEur(spend)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtK(clicks)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtK(impressions)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmt(conversions, 0)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtEur(cpc)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtPct(ctr)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
