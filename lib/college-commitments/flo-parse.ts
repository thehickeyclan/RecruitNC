/**
 * FloWrestling's commitment lists, parsed.
 *
 * Flo keeps one running article per recruiting class — "2026 NCAA Wrestling D1 Commitment List",
 * "2027 NCAA Wrestling D1 Commitment List", "Ranked High School Senior Women's Commitment List" —
 * and each is a single HTML table that gets edited in place all season. These are the only
 * published lists of where America's recruits are going, so they are the source; the parse has to
 * survive Flo editing the article, which it does by reading the table's own header row rather than
 * counting columns.
 *
 * Two shapes, because the men's and women's lists were built by different people:
 *   men's D1: COLLEGE | NAME | BIG BOARD RANK | HIGH SCHOOL | STATE | WEIGHT
 *   women's:  Name | Weight | Rank | High School | College | Division
 *
 * The women's list prints the state inside the school cell ("Troy Buchanan (MO)") and lists ranked
 * wrestlers who have not committed yet, with the college cell blank. Those rows are not
 * commitments and are dropped here - treating one as a commitment would invent a destination, and
 * treating its later appearance as a change would announce a flip that never happened.
 *
 * The class year is read from the page, never from the URL: the URL is a slug Flo chose once and
 * the article is edited for years. A title naming a year ("2027 NCAA ...") is that class; a title
 * naming a school stage ("Senior", "Junior") is resolved against our own calendar, which rolls
 * over every July (lib/class-years.ts).
 */
import { seniorClassYear } from "@/lib/class-years"

export type FloCommitmentRow = {
  /** The list this row came from, as Flo titles it. */
  listTitle: string
  listArticleId: string
  sourceUrl: string
  retrievedAt: string
  classYear: number
  gender: "Male" | "Female"
  wrestlerName: string
  college: string
  /** Flo's own division label, where its list prints one. Ours is resolved separately. */
  divisionLabel: string | null
  bigBoardRank: number | null
  highSchool: string | null
  state: string | null
  weight: string | null
}

export type FloCommitmentList = {
  articleId: string
  title: string
  sourceUrl: string
  retrievedAt: string
  classYear: number
  gender: "Male" | "Female"
  rows: FloCommitmentRow[]
  /** Rows the table held that are not commitments: ranked wrestlers with no college yet. */
  uncommittedRows: number
  /** Flo's own "Recent Commits" blurbs, logged as corroboration for a flip, never parsed as data. */
  recentCommitNotes: string[]
}

const unescape = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim()

/** A header cell reduced to letters, so "BIG BOARDRANK" and "Big Board Rank" are one key. */
const headerKey = (s: string) => unescape(s).toLowerCase().replace(/[^a-z]/g, "")

/**
 * Which column holds what.
 *
 * Matched on the header's own words rather than its position: Flo has already shipped these two
 * lists with the college first and the college fifth, and a parser counting columns would have
 * read every women's wrestler's weight as her destination.
 */
const FIELD_ALIASES = {
  college: ["college", "school", "commitment"],
  wrestlerName: ["name", "wrestler", "athlete"],
  bigBoardRank: ["bigboardrank", "rank", "bigboard"],
  highSchool: ["highschool", "hs"],
  state: ["state", "st"],
  weight: ["weight", "weightclass", "wt"],
  divisionLabel: ["division", "level", "div"],
} as const

type Field = keyof typeof FIELD_ALIASES

function mapHeader(cells: string[]): Partial<Record<Field, number>> {
  const out: Partial<Record<Field, number>> = {}
  cells.forEach((cell, i) => {
    const key = headerKey(cell)
    if (!key) return
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<[Field, readonly string[]]>) {
      if (out[field] != null) continue
      if (aliases.includes(key)) {
        out[field] = i
        return
      }
    }
  })
  return out
}

/**
 * The class this list is about.
 *
 * A four-digit year in the title is the class. Otherwise the title names a school stage, and the
 * stage is resolved against today: the senior class is whatever our own calendar says it is, so
 * the women's list does not need re-pointing every July.
 */
export function classYearFromTitle(title: string, now: Date = new Date()): number | null {
  const year = title.match(/\b(20\d{2})\b/)
  if (year) return Number(year[1])
  const senior = seniorClassYear(now)
  if (/\bsenior/i.test(title)) return senior
  if (/\bjunior/i.test(title)) return senior + 1
  if (/\bsophomore/i.test(title)) return senior + 2
  if (/\bfreshman/i.test(title)) return senior + 3
  return null
}

/** Flo's women's list writes "Troy Buchanan (MO)"; the men's gives school and state apart. */
function splitSchoolState(raw: string): { school: string | null; state: string | null } {
  const m = raw.match(/^(.*?)\s*\(\s*([A-Za-z]{2})\s*\)\s*$/)
  if (m) return { school: m[1]!.trim() || null, state: m[2]!.toUpperCase() }
  return { school: raw.trim() || null, state: null }
}

const cellsOf = (row: string): string[] =>
  [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => unescape(m[1] ?? ""))

/**
 * Parse one article's HTML.
 *
 * `gender` cannot be read from the page: the men's lists say "NCAA Wrestling D1" and nothing else,
 * so it comes from the catalog entry that chose the article (lib/college-commitments/flo-lists.ts).
 */
export function parseFloCommitmentList(
  html: string,
  source: { articleId: string; sourceUrl: string; gender: "Male" | "Female"; retrievedAt?: string; now?: Date },
): FloCommitmentList {
  const retrievedAt = source.retrievedAt ?? new Date().toISOString()
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = titleMatch ? unescape(titleMatch[1]!) : ""
  const classYear = classYearFromTitle(title, source.now)
  if (!classYear) throw new Error(`no class year in the page title: ${JSON.stringify(title)}`)

  const table = html.match(/<table[\s\S]*?<\/table>/i)
  if (!table) throw new Error("no table in the article - Flo changed the layout, or this is not a commitment list")
  const rows = [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0])
  if (!rows.length) throw new Error("the article's table holds no rows")

  const header = mapHeader(cellsOf(rows[0]!))
  for (const required of ["college", "wrestlerName"] as const) {
    if (header[required] == null) throw new Error(`the table has no ${required} column: ${cellsOf(rows[0]!).join(" | ")}`)
  }

  const at = (cells: string[], field: Field): string => {
    const i = header[field]
    return i == null ? "" : (cells[i] ?? "")
  }

  const out: FloCommitmentRow[] = []
  let uncommittedRows = 0
  for (const row of rows.slice(1)) {
    const cells = cellsOf(row)
    if (cells.length < 2) continue
    const wrestlerName = at(cells, "wrestlerName")
    const college = at(cells, "college")
    if (!wrestlerName) continue
    /* A ranked wrestler with no college is not a commitment. */
    if (!college) {
      uncommittedRows++
      continue
    }
    const schoolCell = at(cells, "highSchool")
    const split = splitSchoolState(schoolCell)
    const stateCell = at(cells, "state")
    const rank = at(cells, "bigBoardRank").replace(/[^0-9]/g, "")
    out.push({
      listTitle: title,
      listArticleId: source.articleId,
      sourceUrl: source.sourceUrl,
      retrievedAt,
      classYear,
      gender: source.gender,
      wrestlerName,
      college,
      divisionLabel: at(cells, "divisionLabel") || null,
      bigBoardRank: rank ? Number(rank) : null,
      highSchool: split.school,
      state: (stateCell || split.state || "").toUpperCase().slice(0, 2) || null,
      weight: at(cells, "weight") || null,
    })
  }

  /*
   * Flo's own "Recent Commits" bullets ("#48 Ivan Arias flips from Little Rock to Maryland") are
   * kept as text on the run log. They are the editor saying out loud what changed, which is worth
   * having next to our own diff - and they are prose, so they are never the data.
   */
  const recent = html.match(/Recent Commits?([\s\S]{0,4000}?)<\/ul>/i)
  const recentCommitNotes = recent
    ? [...recent[1]!.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => unescape(m[1] ?? "")).filter(Boolean)
    : []

  return { articleId: source.articleId, title, sourceUrl: source.sourceUrl, retrievedAt, classYear, gender: source.gender, rows: out, uncommittedRows, recentCommitNotes }
}
