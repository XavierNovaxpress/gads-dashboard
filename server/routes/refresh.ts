import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { upsertDailyData } from "../lib/upsert.js";

export const refreshRouter = Router();

const WindsorRowSchema = z.object({
  date: z.string(),
  spend: z.coerce.number(),
  clicks: z.coerce.number().int(),
  impressions: z.coerce.number().int(),
  conversions: z.coerce.number(),
  average_cpc: z.coerce.number(),
  ctr: z.coerce.number(),
  account_name: z.string(),
});

const WindsorResponseSchema = z.object({
  data: z.array(WindsorRowSchema).optional().default([]),
});

type WindsorRow = z.infer<typeof WindsorRowSchema>;

// POST /api/refresh?month=2026-02
// Fetches data from Windsor.ai API and upserts into database
refreshRouter.post("/", async (req, res) => {
  try {
    const apiKey = process.env.WINDSOR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "WINDSOR_API_KEY not configured" });
    }

    // Determine date range
    const now = new Date();
    const monthParam = req.query.month as string;
    let year: number, month: number;

    if (monthParam) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
        return res.status(400).json({ error: "Invalid month format, expected YYYY-MM" });
      }
      [year, month] = monthParam.split("-").map(Number);
    } else {
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
    // Last day of month or today if current month
    const lastDay = new Date(year, month, 0).getDate();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const endDay = isCurrentMonth ? now.getDate() : lastDay;
    const dateTo = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    console.log(`Refreshing data from Windsor.ai: ${dateFrom} to ${dateTo}`);

    // Call Windsor.ai API
    const windsorUrl = new URL("https://connectors.windsor.ai/google_ads");
    windsorUrl.searchParams.set("api_key", apiKey);
    windsorUrl.searchParams.set("date_from", dateFrom);
    windsorUrl.searchParams.set("date_to", dateTo);
    windsorUrl.searchParams.set("fields", "date,account_name,spend,clicks,impressions,conversions,average_cpc,ctr");

    const windsorRes = await fetch(windsorUrl.toString());
    if (!windsorRes.ok) {
      const errText = await windsorRes.text();
      console.error("Windsor API error:", errText);
      return res.status(502).json({ error: "Windsor API error" });
    }

    const windsorJson = await windsorRes.json();
    const parsed = WindsorResponseSchema.safeParse(windsorJson);
    if (!parsed.success) {
      console.error("Windsor response validation failed:", parsed.error.message);
      return res.status(502).json({ error: "Invalid response from Windsor API" });
    }
    const rows: WindsorRow[] = parsed.data.data;

    if (rows.length === 0) {
      return res.json({ success: true, message: "No data returned from Windsor", upserted: 0 });
    }

    // Filter out rows with no account_name or no spend
    const validRows = rows.filter(
      (r) => r.account_name && r.date && r.spend !== undefined
    );

    // Upsert into database
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const processed = await upsertDailyData(client, validRows);
      await client.query("COMMIT");

      console.log(`Windsor refresh complete: ${processed} rows upserted for ${dateFrom} to ${dateTo}`);
      res.json({
        success: true,
        upserted: processed,
        dateRange: { from: dateFrom, to: dateTo },
        accounts: [...new Set(validRows.map((r) => r.account_name))].length,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/refresh error:", err);
    res.status(500).json({ error: "Failed to refresh data from Windsor" });
  }
});
