import { type RawRow } from "./api";
import { ACCOUNTS, FEE_RATE, GROUP_ORDER, type AccountConfig } from "./accounts";
export type { AccountConfig } from "./accounts";

export type { RawRow } from "./api";

// ── Types ──
export interface AccountSummary {
  label: string;
  gname: string;
  group: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpc: number;
  ctr: number;
  fees: number;
  totalInvoice: number;
  opsCost: number | null;
  profit: number | null;
}

export interface GroupSummary {
  group: string;
  accounts: AccountSummary[];
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  fees: number;
  totalInvoice: number;
}

export interface DailyRow {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpc: number;
  ctr: number;
}

export interface MonthData {
  month: string; // "2026-02"
  label: string; // "Février 2026"
  daysInMonth: number;
  daysElapsed: number;
  accounts: AccountSummary[];
  groups: GroupSummary[];
  dailyTotals: DailyRow[];
  dailyByAccount: Record<string, DailyRow[]>;
  totalSpend: number;
  totalFees: number;
  totalInvoice: number;
  projection: number;
}

// ── Month names ──
const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const MONTH_NAMES_FULL: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
};

export const MONTH_NAMES_SHORT: Record<string, string> = {
  "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Aoû",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

export function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTH_NAMES_FULL[mo] || mo} ${y}`;
}

export function shortMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTH_NAMES_SHORT[mo] || mo} ${y.slice(2)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ── Aggregate raw data ──
function aggregateByAccount(rows: RawRow[]): Map<string, { spend: number; clicks: number; impressions: number; conversions: number }> {
  const map = new Map<string, { spend: number; clicks: number; impressions: number; conversions: number }>();
  for (const r of rows) {
    const existing = map.get(r.account_name);
    if (existing) {
      existing.spend += r.spend;
      existing.clicks += r.clicks;
      existing.impressions += r.impressions;
      existing.conversions += r.conversions;
    } else {
      map.set(r.account_name, { spend: r.spend, clicks: r.clicks, impressions: r.impressions, conversions: r.conversions });
    }
  }
  return map;
}

function aggregateByDate(rows: RawRow[]): DailyRow[] {
  const map = new Map<string, { spend: number; clicks: number; impressions: number; conversions: number }>();
  for (const r of rows) {
    const existing = map.get(r.date);
    if (existing) {
      existing.spend += r.spend;
      existing.clicks += r.clicks;
      existing.impressions += r.impressions;
      existing.conversions += r.conversions;
    } else {
      map.set(r.date, { spend: r.spend, clicks: r.clicks, impressions: r.impressions, conversions: r.conversions });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      spend: d.spend,
      clicks: d.clicks,
      impressions: d.impressions,
      conversions: d.conversions,
      cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
      ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
    }));
}

function aggregateByDateAndAccount(rows: RawRow[]): Record<string, DailyRow[]> {
  const grouped: Record<string, RawRow[]> = {};
  for (const r of rows) {
    const key = r.account_name;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }
  const result: Record<string, DailyRow[]> = {};
  for (const [acct, acctRows] of Object.entries(grouped)) {
    result[acct] = aggregateByDate(acctRows);
  }
  return result;
}

// ── Build month data ──
export function buildMonthData(
  rows: RawRow[],
  opsCosts: Record<string, number>,
  accountOverrides?: AccountConfig[]
): MonthData {
  if (rows.length === 0) {
    return {
      month: "", label: "", daysInMonth: 0, daysElapsed: 0,
      accounts: [], groups: [], dailyTotals: [], dailyByAccount: {},
      totalSpend: 0, totalFees: 0, totalInvoice: 0, projection: 0,
    };
  }

  const configAccounts = accountOverrides ?? ACCOUNTS;

  // Helpers scoped to the active account list
  function _getLabel(gname: string): string {
    const a = configAccounts.find((ac) => ac.gname === gname);
    return a ? a.label : gname;
  }
  function _getGroup(gname: string): string {
    const a = configAccounts.find((ac) => ac.gname === gname);
    return a ? a.group : "Autres";
  }

  const dates = rows.map((r) => r.date).sort();
  const firstDate = dates[0];
  const [yearStr, monthStr] = firstDate.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const totalDays = daysInMonth(year, month);
  const uniqueDates = new Set(dates);
  const elapsed = uniqueDates.size;

  const byAccount = aggregateByAccount(rows);
  const dailyTotals = aggregateByDate(rows);
  const dailyByAccount = aggregateByDateAndAccount(rows);

  // Build account summaries
  const accounts: AccountSummary[] = [];
  for (const acct of configAccounts) {
    if (!acct.gname) continue;
    const data = byAccount.get(acct.gname);
    const spend = data?.spend ?? 0;
    const clicks = data?.clicks ?? 0;
    const impressions = data?.impressions ?? 0;
    const conversions = data?.conversions ?? 0;
    const fees = spend * FEE_RATE;
    const totalInvoice = spend + fees;
    const oc = opsCosts[acct.label];
    const opsCost = oc !== undefined ? oc : null;
    const profit = opsCost !== null ? fees - opsCost : null;

    accounts.push({
      label: acct.label,
      gname: acct.gname,
      group: acct.group,
      spend, clicks, impressions, conversions,
      cpc: clicks > 0 ? spend / clicks : 0,
      ctr: impressions > 0 ? clicks / impressions : 0,
      fees, totalInvoice, opsCost, profit,
    });
  }

  // Also add accounts not in config but present in data
  for (const [gname, data] of byAccount) {
    if (!accounts.find((a) => a.gname === gname)) {
      const spend = data.spend;
      const fees = spend * FEE_RATE;
      accounts.push({
        label: _getLabel(gname),
        gname,
        group: _getGroup(gname),
        spend, clicks: data.clicks, impressions: data.impressions, conversions: data.conversions,
        cpc: data.clicks > 0 ? spend / data.clicks : 0,
        ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
        fees, totalInvoice: spend + fees, opsCost: null, profit: null,
      });
    }
  }

  // Derive group order from config accounts, preserving GROUP_ORDER priority
  const configGroupOrder = (() => {
    const seen = new Set<string>();
    const order: string[] = [];
    // First add GROUP_ORDER entries that exist in this account set
    for (const g of GROUP_ORDER) {
      if (configAccounts.some((a) => a.group === g)) { seen.add(g); order.push(g); }
    }
    // Then add any new groups from dynamic accounts
    for (const a of configAccounts) {
      if (!seen.has(a.group)) { seen.add(a.group); order.push(a.group); }
    }
    // Also include groups from data not in config
    for (const a of accounts) {
      if (!seen.has(a.group)) { seen.add(a.group); order.push(a.group); }
    }
    return order;
  })();

  // Build group summaries
  const groups: GroupSummary[] = [];
  for (const group of configGroupOrder) {
    const groupAccounts = accounts.filter((a) => a.group === group);
    if (groupAccounts.length === 0) continue;
    groups.push({
      group,
      accounts: groupAccounts,
      spend: groupAccounts.reduce((s, a) => s + a.spend, 0),
      clicks: groupAccounts.reduce((s, a) => s + a.clicks, 0),
      impressions: groupAccounts.reduce((s, a) => s + a.impressions, 0),
      conversions: groupAccounts.reduce((s, a) => s + a.conversions, 0),
      fees: groupAccounts.reduce((s, a) => s + a.fees, 0),
      totalInvoice: groupAccounts.reduce((s, a) => s + a.totalInvoice, 0),
    });
  }

  const totalSpend = accounts.reduce((s, a) => s + a.spend, 0);
  const totalFees = accounts.reduce((s, a) => s + a.fees, 0);
  const totalInvoice = accounts.reduce((s, a) => s + a.totalInvoice, 0);
  const dailyAvg = elapsed > 0 ? totalSpend / elapsed : 0;
  const projection = dailyAvg * totalDays;

  return {
    month: `${yearStr}-${monthStr}`,
    label: `${MONTH_NAMES_FR[month - 1]} ${year}`,
    daysInMonth: totalDays,
    daysElapsed: elapsed,
    accounts,
    groups,
    dailyTotals,
    dailyByAccount,
    totalSpend,
    totalFees,
    totalInvoice,
    projection: projection + projection * FEE_RATE,
  };
}

// ── Utils ──
export function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtK(n: number): string {
  if (n >= 1_000_000) return fmt(n / 1_000_000, 1) + " M";
  if (n >= 1_000) return fmt(n / 1_000, 1) + " k";
  return fmt(n, 0);
}

export function fmtPct(n: number): string {
  return (n * 100).toFixed(2) + " %";
}

export function fmtEur(n: number): string {
  return fmt(n, 2) + " €";
}

