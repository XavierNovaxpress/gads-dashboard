import { Router } from "express";
import pool from "../db.js";

export const opsRouter = Router();

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// GET /api/ops?month=2026-02
// Returns ops costs for a given month
opsRouter.get("/", async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    if (!MONTH_RE.test(month)) {
      return res.status(400).json({ error: "Invalid month format, expected YYYY-MM" });
    }
    const result = await pool.query(
      `SELECT account_label, cost::float, updated_at
       FROM ops_costs
       WHERE month = $1
       ORDER BY account_label`,
      [month]
    );
    const costs: Record<string, number> = {};
    for (const row of result.rows) {
      costs[row.account_label] = row.cost;
    }
    res.json({ month, costs });
  } catch (err) {
    console.error("GET /api/ops error:", err);
    res.status(500).json({ error: "Failed to fetch ops costs" });
  }
});

// PUT /api/ops
// Upsert a single ops cost
opsRouter.put("/", async (req, res) => {
  try {
    const { account_label, month, cost } = req.body;
    if (!account_label || !month || cost === undefined) {
      return res.status(400).json({ error: "account_label, month, cost required" });
    }
    if (!MONTH_RE.test(month)) {
      return res.status(400).json({ error: "Invalid month format, expected YYYY-MM" });
    }
    await pool.query(
      `INSERT INTO ops_costs (account_label, month, cost, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (account_label, month) DO UPDATE SET
         cost = EXCLUDED.cost,
         updated_at = NOW()`,
      [account_label, month, cost]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/ops error:", err);
    res.status(500).json({ error: "Failed to update ops cost" });
  }
});
