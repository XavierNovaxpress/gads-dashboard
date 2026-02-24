import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  console.error("On Railway: add a PostgreSQL service and link it to this app.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
});

export default pool;
