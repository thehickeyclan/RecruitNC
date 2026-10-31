/**
 * Fetching a FloWrestling article, from our own servers.
 *
 * The public article page is a client-rendered shell: the commitment table is not in it, and
 * 667 KB of it came back with four occurrences of the word "commit", all of them in meta tags.
 * Flo's own mobile experience renders the article server-side at
 * api.flosports.tv/api/experiences/mobile/articles/<id>/html, which returns the full table as
 * plain HTML, needs no key and no session, and is what this reads.
 *
 * If that ever stops being true the job stops and says so. A list behind a login is not something
 * to work around and not something to hand back to a person to download by hand: it is a broken
 * source, and the run should fail loudly while the last snapshot stays untouched.
 */
export const FLO_ARTICLE_HTML = (articleId: string) =>
  `https://api.flosports.tv/api/experiences/mobile/articles/${articleId}/html`

export const FLO_ARTICLE_PAGE = (articleId: string, slug: string) =>
  `https://www.flowrestling.org/articles/${articleId}-${slug}`

export class FloSourceUnavailable extends Error {
  constructor(public readonly articleId: string, message: string) {
    super(`Flo article ${articleId}: ${message}`)
    this.name = "FloSourceUnavailable"
  }
}

const BLOCKED = /sign in to continue|please log in|subscribe to watch|access denied|are you a robot|verify you are human/i

export async function fetchFloArticleHtml(articleId: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  let response: Response
  try {
    response = await fetchImpl(FLO_ARTICLE_HTML(articleId), {
      headers: { accept: "text/html", "user-agent": "RecruitNC/1.0 (+https://www.ncunitedwrestling.com)" },
      cache: "no-store",
    })
  } catch (cause) {
    throw new FloSourceUnavailable(articleId, `the request failed (${(cause as Error)?.message ?? cause})`)
  }
  if (!response.ok) throw new FloSourceUnavailable(articleId, `HTTP ${response.status}`)
  const html = await response.text()
  if (html.length < 2000) throw new FloSourceUnavailable(articleId, `the response was ${html.length} bytes, too short to be an article`)
  if (!/<table/i.test(html)) {
    const blocked = html.match(BLOCKED)
    throw new FloSourceUnavailable(articleId, blocked ? `it now asks for a login ("${blocked[0]}")` : "it no longer contains a table")
  }
  return html
}
