import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { adminOnly } from "../middleware/auth.js";

export const mccRouter = Router();

// ── Validation schemas ──────────────────────────────────────────────────────

const CreateMccSchema = z.object({
  name: z.string().min(1).max(255),
  windsor_api_key: z.string().min(1).max(512),
});

const CreateAccountSchema = z.object({
  label: z.string().min(1).max(255),
  cid: z.string().max(20).default(""),
  gname: z.string().max(512).nullable().default(null),
  group_name: z.string().min(1).max(255).default("Autres"),
  sort_order: z.number().int().default(0),
});

const UpdateAccountSchema = CreateAccountSchema.partial();

// ── MCC CRUD ────────────────────────────────────────────────────────────────

// GET /api/mcc — list all MCC accounts (hide api key)
mccRouter.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, created_at,
              LEFT(windsor_api_key, 6) || '...' AS windsor_api_key_preview
       FROM mcc_accounts
       ORDER BY created_at ASC`
    );
    res.json({ mccs: result.rows });
  } catch (err) {
    console.error("GET /api/mcc error:", err);
    res.status(500).json({ error: "Failed to list MCC accounts" });
  }
});

// POST /api/mcc — add a new MCC account
mccRouter.post("/", adminOnly, async (req, res) => {
  const parsed = CreateMccSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const { name, windsor_api_key } = parsed.data;
  try {
    const result = await pool.query(
      `INSERT INTO mcc_accounts (name, windsor_api_key) VALUES ($1, $2) RETURNING id, name, created_at`,
      [name, windsor_api_key]
    );
    res.status(201).json({ mcc: result.rows[0] });
  } catch (err) {
    console.error("POST /api/mcc error:", err);
    res.status(500).json({ error: "Failed to create MCC account" });
  }
});

// DELETE /api/mcc/:id — remove an MCC and its accounts
mccRouter.delete("/:id", adminOnly, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await pool.query("DELETE FROM mcc_accounts WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/mcc/:id error:", err);
    res.status(500).json({ error: "Failed to delete MCC account" });
  }
});

// ── Discovery ────────────────────────────────────────────────────────────────

// POST /api/mcc/:id/discover — call Windsor.ai to find accounts under this MCC
mccRouter.post("/:id/discover", adminOnly, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const mccResult = await pool.query(
      "SELECT windsor_api_key FROM mcc_accounts WHERE id = $1",
      [id]
    );
    if (mccResult.rows.length === 0) {
      return res.status(404).json({ error: "MCC not found" });
    }
    const apiKey = mccResult.rows[0].windsor_api_key as string;

    // Use last 7 days to discover active accounts
    const now = new Date();
    const dateTo = now.toISOString().slice(0, 10);
    const dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const url = new URL("https://connectors.windsor.ai/google_ads");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("date_from", dateFrom);
    url.searchParams.set("date_to", dateTo);
    url.searchParams.set("fields", "date,account_name,spend");

    const windsorRes = await fetch(url.toString());
    if (!windsorRes.ok) {
      const errText = await windsorRes.text();
      console.error("Windsor discover error:", errText);
      return res.status(502).json({ error: "Windsor API error during discovery" });
    }

    const json = await windsorRes.json();
    const rows: Array<{ account_name: string; spend: number }> = (json.data || []);

    // Deduplicate account names
    const seen = new Set<string>();
    const accounts: Array<{ gname: string; total_spend: number }> = [];
    for (const row of rows) {
      if (!row.account_name || seen.has(row.account_name)) continue;
      seen.add(row.account_name);
      const total = rows
        .filter((r) => r.account_name === row.account_name)
        .reduce((sum, r) => sum + (Number(r.spend) || 0), 0);
      accounts.push({ gname: row.account_name, total_spend: total });
    }

    // Sort by spend desc
    accounts.sort((a, b) => b.total_spend - a.total_spend);

    res.json({ accounts, dateRange: { from: dateFrom, to: dateTo } });
  } catch (err) {
    console.error("POST /api/mcc/:id/discover error:", err);
    res.status(500).json({ error: "Discovery failed" });
  }
});

// ── Managed Accounts ─────────────────────────────────────────────────────────

// GET /api/mcc/accounts — list all managed accounts across all MCCs
mccRouter.get("/accounts", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ma.id, ma.mcc_id, m.name AS mcc_name, ma.label, ma.cid,
              ma.gname, ma.group_name, ma.sort_order, ma.created_at
       FROM managed_accounts ma
       JOIN mcc_accounts m ON ma.mcc_id = m.id
       ORDER BY ma.mcc_id ASC, ma.sort_order ASC, ma.label ASC`
    );
    res.json({ accounts: result.rows });
  } catch (err) {
    console.error("GET /api/mcc/accounts error:", err);
    res.status(500).json({ error: "Failed to list accounts" });
  }
});

// POST /api/mcc/:id/accounts — add a managed account under an MCC
mccRouter.post("/:id/accounts", adminOnly, async (req, res) => {
  const mccId = parseInt(req.params.id as string, 10);
  if (isNaN(mccId)) return res.status(400).json({ error: "Invalid mcc id" });

  const parsed = CreateAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const { label, cid, gname, group_name, sort_order } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO managed_accounts (mcc_id, label, cid, gname, group_name, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (mcc_id, gname)
       DO UPDATE SET label = EXCLUDED.label, cid = EXCLUDED.cid,
                     group_name = EXCLUDED.group_name, sort_order = EXCLUDED.sort_order
       RETURNING *`,
      [mccId, label, cid, gname || null, group_name, sort_order]
    );
    res.status(201).json({ account: result.rows[0] });
  } catch (err) {
    console.error("POST /api/mcc/:id/accounts error:", err);
    res.status(500).json({ error: "Failed to add account" });
  }
});

// POST /api/mcc/:id/accounts/bulk — bulk upsert discovered accounts
mccRouter.post("/:id/accounts/bulk", adminOnly, async (req, res) => {
  const mccId = parseInt(req.params.id as string, 10);
  if (isNaN(mccId)) return res.status(400).json({ error: "Invalid mcc id" });

  const accounts = z.array(CreateAccountSchema).safeParse(req.body.accounts);
  if (!accounts.success) {
    return res.status(400).json({ error: accounts.error.message });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let count = 0;
    for (const acct of accounts.data) {
      await client.query(
        `INSERT INTO managed_accounts (mcc_id, label, cid, gname, group_name, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mcc_id, gname)
         DO UPDATE SET label = EXCLUDED.label, cid = EXCLUDED.cid,
                       group_name = EXCLUDED.group_name, sort_order = EXCLUDED.sort_order`,
        [mccId, acct.label, acct.cid, acct.gname || null, acct.group_name, acct.sort_order]
      );
      count++;
    }
    await client.query("COMMIT");
    res.json({ success: true, count });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/mcc/:id/accounts/bulk error:", err);
    res.status(500).json({ error: "Bulk upsert failed" });
  } finally {
    client.release();
  }
});

// PUT /api/mcc/accounts/:accountId — update a managed account
mccRouter.put("/accounts/:accountId", adminOnly, async (req, res) => {
  const accountId = parseInt(req.params.accountId as string, 10);
  if (isNaN(accountId)) return res.status(400).json({ error: "Invalid account id" });

  const parsed = UpdateAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const fields = parsed.data;
  const keys = Object.keys(fields) as Array<keyof typeof fields>;
  if (keys.length === 0) return res.status(400).json({ error: "No fields to update" });

  const setClauses = keys.map((k, i) => `${k === "group_name" ? "group_name" : k} = $${i + 2}`);
  const values = keys.map((k) => fields[k]);

  try {
    const result = await pool.query(
      `UPDATE managed_accounts SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
      [accountId, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });
    res.json({ account: result.rows[0] });
  } catch (err) {
    console.error("PUT /api/mcc/accounts/:id error:", err);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// DELETE /api/mcc/accounts/:accountId — remove a managed account
mccRouter.delete("/accounts/:accountId", adminOnly, async (req, res) => {
  const accountId = parseInt(req.params.accountId as string, 10);
  if (isNaN(accountId)) return res.status(400).json({ error: "Invalid account id" });
  try {
    await pool.query("DELETE FROM managed_accounts WHERE id = $1", [accountId]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/mcc/accounts/:id error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});
