import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Receipt, DollarSign, Target, AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { fmtEur, fmtK, fmt, type MonthData } from "../lib/data";
import { GROUP_COLORS } from "../lib/accounts";

interface Props {
  monthData: MonthData;
  prevMonthData: MonthData | null;
  navigate: (v: "dashboard" | "group" | "account", group?: string, account?: string) => void;
}

function delta(current: number, previous: number): { label: string; positive: boolean } | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { label: `${sign}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function DeltaBadge({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0) return <span className="text-[10px] text-muted-foreground/40">—</span>;
  const pct = ((current - previous) / previous) * 100;
  const isPositive = invert ? pct <= 0 : pct >= 0;
  const sign = pct >= 0 ? "+" : "";
  const Icon = pct > 1 ? ArrowUpRight : pct < -1 ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
      isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
    }`}>
      <Icon className="w-2.5 h-2.5" />
      {sign}{pct.toFixed(1)}%
    </span>
  );
}

export function Dashboard({ monthData, prevMonthData, navigate }: Props) {
  const { totalSpend, totalFees, totalInvoice, projection, groups, dailyTotals, accounts, daysElapsed, daysInMonth } = monthData;
  const prev = prevMonthData;

  const cumData = dailyTotals.reduce<{ date: string; spend: number; cumSpend: number }[]>(
    (acc, d) => {
      const prevCum = acc.length > 0 ? acc[acc.length - 1].cumSpend : 0;
      acc.push({ date: d.date.slice(5), spend: d.spend, cumSpend: prevCum + d.spend });
      return acc;
    },
    []
  );

  const pieData = groups.filter((g) => g.spend > 0).map((g) => ({ name: g.group, value: g.spend }));
  const top5 = [...accounts].sort((a, b) => b.spend - a.spend).slice(0, 5);

  const alerts: { label: string; msg: string; type: "warning" | "info" }[] = [];
  for (const a of accounts) {
    if (a.spend === 0 && a.gname) {
      alerts.push({ label: a.label, msg: "Aucune dépense ce mois", type: "warning" });
    }
  }
  const avgSpend = totalSpend / (accounts.filter((a) => a.spend > 0).length || 1);
  for (const a of accounts) {
    if (a.spend > avgSpend * 3 && a.spend > 1000) {
      alerts.push({ label: a.label, msg: `Spend ${fmt(a.spend / avgSpend, 1)}x supérieur à la moyenne`, type: "info" });
    }
  }

  // M-1 deltas for KPIs
  const spendDelta = prev ? delta(totalSpend, prev.totalSpend) : null;
  const feesDelta = prev ? delta(totalFees, prev.totalFees) : null;
  const invoiceDelta = prev ? delta(totalInvoice, prev.totalInvoice) : null;
  const projDelta = prev ? delta(projection, prev.projection) : null;

  // Build prev group map for table comparison
  const prevGroupMap = new Map<string, { spend: number; fees: number; totalInvoice: number; clicks: number; conversions: number }>();
  if (prev) {
    for (const g of prev.groups) {
      prevGroupMap.set(g.group, { spend: g.spend, fees: g.fees, totalInvoice: g.totalInvoice, clicks: g.clicks, conversions: g.conversions });
    }
  }

  // Build prev account map for top5 comparison
  const prevAccountMap = new Map<string, number>();
  if (prev) {
    for (const a of prev.accounts) {
      prevAccountMap.set(a.gname, a.spend);
    }
  }

  const last7 = dailyTotals.slice(-7);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] page-transition">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {monthData.label} — <span className="font-medium text-foreground/70">{daysElapsed}</span> jours sur {daysInMonth}
          {prev && prev.label && (
            <span className="ml-2 text-muted-foreground/60">• vs {prev.label}</span>
          )}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Spend MTD"
          value={fmtEur(totalSpend)}
          subtitle={`Moy. ${fmtEur(daysElapsed > 0 ? totalSpend / daysElapsed : 0)}/j`}
          icon={<DollarSign className="w-4 h-4" />}
          trend={spendDelta}
          delay={50}
          accent="#EC5760"
        />
        <KpiCard
          title="Frais de gestion"
          value={fmtEur(totalFees)}
          subtitle="5% du média"
          icon={<Receipt className="w-4 h-4" />}
          trend={feesDelta}
          delay={100}
          accent="#1A2E4A"
        />
        <KpiCard
          title="Total à facturer"
          value={fmtEur(totalInvoice)}
          subtitle={`${accounts.filter((a) => a.spend > 0).length} comptes actifs`}
          icon={<Target className="w-4 h-4" />}
          trend={invoiceDelta}
          delay={150}
          accent="#D94550"
        />
        <KpiCard
          title="Projection fin de mois"
          value={fmtEur(projection)}
          subtitle={`Basée sur ${daysElapsed}j`}
          icon={<TrendingUp className="w-4 h-4" />}
          trend={projDelta}
          delay={200}
          accent="#243B5C"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cumulative spend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-5 card-hover">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">Dépense cumulée</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cumData}>
              <defs>
                <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC5760" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#EC5760" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                formatter={(v: any) => [fmtEur(Number(v) || 0), "Cumulé"]}
              />
              <Area type="monotone" dataKey="cumSpend" stroke="#EC5760" fill="url(#gradSpend)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#EC5760", stroke: "#fff", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-6 card-hover">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">Répartition par groupe</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} strokeWidth={0}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={GROUP_COLORS[entry.name] || "#888"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                formatter={(v: any) => [fmtEur(Number(v) || 0)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value: string) => <span className="text-foreground/80">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 5 with M-1 delta */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-7 card-hover">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">Top 5 comptes</h3>
          <div className="space-y-1">
            {top5.map((a, i) => {
              const prevSpend = prevAccountMap.get(a.gname) || 0;
              return (
                <button
                  key={a.label}
                  onClick={() => navigate("account", a.group, a.gname)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all duration-200 text-left group"
                >
                  <span className="text-xs font-bold text-muted-foreground/50 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-foreground transition-colors">{a.label}</div>
                    <div className="text-[10px] text-muted-foreground">{a.group}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{fmtEur(a.spend)}</div>
                    {prev && <DeltaBadge current={a.spend} previous={prevSpend} />}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily bars */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-7 card-hover">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(8)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                formatter={(v: any) => [fmtEur(Number(v) || 0), "Spend"]}
              />
              <Bar dataKey="spend" fill="#EC5760" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-8 card-hover">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground/80">
            <div className="p-1 rounded-md bg-amber-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            Alertes
          </h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {alerts.length === 0 && (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-muted-foreground/60">Aucune alerte</p>
              </div>
            )}
            {alerts.slice(0, 8).map((a, i) => (
              <div
                key={i}
                className={`text-xs p-2.5 rounded-lg border transition-colors ${
                  a.type === "warning"
                    ? "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
                    : "border-[#12213A]/20 bg-[#12213A]/5 hover:bg-[#12213A]/10"
                }`}
              >
                <span className="font-semibold">{a.label}:</span> {a.msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Group summary table with M-1 comparison */}
      <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground/80">Facturation par groupe</h3>
          {prev && prev.label && (
            <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted/50 px-2 py-1 rounded-md">
              vs {prev.label}
            </span>
          )}
        </div>
        <div className="table-responsive">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider">Groupe</th>
                <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Spend</th>
                {prev && <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Δ M-1</th>}
                <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Frais 5%</th>
                <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">À facturer</th>
                {prev && <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Δ M-1</th>}
                <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Clicks</th>
                <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Conv.</th>
                <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Comptes</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const pg = prevGroupMap.get(g.group);
                return (
                  <tr
                    key={g.group}
                    className="border-b border-border/40 table-row-hover cursor-pointer transition-colors"
                    onClick={() => navigate("group", g.group)}
                  >
                    <td className="py-3 flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[g.group] || "#888" }} />
                      <span className="font-medium">{g.group}</span>
                    </td>
                    <td className="py-3 text-right tabular-nums">{fmtEur(g.spend)}</td>
                    {prev && (
                      <td className="py-3 text-right">
                        <DeltaBadge current={g.spend} previous={pg?.spend || 0} />
                      </td>
                    )}
                    <td className="py-3 text-right tabular-nums text-muted-foreground">{fmtEur(g.fees)}</td>
                    <td className="py-3 text-right tabular-nums font-semibold">{fmtEur(g.totalInvoice)}</td>
                    {prev && (
                      <td className="py-3 text-right">
                        <DeltaBadge current={g.totalInvoice} previous={pg?.totalInvoice || 0} />
                      </td>
                    )}
                    <td className="py-3 text-right tabular-nums">{fmtK(g.clicks)}</td>
                    <td className="py-3 text-right tabular-nums">{fmt(g.conversions, 0)}</td>
                    <td className="py-3 text-right tabular-nums">
                      <span className="font-medium">{g.accounts.filter((a) => a.spend > 0).length}</span>
                      <span className="text-muted-foreground">/{g.accounts.length}</span>
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold">
                <td className="py-3">TOTAL</td>
                <td className="py-3 text-right tabular-nums">{fmtEur(totalSpend)}</td>
                {prev && (
                  <td className="py-3 text-right">
                    <DeltaBadge current={totalSpend} previous={prev.totalSpend} />
                  </td>
                )}
                <td className="py-3 text-right tabular-nums">{fmtEur(totalFees)}</td>
                <td className="py-3 text-right tabular-nums">{fmtEur(totalInvoice)}</td>
                {prev && (
                  <td className="py-3 text-right">
                    <DeltaBadge current={totalInvoice} previous={prev.totalInvoice} />
                  </td>
                )}
                <td className="py-3 text-right tabular-nums">{fmtK(groups.reduce((s, g) => s + g.clicks, 0))}</td>
                <td className="py-3 text-right tabular-nums">{fmt(groups.reduce((s, g) => s + g.conversions, 0), 0)}</td>
                <td className="py-3 text-right tabular-nums">
                  {accounts.filter((a) => a.spend > 0).length}/{accounts.length}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
