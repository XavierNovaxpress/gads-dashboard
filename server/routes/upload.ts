import { Router } from "express";
import multer from "multer";
import pool from "../db.js";

export const uploadRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

interface DataRow {
  date: string;
  account_name: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  average_cpc: number;
  ctr: number;
}

// POST /api/upload
// Upload a JSON file with daily data
uploadRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const content = req.file.buffer.toString("utf-8");
    let rows: DataRow[];

    try {
      rows = JSON.parse(content);
    } catch {
      return res.status(400).json({ error: "Invalid JSON file" });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "JSON must be a non-empty array" });
    }

    // Validate first row
    const required = ["date", "account_name", "spend", "clicks", "impressions", "conversions"];
    for (const key of required) {
      if (!(key in rows[0])) {
        return res.status(400).json({ error: `Missing field: ${key}` });
      }
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
        upserted++;
      }
      await client.query("COMMIT");
      res.json({ success: true, upserted, message: `${upserted} rows imported` });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/upload error:", err);
    res.status(500).json({ error: "Failed to process upload" });
  }
});
