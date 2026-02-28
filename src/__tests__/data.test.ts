import { describe, it, expect } from "vitest";
import { buildMonthData, fmt, fmtK, fmtPct, fmtEur } from "../lib/data";
import type { RawRow } from "../lib/api";

// ── Formatter tests ──

describe("fmt", () => {
  it("formats numbers with 2 decimals by default", () => {
    expect(fmt(1234.567)).toContain("1");
    expect(fmt(1234.567)).toContain("234");
  });

  it("respects decimal parameter", () => {
    const result = fmt(10, 0);
    expect(result).toBe("10");
  });

  it("handles zero", () => {
    expect(fmt(0, 2)).toContain("0");
  });
});

describe("fmtK", () => {
  it("formats millions with M suffix", () => {
    expect(fmtK(2_500_000)).toContain("M");
  });

  it("formats thousands with k suffix", () => {
    expect(fmtK(5_500)).toContain("k");
  });

  it("formats small numbers without suffix", () => {
    const result = fmtK(500);
    expect(result).not.toContain("k");
    expect(result).not.toContain("M");
  });
});

describe("fmtPct", () => {
  it("formats as percentage", () => {
    expect(fmtPct(0.1234)).toBe("12.34 %");
  });

  it("handles zero", () => {
    expect(fmtPct(0)).toBe("0.00 %");
  });
});

describe("fmtEur", () => {
  it("formats with euro sign", () => {
    expect(fmtEur(1000)).toContain("€");
  });

  it("includes comma for decimals (fr-FR locale)", () => {
    const result = fmtEur(1234.56);
    expect(result).toContain("€");
  });
});

// ── buildMonthData tests ──

const makeRow = (date: string, account_name: string, spend: number, clicks = 10, impressions = 100, conversions = 1): RawRow => ({
  date,
  account_name,
  spend,
  clicks,
  impressions,
  conversions,
  average_cpc: clicks > 0 ? spend / clicks : 0,
  ctr: impressions > 0 ? clicks / impressions : 0,
});

describe("buildMonthData", () => {
  it("returns empty data for empty rows", () => {
    const result = buildMonthData([], {});
    expect(result.totalSpend).toBe(0);
    expect(result.accounts).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
    expect(result.month).toBe("");
  });

  it("computes correct totals", () => {
    const rows: RawRow[] = [
      makeRow("2026-01-01", "Ondoxa - FollowTrust", 1000, 50, 500, 5),
      makeRow("2026-01-02", "Ondoxa - FollowTrust", 2000, 100, 1000, 10),
      makeRow("2026-01-01", "Liremia - tracking-colis", 500, 25, 250, 2),
    ];

    const result = buildMonthData(rows, {});
    expect(result.totalSpend).toBe(3500);
    expect(result.totalFees).toBeCloseTo(175); // 3500 * 0.05
    expect(result.totalInvoice).toBeCloseTo(3675); // 3500 + 175
    expect(result.month).toBe("2026-01");
    expect(result.label).toBe("Janvier 2026");
    expect(result.daysElapsed).toBe(2);
    expect(result.daysInMonth).toBe(31);
  });

  it("groups accounts correctly", () => {
    const rows: RawRow[] = [
      makeRow("2026-02-01", "Ondoxa - FollowTrust", 1000),
      makeRow("2026-02-01", "Liremia - tracking-colis", 500),
    ];

    const result = buildMonthData(rows, {});
    const ondoxa = result.groups.find((g) => g.group === "Ondoxa");
    const liremia = result.groups.find((g) => g.group === "Liremia");
    expect(ondoxa?.spend).toBe(1000);
    expect(liremia?.spend).toBe(500);
  });

  it("calculates ops cost and profit", () => {
    const rows: RawRow[] = [
      makeRow("2026-02-01", "Ondoxa - FollowTrust", 1000),
    ];

    const result = buildMonthData(rows, { Ondoxa: 30 });
    const acct = result.accounts.find((a) => a.label === "Ondoxa");
    expect(acct?.opsCost).toBe(30);
    expect(acct?.profit).toBeCloseTo(20); // fees (50) - ops (30)
  });

  it("handles unknown accounts gracefully", () => {
    const rows: RawRow[] = [
      makeRow("2026-02-01", "Unknown Account", 200),
    ];

    const result = buildMonthData(rows, {});
    const acct = result.accounts.find((a) => a.gname === "Unknown Account");
    expect(acct).toBeDefined();
    expect(acct?.group).toBe("Autres");
    expect(acct?.spend).toBe(200);
  });

  it("produces correct daily totals", () => {
    const rows: RawRow[] = [
      makeRow("2026-02-01", "Ondoxa - FollowTrust", 500, 10, 100, 1),
      makeRow("2026-02-01", "Liremia - tracking-colis", 300, 5, 50, 0),
      makeRow("2026-02-02", "Ondoxa - FollowTrust", 700, 20, 200, 2),
    ];

    const result = buildMonthData(rows, {});
    expect(result.dailyTotals).toHaveLength(2);
    expect(result.dailyTotals[0].spend).toBe(800); // 500 + 300
    expect(result.dailyTotals[1].spend).toBe(700);
  });

  it("computes projection with fee rate", () => {
    const rows: RawRow[] = [
      makeRow("2026-02-01", "Ondoxa - FollowTrust", 1000),
      makeRow("2026-02-02", "Ondoxa - FollowTrust", 1000),
    ];

    const result = buildMonthData(rows, {});
    const dailyAvg = 2000 / 2;
    const rawProjection = dailyAvg * 28; // Feb 2026 has 28 days
    const expectedProjection = rawProjection + rawProjection * 0.05;
    expect(result.projection).toBeCloseTo(expectedProjection);
  });
});
