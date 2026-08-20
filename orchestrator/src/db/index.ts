import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

// `prepare: false` keeps us compatible with Supabase's transaction pooler
// (pgbouncer on port 6543), which does not support prepared statements.
//
// The timeouts below are what stop a paused/restarted Postgres (e.g. Supabase
// auto-pausing the free tier) from *wedging the whole process*: without them a
// query on a dead connection hangs forever, every request piles up behind it,
// and the event loop looks alive (memory held) while serving nothing but 15s
// timeouts / 502s. With them, dead connections fail fast and get recycled, so
// requests return promptly and the pool self-heals once the DB is back.
const client = postgres(env.databaseUrl, {
  prepare: false,
  connect_timeout: 10, // seconds to establish a connection before failing
  idle_timeout: 20, // close idle connections after 20s
  max_lifetime: 60 * 30, // recycle any connection after 30 min
  // Never let a stray connection-level error take down the process; the pool
  // reconnects on the next query.
  onnotice: () => {},
});

// postgres-js can emit errors on the underlying connection when the DB goes
// away. Swallow-and-log them so an unhandled 'error' can't crash the app; the
// next query transparently opens a fresh connection.
process.on("unhandledRejection", (reason) => {
  console.error("[db] unhandledRejection:", reason);
});

export const db = drizzle(client, { schema });
export { schema };
