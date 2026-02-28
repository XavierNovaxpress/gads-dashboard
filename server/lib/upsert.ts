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
  let processed = 0;
  for (const row of rows) {
    await client.query(
      `INSERT INTO daily_data (date, account_name, spend, clicks, impressions, conversions, average_cpc, ctr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (date, account_name) DO UPDATE SET
         spend = EXCLUDED.spend,
         clicks = EXCLUDED.clicks,
         impressions = EXCLUDED.impressions,
         conversions = EXCLUDED.conversions,
         average_cpc = EXCLUDED.average_cpc,
         ctr = EXCLUDED.ctr`,
      [
        row.date,
        row.account_name,
        row.spend || 0,
        row.clicks || 0,
        row.impressions || 0,
        row.conversions || 0,
        row.average_cpc || 0,
        row.ctr || 0,
      ]
    );
    processed++;
  }
  return processed;
}
