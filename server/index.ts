import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dataRouter } from "./routes/data.js";
import { opsRouter } from "./routes/ops.js";
import { uploadRouter } from "./routes/upload.js";
import { refreshRouter } from "./routes/refresh.js";
import pool from "./db.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3001");

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// API routes
app.use("/api/data", dataRouter);
app.use("/api/ops", opsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/refresh", refreshRouter);

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

// Auto-migrate on startup
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
    `);
    console.log("Auto-migration complete.");
  } finally {
    client.release();
  }
}

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

autoMigrate()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
