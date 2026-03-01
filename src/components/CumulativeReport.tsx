import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { BarChart3, TrendingUp, DollarSign, Target, Calendar, Loader2, ArrowRight } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { fmtEur, fmtK, fmt, shortMonth } from "../lib/data";
import { fetchAvailableMonths, fetchRangeData, type RangeRow } from "../lib/api";
import { getLabel, getGroup, GROUP_ORDER, GROUP_COLORS, FEE_RATE } from "../lib/accounts";

interface Props {
  navigate: (v: "dashboard" | "group" | "account", group?: string, account?: string) => void;
}

export function CumulativeReport({ navigate }: Props) {
  const [months, setMonths] = useState<string[]>([]);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [data, setData] = useState<RangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available months on mount
  useEffect(() => {
    fetchAvailableMonths()
      .then((m) => {
        setMonths(m);
        if (m.length >= 2) {
          setRangeFrom(m[m.length - 1]); // oldest
          setRangeTo(m[0]); // most recent
        } else if (m.length === 1) {
          setRangeFrom(m[0]);
          setRangeTo(m[0]);
        }
      })
      .catch(() => {
        setError("Impossible de charger les mois disponibles");
        setLoading(false);
      });
  }, []);

  // Load data when range changes
  useEffect(() => {
    if (!rangeFrom || !rangeTo) return;
    // Auto-swap if user selected from > to
    if (rangeFrom > rangeTo) {
      setRangeFrom(rangeTo);
      setRangeTo(rangeFrom);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRangeData(rangeFrom, rangeTo)
      .then((rows) => {
        if (cancelled) return;
        setData(rows);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Erreur lors du chargement des données");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [rangeFrom, rangeTo]);

  // Process data
  const processed = useMemo(() => {
    if (data.length === 0) return null;

    // Monthly totals
    const monthlyMap = new Map<string, { spend: number; clicks: number; impressions: number; conversions: number }>();
    for (const row of data) {
      const existing = monthlyMap.get(row.month);
      if (existing) {
        existing.spend += row.spend;
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.conversions += row.conversions;
      } else {
        monthlyMap.set(row.month, { spend: row.spend, clicks: row.clicks, impressions: row.impressions, conversions: row.conversions });
      }
    }
    const monthlyTotals = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month,
        label: shortMonth(month),
        spend: d.spend,
        fees: d.spend * FEE_RATE,
        invoice: d.spend * (1 + FEE_RATE),
        clicks: d.clicks,
        impressions: d.impressions,
        conversions: d.conversions,
      }));

    // Group totals per month
    const groupMonthly = new Map<string, Map<string, number>>();
    for (const row of data) {
      const group = getGroup(row.account_name);
      if (!groupMonthly.has(group)) groupMonthly.set(group, new Map());
      const gm = groupMonthly.get(group)!;
      gm.set(row.month, (gm.get(row.month) || 0) + row.spend);
    }

    // Build stacked bar data
    const allMonths = monthlyTotals.map((m) => m.month);
    const stackedData = allMonths.map((month) => {
      const entry: Record<string, string | number> = { month, label: shortMonth(month) };
      for (const group of GROUP_ORDER) {
        entry[group] = groupMonthly.get(group)?.get(month) || 0;
      }
      return entry;
    });

    // Account totals across all months
    const accountTotals = new Map<string, { spend: number; clicks: number; impressions: number; conversions: number }>();
    for (const row of data) {
      const existing = accountTotals.get(row.account_name);
      if (existing) {
        existing.spend += row.spend;
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.conversions += row.conversions;
      } else {
        accountTotals.set(row.account_name, { spend: row.spend, clicks: row.clicks, impressions: row.impressions, conversions: row.conversions });
      }
    }

    const top10 = Array.from(accountTotals.entries())
      .sort(([, a], [, b]) => b.spend - a.spend)
      .slice(0, 10)
      .map(([gname, d]) => ({
        gname,
        label: getLabel(gname),
        group: getGroup(gname),
        ...d,
      }));

    // Group pie data
    const groupTotals = new Map<string, number>();
    for (const row of data) {
      const group = getGroup(row.account_name);
      groupTotals.set(group, (groupTotals.get(group) || 0) + row.spend);
    }
    const pieData = GROUP_ORDER
      .filter((g) => (groupTotals.get(g) || 0) > 0)
      .map((g) => ({ name: g, value: groupTotals.get(g) || 0 }));

    // Grand totals
    const totalSpend = monthlyTotals.reduce((s, m) => s + m.spend, 0);
    const totalClicks = monthlyTotals.reduce((s, m) => s + m.clicks, 0);
    const totalConversions = monthlyTotals.reduce((s, m) => s + m.conversions, 0);
    const totalFees = totalSpend * FEE_RATE;
    const totalInvoice = totalSpend + totalFees;
    const avgMonthly = monthlyTotals.length > 0 ? totalSpend / monthlyTotals.length : 0;

    return {
      monthlyTotals,
      stackedData,
      top10,
      pieData,
      totalSpend,
      totalClicks,
      totalConversions,
      totalFees,
      totalInvoice,
      avgMonthly,
      monthCount: monthlyTotals.length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Chargement du rapport...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] page-transition">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <BarChart3 className="w-5 h-5 text-violet-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Rapport cumulé</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Analyse multi-mois de vos campagnes Google Ads
        </p>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 animate-fade-in-up stagger-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Période :</span>
        <select
          value={rangeFrom}
          onChange={(e) => setRangeFrom(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          {months.map((m) => (
            <option key={m} value={m}>{shortMonth(m)}</option>
          ))}
        </select>
        <span className="text-muted-foreground">→</span>
        <select
          value={rangeTo}
          onChange={(e) => setRangeTo(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          {months.map((m) => (
            <option key={m} value={m}>{shortMonth(m)}</option>
          ))}
        </select>
      </div>

      {processed && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Spend total"
              value={fmtEur(processed.totalSpend)}
              subtitle={`${processed.monthCount} mois — Moy. ${fmtEur(processed.avgMonthly)}/mois`}
              icon={<DollarSign className="w-4 h-4" />}
              delay={50}
              accent="#EC5760"
            />
            <KpiCard
              title="Frais de gestion"
              value={fmtEur(processed.totalFees)}
              subtitle="5% du média"
              icon={<Target className="w-4 h-4" />}
              delay={100}
              accent="#8b5cf6"
            />
            <KpiCard
              title="Total facturé"
              value={fmtEur(processed.totalInvoice)}
              subtitle={`Sur ${processed.monthCount} mois`}
              icon={<TrendingUp className="w-4 h-4" />}
              delay={150}
              accent="#06b6d4"
            />
            <KpiCard
              title="Clicks totaux"
              value={fmtK(processed.totalClicks)}
              subtitle={`${fmt(processed.totalConversions, 0)} conversions`}
              icon={<BarChart3 className="w-4 h-4" />}
              delay={200}
              accent="#10b981"
            />
          </div>

          {/* Monthly spend evolution */}
          <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-5 card-hover">
            <h3 className="text-sm font-semibold mb-4 text-foreground/80">Évolution mensuelle du spend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processed.stackedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(v: any, name: string) => [fmtEur(Number(v) || 0), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {GROUP_ORDER.map((group) => (
                  <Bar key={group} dataKey={group} stackId="a" fill={GROUP_COLORS[group] || "#888"} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly trend line */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-6 card-hover">
              <h3 className="text-sm font-semibold mb-4 text-foreground/80">Tendances mensuelles</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={processed.monthlyTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    formatter={(v: any, name: string) => {
                      if (name === "Spend") return [fmtEur(Number(v) || 0), name];
                      return [fmtK(Number(v) || 0), name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#EC5760" strokeWidth={2.5} dot={{ fill: "#EC5760", r: 4, stroke: "#fff", strokeWidth: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="clicks" name="Clicks" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3, stroke: "#fff", strokeWidth: 2 }} strokeDasharray="6 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-6 card-hover">
              <h3 className="text-sm font-semibold mb-4 text-foreground/80">Répartition cumulée</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={processed.pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {processed.pieData.map((entry) => (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 10 accounts */}
            <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-7 card-hover">
              <h3 className="text-sm font-semibold mb-4 text-foreground/80">Top 10 comptes (période)</h3>
              <div className="space-y-1">
                {processed.top10.map((a, i) => (
                  <button
                    key={a.gname}
                    onClick={() => navigate("account", a.group, a.gname)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all duration-200 text-left group"
                  >
                    <span className="text-xs font-bold text-muted-foreground/50 w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-foreground transition-colors">{a.label}</div>
                      <div className="text-[10px] text-muted-foreground">{a.group}</div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{fmtEur(a.spend)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly breakdown table */}
            <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up stagger-7 card-hover">
              <h3 className="text-sm font-semibold mb-4 text-foreground/80">Détail mensuel</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider">Mois</th>
                      <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Spend</th>
                      <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Frais</th>
                      <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Facturé</th>
                      <th className="pb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider text-right">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.monthlyTotals.map((m) => (
                      <tr key={m.month} className="border-b border-border/40 table-row-hover transition-colors">
                        <td className="py-2.5 font-medium">{m.label}</td>
                        <td className="py-2.5 text-right tabular-nums">{fmtEur(m.spend)}</td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtEur(m.fees)}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">{fmtEur(m.invoice)}</td>
                        <td className="py-2.5 text-right tabular-nums">{fmtK(m.clicks)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2.5">TOTAL</td>
                      <td className="py-2.5 text-right tabular-nums">{fmtEur(processed.totalSpend)}</td>
                      <td className="py-2.5 text-right tabular-nums">{fmtEur(processed.totalFees)}</td>
                      <td className="py-2.5 text-right tabular-nums">{fmtEur(processed.totalInvoice)}</td>
                      <td className="py-2.5 text-right tabular-nums">{fmtK(processed.totalClicks)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!processed && !loading && (
        <div className="flex items-center justify-center h-40 animate-fade-in">
          <p className="text-sm text-muted-foreground">Aucune donnée pour cette période</p>
        </div>
      )}
    </div>
  );
}
