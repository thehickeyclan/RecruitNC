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
      if (/^utm_|^ref$|^source$/i.test(p)) url.searchParams.delete(p)
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
  options: { timeoutMs?: number } = {},
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
        model: process.env.DATA_DAWG_WEB_SEARCH_MODEL || "gpt-4o-mini",
        tools: [{ type: "web_search" }],
        input:
          `High school wrestling results for ${wrestler}${hint ? ` (${hint})` : ""}. ` +
          "List only tournaments, weight classes, placements and years you can source, newest first, " +
          "plus school and graduation year if stated. Do not guess or infer a placement that is not " +
          "written down. If you find nothing specific, say so in one line.",
      }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { output?: Array<{ content?: Array<{ text?: string; annotations?: Array<{ url?: string }> }> }> }
    const parts = (body.output ?? []).flatMap((o) => o.content ?? [])
    const summary = parts.map((c) => c.text).filter(Boolean).join("\n").trim()
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
