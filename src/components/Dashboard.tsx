import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Receipt, DollarSign, Target, AlertTriangle, ArrowRight } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { fmtEur, fmtK, fmt, type MonthData } from "../lib/data";
import { GROUP_COLORS } from "../lib/accounts";

interface Props {
  monthData: MonthData;
  navigate: (v: "dashboard" | "group" | "account", group?: string, account?: string) => void;
}

export function Dashboard({ monthData, navigate }: Props) {
  const { totalSpend, totalFees, totalInvoice, projection, groups, dailyTotals, accounts, daysElapsed, daysInMonth } = monthData;

  // Cumulative spend chart data
  const cumData = dailyTotals.reduce<{ date: string; spend: number; cumSpend: number }[]>(
    (acc, d) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumSpend : 0;
      acc.push({ date: d.date.slice(5), spend: d.spend, cumSpend: prev + d.spend });
      return acc;
    },
    []
  );

  // Group breakdown for pie chart
  const pieData = groups
    .filter((g) => g.spend > 0)
    .map((g) => ({ name: g.group, value: g.spend }));

  // Top 5 accounts
  const top5 = [...accounts].sort((a, b) => b.spend - a.spend).slice(0, 5);

  // Alerts
  const alerts: { label: string; msg: string; type: "warning" | "info" }[] = [];
  for (const a of accounts) {
    if (a.spend === 0 && a.gname) {
      alerts.push({ label: a.label, msg: "Aucune dépense ce mois", type: "warning" });
    }
  }
  // Big spender alert
  const avgSpend = totalSpend / (accounts.filter((a) => a.spend > 0).length || 1);
  for (const a of accounts) {
    if (a.spend > avgSpend * 3 && a.spend > 1000) {
      alerts.push({
        label: a.label,
        msg: `Spend ${fmt(a.spend / avgSpend, 1)}x supérieur à la moyenne`,
        type: "info",
      });
    }
  }

  // Daily spend for last 7 days
  const last7 = dailyTotals.slice(-7);

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Vue d'ensemble</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {monthData.label} — {daysElapsed} jours sur {daysInMonth}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Spend MTD"
          value={fmtEur(totalSpend)}
          subtitle={`Moy. ${fmtEur(daysElapsed > 0 ? totalSpend / daysElapsed : 0)}/j`}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KpiCard
          title="Frais de gestion"
          value={fmtEur(totalFees)}
          subtitle="5% du média"
          icon={<Receipt className="w-4 h-4" />}
        />
        <KpiCard
          title="Total à facturer"
          value={fmtEur(totalInvoice)}
          subtitle={`${accounts.filter((a) => a.spend > 0).length} comptes actifs`}
          icon={<Target className="w-4 h-4" />}
        />
        <KpiCard
          title="Projection fin de mois"
          value={fmtEur(projection)}
          subtitle={`Basée sur ${daysElapsed}j`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cumulative spend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">Dépense cumulée</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cumData}>
              <defs>
                <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => {
                  const val = v ?? 0;
                  return [fmtEur(val), "Cumulé"];
                }}
              />
              <Area type="monotone" dataKey="cumSpend" stroke="#3b82f6" fill="url(#gradSpend)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">Répartition par groupe</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={GROUP_COLORS[entry.name] || "#888"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => {
                  const val = v ?? 0;
                  return [fmtEur(val)];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => <span className="text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Top accounts + daily bar + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 5 */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Top 5 comptes</h3>
          <div className="space-y-2">
            {top5.map((a, i) => (
              <button
                key={a.label}
                onClick={() => navigate("account", a.group, a.gname)}
                className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent/50 transition-colors text-left"
              >
                <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.group}</div>
                </div>
                <span className="text-sm font-medium tabular-nums">{fmtEur(a.spend)}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Daily bars */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(8)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => {
                  const val = v ?? 0;
                  return [fmtEur(val), "Spend"];
                }}
              />
              <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alertes
          </h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {alerts.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune alerte</p>
            )}
            {alerts.slice(0, 8).map((a, i) => (
              <div
                key={i}
                className={`text-xs p-2 rounded border ${
                  a.type === "warning"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-blue-500/30 bg-blue-500/5"
                }`}
              >
                <span className="font-medium">{a.label}:</span> {a.msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Group summary table */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Facturation par groupe</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground">Groupe</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Spend</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Frais 5%</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">À facturer</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Clicks</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Conv.</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Comptes</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g.group}
                  className="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => navigate("group", g.group)}
                >
                  <td className="py-2.5 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: GROUP_COLORS[g.group] || "#888" }}
                    />
                    {g.group}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{fmtEur(g.spend)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtEur(g.fees)}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{fmtEur(g.totalInvoice)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtK(g.clicks)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmt(g.conversions, 0)}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {g.accounts.filter((a) => a.spend > 0).length}/{g.accounts.length}
                  </td>
                </tr>
              ))}
              {/* Total */}
              <tr className="font-semibold">
                <td className="py-2.5">TOTAL</td>
                <td className="py-2.5 text-right tabular-nums">{fmtEur(totalSpend)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtEur(totalFees)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtEur(totalInvoice)}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {fmtK(groups.reduce((s, g) => s + g.clicks, 0))}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {fmt(groups.reduce((s, g) => s + g.conversions, 0), 0)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
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
