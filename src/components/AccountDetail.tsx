import { useState } from "react";
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

export function AccountDetail({ monthData, accountGname, navigate, opsCost, updateOpsCost }: Props) {
  const [editingOps, setEditingOps] = useState(false);
  const [opsInput, setOpsInput] = useState("");

  const acctConfig = getAccountByGname(accountGname);
  const label = acctConfig?.label ?? getLabel(accountGname);
  const group = acctConfig?.group ?? getGroup(accountGname);
  const color = GROUP_COLORS[group] || "#3b82f6";
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

  // Cumulative spend
  const cumData = daily.reduce<{ date: string; spend: number; cumSpend: number; clicks: number; conversions: number }[]>(
    (acc, d) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumSpend : 0;
      acc.push({
        date: d.date.slice(5),
        spend: d.spend,
        cumSpend: prev + d.spend,
        clicks: d.clicks,
        conversions: d.conversions,
      });
      return acc;
    },
    []
  );

  // 7-day trend
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const last7Spend = last7.reduce((s, d) => s + d.spend, 0);
  const prev7Spend = prev7.reduce((s, d) => s + d.spend, 0);
  const trendPct = prev7Spend > 0 ? ((last7Spend - prev7Spend) / prev7Spend) * 100 : 0;

  const handleSaveOps = () => {
    const val = parseFloat(opsInput);
    if (!isNaN(val)) {
      updateOpsCost(label, val);
    }
    setEditingOps(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("group", group)}
          className="p-1.5 rounded hover:bg-accent/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <div>
          <h2 className="text-2xl font-semibold">{label}</h2>
          <p className="text-sm text-muted-foreground">
            {group} — CID {acctConfig?.cid ?? "N/A"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">Spend MTD</span>
          <div className="text-lg font-semibold mt-0.5 tabular-nums">{fmtEur(spend)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">À facturer</span>
          <div className="text-lg font-semibold mt-0.5 tabular-nums">{fmtEur(totalInvoice)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">Coût Ops</span>
          <div className="text-lg font-semibold mt-0.5 tabular-nums flex items-center gap-1">
            {editingOps ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={opsInput}
                  onChange={(e) => setOpsInput(e.target.value)}
                  className="w-24 bg-background border border-border rounded px-2 py-0.5 text-sm tabular-nums"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveOps()}
                />
                <button onClick={handleSaveOps} className="p-1 hover:bg-accent/50 rounded">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </button>
              </div>
            ) : (
              <>
                <span className={currentOpsCost !== null ? "" : "text-muted-foreground text-sm"}>
                  {currentOpsCost !== null ? fmtEur(currentOpsCost) : "À renseigner"}
                </span>
                <button
                  onClick={() => {
                    setEditingOps(true);
                    setOpsInput(currentOpsCost?.toString() ?? "");
                  }}
                  className="p-0.5 hover:bg-accent/50 rounded"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">Profit</span>
          <div className={`text-lg font-semibold mt-0.5 tabular-nums ${
            profit !== null ? (profit >= 0 ? "text-emerald-500" : "text-red-500") : "text-muted-foreground"
          }`}>
            {profit !== null ? fmtEur(profit) : "—"}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">Tendance 7j</span>
          <div className={`text-lg font-semibold mt-0.5 tabular-nums ${
            trendPct >= 0 ? "text-emerald-500" : "text-red-500"
          }`}>
            {trendPct >= 0 ? "+" : ""}{trendPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">Clicks</span>
          <div className="text-lg font-semibold mt-0.5 tabular-nums">{fmtK(clicks)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">Impressions</span>
          <div className="text-lg font-semibold mt-0.5 tabular-nums">{fmtK(impressions)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">CPC moyen</span>
          <div className="text-lg font-semibold mt-0.5 tabular-nums">{fmtEur(cpc)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <span className="text-[10px] text-muted-foreground uppercase">CTR</span>
          <div className="text-lg font-semibold mt-0.5 tabular-nums">{fmtPct(ctr)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cumulative spend */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Spend cumulé</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cumData}>
              <defs>
                <linearGradient id="gradAcct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area type="monotone" dataKey="cumSpend" stroke={color} fill="url(#gradAcct)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Daily spend bars */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Dépense journalière</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cumData}>
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
              <Bar dataKey="spend" fill={color} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clicks + Conversions trend */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Clicks & Conversions</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={cumData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
            <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={false} name="Conversions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily detail table */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Détail journalier</h3>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground">Date</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Spend</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Clicks</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Impr.</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Conv.</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">CPC</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-2 tabular-nums">{d.date}</td>
                  <td className="py-2 text-right tabular-nums">{fmtEur(d.spend)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtK(d.clicks)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtK(d.impressions)}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(d.conversions, 0)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtEur(d.cpc)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtPct(d.ctr)}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="font-semibold border-t border-border">
                <td className="py-2">Total</td>
                <td className="py-2 text-right tabular-nums">{fmtEur(spend)}</td>
                <td className="py-2 text-right tabular-nums">{fmtK(clicks)}</td>
                <td className="py-2 text-right tabular-nums">{fmtK(impressions)}</td>
                <td className="py-2 text-right tabular-nums">{fmt(conversions, 0)}</td>
                <td className="py-2 text-right tabular-nums">{fmtEur(cpc)}</td>
                <td className="py-2 text-right tabular-nums">{fmtPct(ctr)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
