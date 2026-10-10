/**
 * The public web, as a last resort and never as a record.
 *
 * Matt, 4 Oct 2026: our data is primary; anything from outside is shown with its source as a flag.
 * ChatGPT answered about Nolan McCarthy of Wyoming Seminary and we said "no records" — not because
 * it reads results better, but because every event it cited (Preseason Nationals, the men's
 * Journeymen World Classic, the U17 World Team Trials, National Prep) is one we have never
 * imported. That is a coverage gap, and a coach asking a reasonable question should not be told
 * nothing exists.
 *
 * The boundary matters more than the feature. A web result may answer a question; it may never
 * become a record. Nothing here is written to a table, counted toward a ranking or a star rating,
 * or used as an opponent credential — those rest on imported brackets, and a coach has to be able
 * to tell at a glance which claims we can stand behind. The labelling is applied in code rather
 * than asked of the model, because every time today that a rule was left to the model it was not
 * followed.
 *
 * When this fires it is also a to-do: the event it found is one we should be importing.
 */

export type WebWrestlerFindings = {
  summary: string
  /** Pages the answer actually drew on, deduplicated, tracking parameters stripped. */
  sources: string[]
}

const ENDPOINT = "https://api.openai.com/v1/responses"

/** Off with DATA_DAWG_WEB_SEARCH=0; otherwise on, and rare, because it runs only when we hold nothing. */
export function webSearchEnabled(): boolean {
  return process.env.DATA_DAWG_WEB_SEARCH !== "0" && Boolean(process.env.OPENAI_API_KEY)
}

function tidyUrl(raw: unknown): string | null {
  const text = String(raw ?? "").trim()
  if (!/^https?:\/\//i.test(text)) return null
  try {
    const url = new URL(text)
    for (const p of [...url.searchParams.keys()]) {
      // Trackwrestling links arrive with somebody's session in them; the profile id is enough.
      if (/^utm_|^ref$|^source$|^TIM$|^twSessionId$/i.test(p)) url.searchParams.delete(p)
    }
    return url.toString()
  } catch {
    return null
  }
}

/**
 * What the web says about one wrestler. Null when the search is off, fails, or finds nothing —
 * a failure here must read as "we did not find it", never as a claim about the wrestler.
 */
export async function searchWebForWrestler(
  name: string,
  hint?: string | null,
  options: { timeoutMs?: number; focus?: "results" | "background" } = {},
): Promise<WebWrestlerFindings | null> {
  if (!webSearchEnabled()) return null
  const wrestler = String(name ?? "").trim()
  if (wrestler.length < 3) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000)
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        /*
         * Background runs on the larger model. Asked about Cayden Clark, gpt-4o-mini returned a
         * graduation year of 2026 and a 52-9 season with one source; gpt-4o returned the freshman
         * year, 39-7 and Freshman of the Year, each cited. School and class are the whole point
         * of the background block, so the cheaper model is not a saving there.
         */
        model:
          options.focus === "background"
            ? process.env.DATA_DAWG_WEB_BACKGROUND_MODEL || "gpt-4o"
            : process.env.DATA_DAWG_WEB_SEARCH_MODEL || "gpt-4o-mini",
        tools: [{ type: "web_search" }],
        input:
          options.focus === "background"
            ? /*
               * We already hold his brackets; this asks only for what brackets do not carry. Kept
               * to a short list so it reads as a footnote to our answer rather than a second one.
               */
              `High school wrestler ${wrestler}${hint ? ` (${hint})` : ""}. ` +
              "In at most five short, flat bullets starting with '- ' give only what you can source: " +
              "his high school and city; graduation year, or his grade and the season it was stated " +
              "for; season record; honors and awards; region or district titles; and placements at " +
              "tournaments OTHER than his state tournament, NHSCA, Super 32, Fargo and Journeymen, " +
              "which we already hold and you must leave out. Do not guess, and do not work out a " +
              "graduation year that is not written down. Do not describe a different wrestler with " +
              "a similar name. No introduction, no assessment, no closing line, no nested bullets. " +
              "If you find nothing specific, say so in one line."
            : `High school wrestling results for ${wrestler}${hint ? ` (${hint})` : ""}. ` +
              "List only tournaments, weight classes, placements and years you can source, newest first, " +
              "plus school and graduation year if stated. Do not guess or infer a placement that is not " +
              "written down. If you find nothing specific, say so in one line.",
      }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { output?: Array<{ content?: Array<{ text?: string; annotations?: Array<{ url?: string }> }> }> }
    const parts = (body.output ?? []).flatMap((o) => o.content ?? [])
    const summary = parts
      .map((c) => c.text)
      .filter(Boolean)
      .join("\n")
      // The search tags every link it writes; the tag is noise in an answer.
      .replace(/[?&]utm_source=openai/g, "")
      // Inline citations repeat the source list that follows, at three times the length.
      .replace(/\s*\(\[[^\]]+\]\(https?:\/\/[^)]+\)\)/g, "")
      .replace(/^[•–]\s*/gm, "- ")
      .replace(/[ \t]+$/gm, "")
      .trim()
    if (!summary) return null
    const sources = [
      ...new Set(parts.flatMap((c) => c.annotations ?? []).map((a) => tidyUrl(a?.url)).filter((u): u is string => Boolean(u))),
    ].slice(0, 6)
    // An answer with nothing behind it is not usable: a coach cannot check it.
    if (!sources.length) return null
    return { summary, sources }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The flag, applied in code.
 *
 * The model writes the middle; the boundary around it is not its to decide. The heading says the
 * wrestler is not in our data and the sources are listed under it, so the reader can see what is
 * ours and what is not without reading carefully.
 */
export function frameWebAnswer(answer: string, sources: string[]): string {
  const body = String(answer ?? "").trim()
  const list = sources.map((u) => `- ${u}`).join("\n")
  return [
    "**Not in RecruitNC data — from the public web.** We hold no imported results for this wrestler, so the following is not ours and is not used in rankings or scouting reports.",
    "",
    body,
    sources.length ? `\n**Sources**\n${list}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim()
}

/**
 * Web background under an answer that is ours.
 *
 * Matt, 9 October 2026: ChatGPT's look-ups of Xavier Kovacs and Cayden Clark (Great Bridge, VA)
 * read better than ours, and on inspection not because of results - we held all three of Kovacs's
 * Virginia finishes where it found two, and Clark's title, NHSCA, Fargo and Journeymen bouts. What
 * it had was the school, the class, Freshman of the Year, a season record: things a bracket never
 * carries. So for a wrestler we hold results on but no profile, the web supplies that and only
 * that, underneath.
 *
 * Appended in code, after the model has finished, so the model never sees it: it cannot blend a
 * web claim into our results, and the reader sees a line between the two. The same search put
 * Clark 7th at Journeymen where we hold four losses, which is why the heading says which to trust.
 */
export function appendWebBackground(answer: string, web: WebWrestlerFindings | null): string {
  const body = String(answer ?? "").trim()
  const summary = String(web?.summary ?? "").trim()
  if (!web || !summary || !web.sources.length) return body
  return [
    body,
    "",
    "---",
    "**From the public web — not verified by RecruitNC.** Background we do not hold, such as school, class and honors. The results above are from brackets we imported; where the two differ, trust those.",
    "",
    summary,
    "",
    "**Sources**",
    web.sources.map((u) => `- ${u}`).join("\n"),
  ].join("\n")
}
