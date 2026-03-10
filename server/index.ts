import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import { dataRouter } from "./routes/data.js";
import { opsRouter } from "./routes/ops.js";
import { uploadRouter } from "./routes/upload.js";
import { refreshRouter } from "./routes/refresh.js";
import { authRouter } from "./routes/auth.js";
import { mccRouter } from "./routes/mcc.js";
import { authMiddleware, adminOnly } from "./middleware/auth.js";
import pool from "./db.js";

// dotenv already loaded by db.ts import

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cookieParser());

const frontendUrl = process.env.FRONTEND_URL;
if (process.env.NODE_ENV === "production" && !frontendUrl) {
  console.warn("WARNING: FRONTEND_URL is not set. CORS will reject cross-origin requests in production.");
}
app.use(
  cors({
    origin: frontendUrl || (process.env.NODE_ENV === "production" ? false : true),
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// ─── Public routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

// ─── Protected routes ─────────────────────────────────────────────────────────
app.use("/api/data", authMiddleware, dataRouter);
app.use("/api/ops", authMiddleware, opsRouter);
app.use("/api/upload", authMiddleware, adminOnly, uploadRouter);
app.use("/api/refresh", authMiddleware, adminOnly, refreshRouter);
// MCC: reads available to all auth users, writes admin-only (enforced in router)
app.use("/api/mcc", authMiddleware, mccRouter);

// ─── Auto-migrate on startup ──────────────────────────────────────────────────
async function autoMigrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_data (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        spend NUMERIC(12,4) NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        impressions INTEGER NOT NULL DEFAULT 0,
        conversions NUMERIC(10,2) NOT NULL DEFAULT 0,
        average_cpc NUMERIC(10,4) NOT NULL DEFAULT 0,
        ctr NUMERIC(10,6) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, account_name)
      );
      CREATE INDEX IF NOT EXISTS idx_daily_data_date ON daily_data(date);
      CREATE INDEX IF NOT EXISTS idx_daily_data_account ON daily_data(account_name);

      CREATE TABLE IF NOT EXISTS ops_costs (
        id SERIAL PRIMARY KEY,
        account_label VARCHAR(255) NOT NULL,
        month VARCHAR(7) NOT NULL,
        cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(account_label, month)
      );
      CREATE INDEX IF NOT EXISTS idx_ops_costs_account_label ON ops_costs(account_label);

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS invitations (
        id SERIAL PRIMARY KEY,
        token VARCHAR(64) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        invited_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        used_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

      CREATE TABLE IF NOT EXISTS mcc_accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        windsor_api_key VARCHAR(512) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS managed_accounts (
        id SERIAL PRIMARY KEY,
        mcc_id INTEGER REFERENCES mcc_accounts(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        cid VARCHAR(20) NOT NULL DEFAULT '',
        gname VARCHAR(512),
        group_name VARCHAR(255) NOT NULL DEFAULT 'Autres',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(mcc_id, gname)
      );

      CREATE INDEX IF NOT EXISTS idx_managed_accounts_mcc ON managed_accounts(mcc_id);
    `);
    console.log("Auto-migration complete.");
  } finally {
    client.release();
  }
}

// ─── Seed first admin (only on first creation) ───────────────────────────────
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@gads.local").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.warn("WARNING: ADMIN_PASSWORD not set. Admin account will not be seeded.");
    return;
  }

  // Only create if admin doesn't exist yet
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO users (email, name, password_hash, is_admin) VALUES ($1, $2, $3, true)",
    [email, "Admin", hash]
  );
  console.log(`Admin created: ${email}`);
}

// ─── API 404 handler ──────────────────────────────────────────────────────────
app.all("/api/*", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Serve frontend in production ─────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ─── Start server with DB retry ───────────────────────────────────────────────
async function startWithRetry(retries = 5, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await autoMigrate();
      await seedAdmin();
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
      });
      return;
    } catch (err) {
      if (i < retries - 1) {
        console.warn(`DB connection attempt ${i + 1}/${retries} failed, retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.error("Failed to start after retries:", err);
        process.exit(1);
      }
    }
  }
}

startWithRetry();
