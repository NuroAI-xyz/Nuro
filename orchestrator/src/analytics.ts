import { sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { registry } from "./registry.js";
import { env } from "./env.js";

/** Public, aggregate-only network analytics for the data dashboard.
 * Never exposes prompt/response content or per-user identity - only counts,
 * token volumes, and daily time series. */

export interface DayPoint {
  date: string; // YYYY-MM-DD (UTC)
}
export interface JobsDay extends DayPoint {
  native: number;
  browser: number;
}
export interface TokensDay extends DayPoint {
  tokens: number;
}
export interface SpeedDay extends DayPoint {
  tokPerSec: number;
}
export interface CountDay extends DayPoint {
  count: number;
}
export interface CumulativeDay extends DayPoint {
  total: number;
}

export interface NetworkOverview {
  totals: {
    tokensGenerated: number;
    jobsCompleted: number;
    settledUsd: number;
    registeredUsers: number;
  };
  live: {
    workersOnline: number;
    nativeOnline: number;
    browserOnline: number;
    busyNow: number;
    queued: number;
  };
  series: {
    jobsPerDay: JobsDay[];
    tokensPerDay: TokensDay[];
    speedPerDay: SpeedDay[];
    signupsPerDay: CountDay[];
    cumulativeUsers: CumulativeDay[];
  };
  generatedAt: string;
}

const WINDOW_DAYS = 30;

/** Build the last `days` UTC date keys (YYYY-MM-DD), oldest first. */
function dayAxis(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  const base = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(base - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

type Row = Record<string, unknown>;
async function rows(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result = (await db.execute(query)) as unknown;
  // postgres-js returns an array-like RowList; normalize to a plain array.
  return Array.isArray(result) ? (result as Row[]) : ((result as { rows?: Row[] }).rows ?? []);
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function getNetworkOverview(): Promise<NetworkOverview> {
  const axis = dayAxis(WINDOW_DAYS);
  const since = sql.raw(`now() - interval '${WINDOW_DAYS} days'`);

  const [
    totalsRows,
    jobsRows,
    tokensRows,
    speedRows,
    signupsRows,
    baseUsersRows,
  ] = await Promise.all([
    rows(sql`
      select
        (select coalesce(sum(completion_tokens), 0) from jobs where status = 'done')::bigint as tokens_generated,
        (select count(*) from jobs where status = 'done')::int as jobs_completed,
        (select coalesce(sum(amount_usd), 0) from earnings)::numeric as settled_usd,
        (select count(*) from users)::int as registered_users
    `),
    rows(sql`
      select to_char(date_trunc('day', j.created_at), 'YYYY-MM-DD') as d,
        count(*) filter (where w.worker_class = 'native')::int as native,
        count(*) filter (where w.worker_class = 'browser')::int as browser
      from jobs j
      left join workers w on j.worker_id = w.id
      where j.created_at >= ${since}
      group by 1
    `),
    rows(sql`
      select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d,
        coalesce(sum(completion_tokens), 0)::bigint as tokens
      from jobs
      where status = 'done' and created_at >= ${since}
      group by 1
    `),
    rows(sql`
      select to_char(date_trunc('day', completed_at), 'YYYY-MM-DD') as d,
        avg(completion_tokens / nullif(extract(epoch from (completed_at - started_at)), 0)) as tps
      from jobs
      where status = 'done' and started_at is not null and completed_at is not null
        and completed_at >= ${since}
      group by 1
    `),
    rows(sql`
      select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d,
        count(*)::int as count
      from users
      where created_at >= ${since}
      group by 1
    `),
    rows(sql`
      select count(*)::int as base from users where created_at < ${since}
    `),
  ]);

  const totalsRow = totalsRows[0] ?? {};
  const jobsMap = new Map(jobsRows.map((r) => [String(r.d), r]));
  const tokensMap = new Map(tokensRows.map((r) => [String(r.d), r]));
  const speedMap = new Map(speedRows.map((r) => [String(r.d), r]));
  const signupsMap = new Map(signupsRows.map((r) => [String(r.d), r]));

  const jobsPerDay: JobsDay[] = axis.map((date) => {
    const r = jobsMap.get(date);
    return { date, native: num(r?.native), browser: num(r?.browser) };
  });
  const tokensPerDay: TokensDay[] = axis.map((date) => ({
    date,
    tokens: num(tokensMap.get(date)?.tokens),
  }));
  const speedPerDay: SpeedDay[] = axis.map((date) => ({
    date,
    tokPerSec: Math.round(num(speedMap.get(date)?.tps) * 10) / 10,
  }));
  const signupsPerDay: CountDay[] = axis.map((date) => ({
    date,
    count: num(signupsMap.get(date)?.count),
  }));

  let running = num(baseUsersRows[0]?.base);
  const cumulativeUsers: CumulativeDay[] = signupsPerDay.map((d) => {
    running += d.count;
    return { date: d.date, total: running };
  });

  const counts = registry.counts();
  const floor = env.displayWorkerFloor;

  return {
    totals: {
      tokensGenerated: num(totalsRow.tokens_generated),
      jobsCompleted: num(totalsRow.jobs_completed),
      settledUsd: num(totalsRow.settled_usd),
      registeredUsers: num(totalsRow.registered_users),
    },
    live: {
      workersOnline: counts.total + floor,
      nativeOnline: counts.native + floor,
      browserOnline: counts.browser,
      busyNow: counts.busy,
      queued: registry.queuedCount(),
    },
    series: {
      jobsPerDay,
      tokensPerDay,
      speedPerDay,
      signupsPerDay,
      cumulativeUsers,
    },
    generatedAt: new Date().toISOString(),
  };
}
