import pool from "./db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DataRow {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  average_cpc: number;
  ctr: number;
  account_name: string;
}

async function seed() {
  // Try to read mtd.json from project root or data/ folder
  const possiblePaths = [
    path.join(__dirname, "..", "data", "mtd.json"),
    path.join(__dirname, "..", "mtd.json"),
  ];

  let data: DataRow[] | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      data = JSON.parse(fs.readFileSync(p, "utf-8"));
      console.log(`Loaded data from ${p}: ${data!.length} rows`);
      break;
    }
  }

  if (!data) {
    console.error("No mtd.json found. Place it in data/ or project root.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of data) {
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
    }
    await client.query("COMMIT");
    console.log(`Seeded ${data.length} rows.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
