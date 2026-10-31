/** Applies scripts/sql/super32-live.sql over the direct connection. */
import fs from "node:fs"
import { Client } from "pg"
async function main() {
  const c = new Client({ connectionString: (process.env.POSTGRES_URL_NON_POOLING ?? "").replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } })
  await c.connect()
  await c.query(fs.readFileSync("scripts/sql/super32-live.sql", "utf8"))
  await c.query("notify pgrst, 'reload schema'")
  const r = await c.query("select table_name from information_schema.tables where table_name like 'super32_live_%' order by 1")
  console.log(r.rows.map((x) => x.table_name))
  await c.end()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
