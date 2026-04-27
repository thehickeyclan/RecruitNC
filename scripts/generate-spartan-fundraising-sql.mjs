#!/usr/bin/env node
/**
 * Reads Spartan NCU athlete CSV → SQL INSERTs for public.spartan_fundraising_athletes
 * Usage: node scripts/generate-spartan-fundraising-sql.mjs [path/to.csv]
 * Default: scripts/data/spartan-ncu-athletes.csv
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function parseYear(classStr) {
  if (!classStr || typeof classStr !== "string") return null
  const m = classStr.match(/20\d{2}/)
  return m ? parseInt(m[0], 10) : null
}

function sanitizeLast(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 24)
}

/** First-name letters only, then first `len` chars — must match lib/spartan-fundraising-code.ts */
function sanitizeFirstPrefixForCode(firstName, len) {
  const letters = (firstName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
  if (!letters.length) return "X"
  return letters.slice(0, Math.max(1, len))
}

const MAX_PREFIX_LEN = 20

/** Must match `buildCollisionBasesByAthleteId` in lib/spartan-fundraising-code.ts */
function buildCollisionBasesByAthleteId(lastSan, members) {
  const sorted = [...members].sort((a, b) => String(a.id).localeCompare(String(b.id)))
  const firstNames = sorted.map((m) => m.firstName || "")
  const m = new Map()
  for (let L = 1; L <= MAX_PREFIX_LEN; L++) {
    const bases = firstNames.map((fn) => lastSan + sanitizeFirstPrefixForCode(fn, L))
    if (new Set(bases).size === sorted.length) {
      sorted.forEach((row, i) => m.set(row.id, bases[i]))
      return m
    }
  }
  sorted.forEach((row, i) => m.set(row.id, `${lastSan}V${i + 1}`))
  return m
}

function escapeSql(s) {
  if (s == null) return ""
  return String(s).replace(/'/g, "''")
}

const defaultCsv = path.join(__dirname, "data", "spartan-ncu-athletes.csv")
const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultCsv

const raw = fs.readFileSync(csvPath, "utf8")
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length)

const header = lines[0].split(",")
if (!header[0]?.toLowerCase().includes("last")) {
  console.error("Unexpected CSV header:", header[0])
  process.exit(1)
}

const rows = []
for (let i = 1; i < lines.length; i++) {
  const line = lines[i]
  const parts = line.split(",").map((p) => p.trim())
  if (parts.length < 3) continue
  const lastName = parts[0] || ""
  const firstName = parts[1] || ""
  const academicClass = parts[2] || ""
  const school = parts[3] || ""
  if (!lastName && !firstName) continue
  const gradYear = parseYear(academicClass)
  if (!gradYear) {
    console.warn("Skip row (no grad year):", lastName, firstName, academicClass)
    continue
  }
  const lastSan = sanitizeLast(lastName)
  if (!lastSan) {
    console.warn("Skip row (empty last):", lastName, firstName)
    continue
  }
  rows.push({
    id: `row-${i}`,
    lastName,
    firstName,
    gradYear,
    school: (school || "").slice(0, 120),
    lastSan,
    yy: String(gradYear).slice(-2),
  })
}

// Collision groups: same lastSan + gradYear — minimal first-name letter prefix (match lib)
const groupKey = (r) => `${r.lastSan}|${r.gradYear}`
const byKey = new Map()
for (const r of rows) {
  const k = groupKey(r)
  if (!byKey.has(k)) byKey.set(k, [])
  byKey.get(k).push(r)
}

const baseByRowId = new Map()
for (const [, group] of byKey) {
  if (group.length === 1) {
    baseByRowId.set(group[0].id, group[0].lastSan)
  } else {
    const sub = buildCollisionBasesByAthleteId(
      group[0].lastSan,
      group.map((g) => ({ id: g.id, firstName: g.firstName })),
    )
    for (const [id, b] of sub) baseByRowId.set(id, b)
  }
}

const codes = new Set()
const inserts = []

for (const r of rows) {
  const base = baseByRowId.get(r.id) ?? r.lastSan
  let code = `NCU-${base}-${r.yy}`
  let n = 2
  while (codes.has(code)) {
    code = `NCU-${base}${n}-${r.yy}`
    n++
  }
  codes.add(code)
  inserts.push({
    code,
    first_name: r.firstName || "",
    last_name: r.lastName,
    grad_year: r.gradYear,
    school: r.school,
  })
}

const outSql = path.join(__dirname, "spartan-fundraising-athletes-seed.sql")
const upsert = (r) => `INSERT INTO public.spartan_fundraising_athletes (code, first_name, last_name, grad_year, school, active) VALUES ('${escapeSql(r.code)}', '${escapeSql(r.first_name)}', '${escapeSql(r.last_name)}', ${r.grad_year}, ${r.school ? `'${escapeSql(r.school)}'` : "NULL"}, true)
ON CONFLICT (code) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, grad_year = EXCLUDED.grad_year, school = EXCLUDED.school, active = EXCLUDED.active;`

const sql = `-- Auto-generated from CSV — requires unique(code) on public.spartan_fundraising_athletes. Safe to re-run (upserts).
-- Source: ${path.basename(csvPath)}
-- Rows: ${inserts.length}

${inserts.map((r) => upsert(r)).join("\n\n")}

`

fs.writeFileSync(outSql, sql, "utf8")
console.log(`Wrote ${inserts.length} rows to ${outSql}`)
for (const r of inserts.slice(0, 5)) {
  console.log(`  ${r.code} — ${r.first_name} ${r.last_name} (${r.grad_year})`)
}
console.log(`  ...`)
