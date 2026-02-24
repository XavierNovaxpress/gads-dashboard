import pool from "./db.js";

async function migrate() {
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
      CREATE INDEX IF NOT EXISTS idx_daily_data_date_account ON daily_data(date, account_name);

      CREATE TABLE IF NOT EXISTS ops_costs (
        id SERIAL PRIMARY KEY,
        account_label VARCHAR(255) NOT NULL,
        month VARCHAR(7) NOT NULL,
        cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(account_label, month)
      );

      CREATE INDEX IF NOT EXISTS idx_ops_costs_month ON ops_costs(month);
    `);
    console.log("Migration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
