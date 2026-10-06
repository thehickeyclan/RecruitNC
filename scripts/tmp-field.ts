import fs from "fs"; import path from "path"
for (const f of [".env.local", ".env"]) { const p = path.join(process.cwd(), f); if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "") } }

const FIELD = [
  ["Tobin Mcnair", "Capital City Wrestling Club", "170", "Sr"],
  ["Aidan Szewczyk", "Combat Athletics", "135", "Sr"],
  ["Carson Worrick", "Combat Athletics", "170", "Sr"],
  ["Adrian Feliciano", "Darkhorse", "130", "Jr"],
  ["Carson Raper", "Darkhorse", "113", "So"],
  ["Jaxon Thomas", "Darkhorse", "120", "Sr"],
  ["Aiden Campbell", "Havelock High School", "152", "Sr"],
  ["Gavin Lopez", "NC United", "215", "Sr"],
  ["Xavier Bernthal", "OTM Walters Wrestling", "125B", "So"],
  ["Luke Padgett", "OTM Walters Wrestling", "215", "Sr"],
  ["Jacob Perry", "OTM Walters Wrestling", "160", "Jr"],
  ["Braylen Yates", "Prestige Worldwide", "185", "So"],
  ["Holton Quincy", "Raleigh Area Wolfpack", "135", "Sr"],
  ["Luke Richards", "Raleigh Area Wolfpack", "130B", "Jr"],
  ["Jake Amiott", "Sly Fox Wrestling Club NC", "152", "Jr"],
  ["Coy Deel", "West Craven High School", "140", "Sr"],
]

const run = async () => {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { loadPublicAthleteProfile } = await import("@/lib/load-public-athlete-profile")
  const { buildTournamentRows, buildNchsaaStateRows, isTocRow } = await import("@/lib/profile/tournament-rows")
  const { namesLikelySamePerson } = await import("@/lib/athlete-name-match")
  const sb = createAdminClient()

  const all: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from("athletes").select("id,name,graduationyear,highschool").order("id").range(from, from + 999)
    all.push(...(data ?? [])); if (!data || data.length < 1000) break
  }

  const out: any[] = []
  for (const [name, team, weight, grade] of FIELD) {
    const hits = all.filter((a) => namesLikelySamePerson(a.name, name))
    if (hits.length !== 1) { out.push({ name, team, weight, grade, note: hits.length ? `${hits.length} profiles` : "no profile" }); continue }
    const a = hits[0]
    const r = await loadPublicAthleteProfile(a.id)
    if (!r.ok) { out.push({ name, team, weight, grade, note: "load failed" }); continue }
    const x = r.athlete as any
    const rows = buildTournamentRows({
      otherTournamentBlocks: x.other_tournament_blocks, nhscaResults: x.nhsca_results, nhscaBouts: x.nhsca_bouts,
      super32Results: x.super32_results, super32Bouts: x.super32_bouts, fargoResults: x.fargo_results,
      nationalTeamResults: x.national_team_results, attachedEventBouts: x.attached_event_bouts,
    })
    const stateRows = buildNchsaaStateRows((x.nchsaa_profile ?? []) as never[], (x.nchsaa_state_bouts ?? []) as never[])
    // The product's own rule (lib/profile/credentials.ts): "Champion" is first, not unparseable.
    const place = (p: unknown) => {
      const text = String(p ?? "").trim()
      if (!text) return null
      if (/champion/i.test(text)) return 1
      const m = text.match(/^(\d+)(st|nd|rd|th)?\b/i)
      return m ? Number(m[1]) : null
    }

    const nchsaa = (x.nchsaa_profile ?? []).map((s: any) => ({ year: s.year, place: Number(s.place) || null, cls: s.classification }))
    const stateTitles = nchsaa.filter((s: any) => s.place === 1)
    const statePlacers = nchsaa.filter((s: any) => s.place && s.place >= 1 && s.place <= 8)

    const toc = rows.filter(isTocRow).map((t) => ({ year: t.year, place: place(t.placement) }))
    const tocTitles = toc.filter((t) => t.place === 1)
    const tocPlacers = toc.filter((t) => t.place && t.place <= 8)

    // All-American: top 8 at NHSCA Nationals or Fargo.
    const aa = rows
      .filter((t) => /nhsca nationals|fargo/i.test(t.event) && !/duals/i.test(t.event))
      .map((t) => ({ event: /fargo/i.test(t.event) ? "Fargo" : "NHSCA", year: t.year, place: place(t.placement) }))
      .filter((t) => t.place && t.place <= 8)

    out.push({
      name: a.name, team, weight, grade, grad: a.graduationyear, hs: a.highschool,
      stateTitles, statePlacers, tocTitles, tocPlacers, aa,
    })
  }
  fs.writeFileSync("/tmp/field.json", JSON.stringify(out, null, 1))
  for (const o of out) {
    if (o.note) { console.log(`${o.name.padEnd(18)} ${String(o.weight).padEnd(5)} — ${o.note}`); continue }
    const bits = [
      o.aa.length ? `${o.aa.length}× AA (${o.aa.map((x: any) => `${x.event} ${x.year} ${x.place}${x.place === 1 ? "st" : ""}`).join(", ")})` : "",
      o.stateTitles.length ? `${o.stateTitles.length}× state champ (${o.stateTitles.map((s: any) => s.year).join(", ")})` : "",
      o.statePlacers.length ? `${o.statePlacers.length}× state placer` : "",
      o.tocTitles.length ? `${o.tocTitles.length}× TOC champ` : "",
      o.tocPlacers.length ? `${o.tocPlacers.length}× TOC placer` : "",
    ].filter(Boolean)
    console.log(`${o.name.padEnd(18)} ${String(o.weight).padEnd(5)} ${String(o.grad ?? "?").padEnd(5)} ${bits.join(" · ") || "— nothing on file"}`)
  }
}
run()
