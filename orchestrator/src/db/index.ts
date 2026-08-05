import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

// `prepare: false` keeps us compatible with Supabase's transaction pooler
// (pgbouncer on port 6543), which does not support prepared statements.
const client = postgres(env.databaseUrl, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
