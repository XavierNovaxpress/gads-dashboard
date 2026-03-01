import type { PoolClient } from "pg";

export interface DailyDataRow {
  date: string;
  account_name: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  average_cpc: number;
  ctr: number;
}

export async function upsertDailyData(client: PoolClient, rows: DailyDataRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const dates: string[] = [];
  const accountNames: string[] = [];
  const spends: number[] = [];
  const clicks: number[] = [];
  const impressions: number[] = [];
  const conversions: number[] = [];
  const avgCpcs: number[] = [];
  const ctrs: number[] = [];

  for (const row of rows) {
    dates.push(row.date);
    accountNames.push(row.account_name);
    spends.push(row.spend || 0);
    clicks.push(row.clicks || 0);
    impressions.push(row.impressions || 0);
    conversions.push(row.conversions || 0);
    avgCpcs.push(row.average_cpc || 0);
    ctrs.push(row.ctr || 0);
  }

  const result = await client.query(
    `INSERT INTO daily_data (date, account_name, spend, clicks, impressions, conversions, average_cpc, ctr)
     SELECT * FROM unnest(
       $1::date[], $2::text[], $3::numeric[], $4::int[], $5::int[], $6::numeric[], $7::numeric[], $8::numeric[]
     )
     ON CONFLICT (date, account_name) DO UPDATE SET
       spend = EXCLUDED.spend,
       clicks = EXCLUDED.clicks,
       impressions = EXCLUDED.impressions,
       conversions = EXCLUDED.conversions,
       average_cpc = EXCLUDED.average_cpc,
       ctr = EXCLUDED.ctr`,
    [dates, accountNames, spends, clicks, impressions, conversions, avgCpcs, ctrs]
  );

  return result.rowCount ?? rows.length;
}
