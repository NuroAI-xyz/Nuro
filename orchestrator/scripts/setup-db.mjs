// One-off: apply every drizzle/*.sql migration (in filename order) to DATABASE_URL.
// Idempotent (all statements use IF [NOT] EXISTS). Run from the orchestrator dir:
//   node scripts/setup-db.mjs
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const dir = fileURLToPath(new URL("../drizzle/", import.meta.url));
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sql = postgres(url, { prepare: false, connect_timeout: 15 });

try {
  for (const file of files) {
    await sql.unsafe(readFileSync(dir + file, "utf8"));
    console.log(`applied ${file}`);
  }
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name`;
  console.log("OK - public tables:", tables.map((t) => t.table_name).join(", "));
} catch (err) {
  console.error("DB setup failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
