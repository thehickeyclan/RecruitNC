/**
 * Wraps each named wrestler in a link to his profile inside rendered HTML: whole names only, never
 * inside a tag or an existing link, longest names first so a longer name wins over one inside it.
 */
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function linkNames(html: string, links: Array<[name: string, href: string]>, className = ""): string {
  const sorted = [...links].sort((a, b) => b[0].length - a[0].length)
  let out = html
  for (const [name, href] of sorted) {
    const re = new RegExp(`(<a\\b[^>]*>[\\s\\S]*?</a>)|(<[^>]+>)|(?<![A-Za-z])(${escapeRe(name)})(?![A-Za-z])`, "g")
    out = out.replace(re, (m, a, tag, nm) => (a || tag ? m : `<a href="${href}"${className ? ` class="${className}"` : ""}>${nm}</a>`))
  }
  return out
}
