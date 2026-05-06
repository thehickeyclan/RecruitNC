/** Deep clone via JSON, converting bigint (Postgres/Supabase) to string so Response.json never throws. */
export function jsonSafeClone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data as unknown, (_k, v) => (typeof v === "bigint" ? v.toString() : v)))
}
