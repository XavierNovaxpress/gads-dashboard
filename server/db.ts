import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  console.error("On Railway: add a PostgreSQL service and link it to this app.");
  process.exit(1);
}

// In production, default to rejectUnauthorized: false to support providers
// (e.g. Railway) that use self-signed certs. Set DATABASE_SSL_REJECT_UNAUTHORIZED=true
// to enforce strict verification when your provider uses a trusted CA.
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized }
      : process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

export default pool;
