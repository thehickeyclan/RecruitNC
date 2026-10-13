/**
 * Reads the NWCA's newest poll stories and turns them into one ranking per college per poll.
 * Used by the weekly job and by scripts/college-team-rankings.ts (a dry run that prints what it
 * found and what it could not place). See team-rankings.ts for the rules.
 */
import {
  classifyPoll,
  parsePollTables,
  pollGender,
  pollMatcher,
  pollName,
  type PollSchool,
  type PollScope,
  type TeamRanking,
} from "@/lib/college-programs/team-rankings"

const SITEMAP = "https://nwcaonline.com/sitemap/sitemap_story_1.xml"
const UA = "RecruitNC team-rankings reader (weekly; contact via ncwrestlingunited.com)"

export type PollStory = { url: string; date: string }

const storyDate = (url: string): string | null => {
  const m = /\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//.exec(url)
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null
}

/** Poll stories on or after `since` (YYYY-MM-DD), newest first. */
export function pollStories(sitemapXml: string, since: string): PollStory[] {
  return [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => ({ url: m[1].trim(), date: storyDate(m[1]) }))
    .filter((s): s is PollStory => Boolean(s.date) && /poll|rank|top-25|top-20/i.test(s.url) && s.date! >= since)
    .sort((a, b) => b.date.localeCompare(a.date))
}

async function get(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xml" }, cache: "no-store" })
  if (!response.ok) throw new Error(`${response.status} for ${url}`)
  return response.text()
}

export type PollFound = { key: string; scope: PollScope; gender: "mens" | "womens"; kind: "poll" | "dual"; date: string; url: string; teams: number; unmatched: string[] }

export type RankingsBuild = { builtAt: string; rankings: TeamRanking[]; polls: PollFound[]; skipped: Array<{ url: string; why: string }> }

/**
 * The newest table for each poll. Stories are read newest first and a poll already filled is not
 * overwritten, so last week's poll never replaces this week's.
 */
export async function buildTeamRankings(schools: PollSchool[], since: string, fetchText: (url: string) => Promise<string> = get): Promise<RankingsBuild> {
  const stories = pollStories(await fetchText(SITEMAP), since)
  const polls = new Map<string, PollFound>()
  const rankings: TeamRanking[] = []
  const skipped: RankingsBuild["skipped"] = []

  for (const story of stories) {
    let html: string
    try {
      html = await fetchText(story.url)
    } catch (e) {
      skipped.push({ url: story.url, why: e instanceof Error ? e.message : "fetch failed" })
      continue
    }
    const title = (/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? story.url).replace(/\s+/g, " ")
    // Club wrestling (NCWA) and the mid-major poll are not the national ranking for any level here.
    if (/ncwa|mid-major/i.test(`${title} ${story.url}`)) continue
    const tables = parsePollTables(html)
    if (tables.length === 0) {
      skipped.push({ url: story.url, why: "no ranking table in the story (published as an image)" })
      continue
    }
    const gender = pollGender(`${title} ${story.url}`)
    for (const table of tables) {
      const found = classifyPoll(schools, table, gender)
      if (!found) {
        skipped.push({ url: story.url, why: `could not tell which level a ${table.rows.length}-team table ranks` })
        continue
      }
      const key = `${found.scope}|${gender}|${table.kind}`
      if (polls.has(key)) continue
      const match = pollMatcher(schools, found.scope, gender)
      const unmatched: string[] = []
      for (const row of table.rows) {
        const schoolId = match(row.team)
        if (!schoolId) {
          unmatched.push(row.team)
          continue
        }
        // The dual poll is kept in the record of polls found but the page shows the main poll.
        if (table.kind === "poll") {
          rankings.push({ schoolId, scope: found.scope, gender, rank: row.rank, of: table.rows.length, record: row.record, pollName: pollName(found.scope, gender), pollDate: story.date, sourceUrl: story.url })
        }
      }
      polls.set(key, { key, scope: found.scope, gender, kind: table.kind, date: story.date, url: story.url, teams: table.rows.length, unmatched })
    }
  }
  return { builtAt: new Date().toISOString(), rankings, polls: [...polls.values()], skipped }
}
