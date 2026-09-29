/**
 * The fragment the app puts on /auth/app-handoff, and where the page may go afterwards.
 *
 * The token travels in the fragment, never the query string: a fragment is not sent to the
 * server, so it cannot land in Vercel's request logs or anybody's proxy.
 */
export type AppHandoff = { tokenHash: string; userId: string | null; next: string }

/**
 * Only a path on this site. `next` arrives in a URL anybody can construct, and without this the
 * page is an open redirect that signs someone in on the way past. "//evil.example" is a path to
 * a naive startsWith("/") check and a host to the browser, so it is refused too, as is a
 * backslash, which some browsers read as a slash.
 */
export function safeNextPath(next: string | null | undefined): string {
  const value = String(next ?? "").trim()
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  return value
}

export function parseAppHandoff(hash: string): AppHandoff | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""))
  const tokenHash = params.get("t")?.trim()
  if (!tokenHash) return null
  return { tokenHash, userId: params.get("u")?.trim() || null, next: safeNextPath(params.get("next")) }
}
