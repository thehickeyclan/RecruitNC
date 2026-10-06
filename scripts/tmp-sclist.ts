import fs from "fs"; import path from "path"
import { createClient } from "@supabase/supabase-js"
for (const f of [".env.local", ".env"]) { const p = path.join(process.cwd(), f); if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "") } }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const run = async () => {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from("state_tournament_placers").select("id,wrestler_name,school_raw,gender").eq("state", "SC").order("id").range(from, from + 999)
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  // One lookup per distinct person, not per placement row.
  const seen = new Map<string, any>()
  for (const r of rows) {
    const k = `${String(r.wrestler_name).toLowerCase().trim()}|${String(r.school_raw).toLowerCase().trim()}`
    if (!seen.has(k)) seen.set(k, r)
  }
  const people = [...seen.values()].map((r) => `${r.wrestler_name}~${r.school_raw}~${r.gender === "Girls" ? "g" : "b"}`)
  fs.writeFileSync("/tmp/sc-people.json", JSON.stringify(people))
  console.log("placer rows:", rows.length, "| distinct people:", people.length)
  const size = Math.ceil(people.length / 5)
  for (let i = 0; i < 5; i++) fs.writeFileSync(`/tmp/sc-batch-${i}.json`, JSON.stringify(people.slice(i * size, (i + 1) * size)))
  console.log("batch sizes:", [0,1,2,3,4].map(i => JSON.parse(fs.readFileSync(`/tmp/sc-batch-${i}.json`,"utf8")).length))
}
run()
