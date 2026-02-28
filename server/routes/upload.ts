import { Router } from "express";
import multer from "multer";
import pool from "../db.js";
import { upsertDailyData } from "../lib/upsert.js";

export const uploadRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/upload
// Upload a JSON file with daily data
uploadRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const content = req.file.buffer.toString("utf-8");
    let rows: Record<string, unknown>[];

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
      const processed = await upsertDailyData(client, rows as any);
      await client.query("COMMIT");
      res.json({ success: true, upserted: processed, message: `${processed} rows imported` });
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
