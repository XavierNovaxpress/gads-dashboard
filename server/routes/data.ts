import { Router } from "express";
import pool from "../db.js";

export const dataRouter = Router();

// GET /api/data?month=2026-02
// Returns all daily data for a given month
dataRouter.get("/", async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const [year, m] = month.split("-").map(Number);
    const startDate = `${year}-${String(m).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(m + 1).padStart(2, "0")}-01`;

    const result = await pool.query(
      `SELECT date::text, account_name, spend::float, clicks, impressions,
              conversions::float, average_cpc::float, ctr::float
       FROM daily_data
       WHERE date >= $1 AND date < $2
       ORDER BY date, account_name`,
      [startDate, m === 12 ? `${year + 1}-01-01` : endDate]
    );

    res.json({ month, rows: result.rows, count: result.rowCount });
  } catch (err) {
    console.error("GET /api/data error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// GET /api/data/months
// Returns list of available months
dataRouter.get("/months", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as month
       FROM daily_data
       ORDER BY month DESC`
    );
    res.json({ months: result.rows.map((r: { month: string }) => r.month) });
  } catch (err) {
    console.error("GET /api/data/months error:", err);
    res.status(500).json({ error: "Failed to fetch months" });
  }
});

// GET /api/data/range?from=2024-06&to=2026-02
// Returns monthly aggregates for a date range
dataRouter.get("/range", async (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!from || !to) {
      return res.status(400).json({ error: "from and to query params required (YYYY-MM)" });
    }

    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    const startDate = `${fy}-${String(fm).padStart(2, "0")}-01`;
    // End is first day of month after "to"
    const endMonth = tm === 12 ? 1 : tm + 1;
    const endYear = tm === 12 ? ty + 1 : ty;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const result = await pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') as month,
              account_name,
              SUM(spend)::float as spend,
              SUM(clicks)::int as clicks,
              SUM(impressions)::int as impressions,
              SUM(conversions)::float as conversions
       FROM daily_data
       WHERE date >= $1 AND date < $2
       GROUP BY month, account_name
       ORDER BY month, account_name`,
      [startDate, endDate]
    );

    res.json({ from, to, rows: result.rows, count: result.rowCount });
  } catch (err) {
    console.error("GET /api/data/range error:", err);
    res.status(500).json({ error: "Failed to fetch range data" });
  }
});

// POST /api/data
// Bulk upsert daily data rows
dataRouter.post("/", async (req, res) => {
  try {
    const rows = req.body.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows array required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let upserted = 0;
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
          [row.date, row.account_name, row.spend, row.clicks, row.impressions, row.conversions, row.average_cpc, row.ctr]
        );
        upserted++;
      }
      await client.query("COMMIT");
      res.json({ success: true, upserted });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/data error:", err);
    res.status(500).json({ error: "Failed to upsert data" });
  }
});
