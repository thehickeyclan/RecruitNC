/**
 * Reads scripts/womens-2026-state-results-raw.txt and outputs SQL INSERTs
 * for wrestling_nchsaa_results (women's 2026 state championship placers).
 * Run: node scripts/generate-womens-2026-nchsaa-sql.js > scripts/supabase-insert-womens-2026-state-results.sql
 */
const fs = require("fs");
const path = require("path");

const rawPath = path.join(__dirname, "womens-2026-state-results-raw.txt");
const raw = fs.readFileSync(rawPath, "utf8");

function escapeSql(s) {
  return (s ?? "").replace(/'/g, "''");
}

const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
const rows = [];
let classification = "";
let weightClass = "";

for (const line of lines) {
  const headerMatch = line.match(/^(\d-4A|5A|6A|7A|8A)\s*-\s*(\d+)$/);
  if (headerMatch) {
    classification = headerMatch[1];
    weightClass = headerMatch[2];
    continue;
  }
  const placeMatch = line.match(/^(1st|2nd|3rd|4th)\s+Place\s+-\s+(.+?)\s+of\s+(.+)$/);
  if (placeMatch) {
    const placeNum = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[placeMatch[1]];
    const wrestlerName = placeMatch[2].trim();
    const school = placeMatch[3].trim();
    rows.push({
      year: 2026,
      classification,
      weight_class: weightClass,
      place: placeNum,
      wrestler_name: wrestlerName,
      school,
    });
  }
}

const sqlEsc = (v) => (typeof v === "number" ? v : `'${escapeSql(String(v))}'`);
const values = rows
  .map(
    (r) =>
      `(${r.year}, ${sqlEsc(r.classification)}, ${sqlEsc(r.weight_class)}, ${r.place}, ${sqlEsc(r.wrestler_name)}, ${sqlEsc(r.school)})`
  )
  .join(",\n");

const outPath = path.join(__dirname, "supabase-insert-womens-2026-state-results.sql");
const sql = `-- Women's 2026 NCHSAA State Championship results (placers 1-4)
-- Table: wrestling_nchsaa_results
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- Optional: delete existing women's 2026 placers first (see below)

-- Delete existing women's 2026 placers (optional; uncomment to avoid duplicates)
-- DELETE FROM wrestling_nchsaa_results
-- WHERE year = 2026 AND place BETWEEN 1 AND 4
--   AND classification IN ('1-4A','5A','6A','7A','8A')
--   AND weight_class IN ('100','107','114','120','126','132','138','145','152','165','185','235');

INSERT INTO wrestling_nchsaa_results (year, classification, weight_class, place, wrestler_name, school)
VALUES
${values};
`;
fs.writeFileSync(outPath, sql, "utf8");
console.log("Wrote", outPath);
