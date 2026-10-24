/**
 * Everything we hold on one Super 32 entrant: field/seed line, today's bouts, national-event
 * bouts, state placings, NC profile. Searches both name orders (Flo flips some, "Cano Austin").
 *   npx tsx --env-file=.env.local scripts/super32-live/who.ts "First Last" [ST] [flo.csv]
 */
import fs from "node:fs"
import { Client } from "pg"

async function main() {
  const [full, st, flo] = process.argv.slice(2)
  const parts = full!.trim().split(/\s+/)
  const a = parts.join(" "), b = [parts.at(-1), ...parts.slice(0, -1)].join(" ")
  const pats = [`%${a}%`, `%${b}%`]
  const field = fs.readFileSync("scripts/data/super32-field-2026.csv", "utf8").split("\n").filter((l) => [a, b].some((n) => l.toLowerCase().includes(n.toLowerCase())))
  console.log("FIELD", field.join(" | ") || "none")
  if (flo) {
    const rows = fs.readFileSync(flo, "utf8").split("\n").filter((l) => [a, b].some((n) => l.toLowerCase().includes(n.toLowerCase())) && !/BYE/.test(l))
    for (const r of rows) console.log("TODAY", r.replace(/"=""/g, "").replace(/"""/g, "").split(",").slice(1, 9).join(", "))
  }
  const c = new Client({ connectionString: (process.env.POSTGRES_URL_NON_POOLING ?? "").replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } })
  await c.connect()
  const nat = await c.query(`select year, event_name, weight_class, round, athlete_name, athlete_club, win, opponent_name, opponent_club, win_type, score from other_tournament_bouts
    where (athlete_name ilike any($1)) and not coalesce(is_bye,false) and source_file is distinct from 'super32-2026-live.csv' order by event_date nulls last, year`, [pats])
  for (const r of nat.rows) console.log("NAT", r.year, r.event_name, r.weight_class, r.round, r.athlete_club ?? "", r.win ? "W" : "L", r.opponent_name, r.opponent_club ?? "", r.win_type ?? "", r.score ?? "")
  // State rows spell first names loosely ("Vlad", "Vladmimir"), so with a state given, match the surname alone.
  const surname = `%${parts.at(-1)} %`, surnameLast = `% ${parts.at(-1)}`
  const pl = st
    ? await c.query(`select season, state, association, classification, weight, place, school_raw, grade, grad_year, wrestler_name from state_tournament_placers
        where state = $1 and (wrestler_name ilike $2 or wrestler_name ilike $3 or wrestler_name ilike any($4)) order by season`, [st, surnameLast, surname, pats])
    : await c.query(`select season, state, association, classification, weight, place, school_raw, grade, grad_year, wrestler_name from state_tournament_placers
        where wrestler_name ilike any($1) order by season`, [pats])
  for (const r of pl.rows) console.log("STATE", r.wrestler_name, "·", r.season, r.state, r.association, r.classification, r.weight, r.place ? `place ${r.place}` : "qualified", r.school_raw ?? "", r.grade ? `gr ${r.grade}` : "", r.grad_year ?? "")
  const ath = await c.query(`select id, name, highschool, graduationyear from athletes where name ilike any($1)`, [pats])
  for (const r of ath.rows) console.log("PROFILE", r.id, r.name, r.highschool ?? "", r.graduationyear ?? "")
  await c.end()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
