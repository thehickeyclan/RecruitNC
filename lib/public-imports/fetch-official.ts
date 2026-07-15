/**
 * Allowlisted fetch for official public wrestling hosts (not Flo as SoR).
 */

const ALLOWED_BASE_HOSTS = [
  "nchsaa.org",
  "usawrestlingevents.com",
  "usabracketing.com",
  "trackwrestling.com",
  "themat.com",
]

export function assertOfficialImportHost(url: string): URL {
  const u = new URL(url)
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Only http(s) URLs allowed")
  }
  const host = u.hostname.toLowerCase()
  if (host.includes("flowrestling.org") || host.includes("floarena")) {
    throw new Error("FloWrestling hosts are never allowed as Fargo/official SoR fetch targets")
  }
  const allowed = ALLOWED_BASE_HOSTS.some(
    (base) => host === base || host === `www.${base}` || host.endsWith(`.${base}`),
  )
  if (!allowed) {
    throw new Error(
      `Fetch limited to official hosts (${ALLOWED_BASE_HOSTS.join(", ")}). Got: ${host}`,
    )
  }
  return u
}

export async function fetchOfficialUrl(url: string): Promise<{
  text: string
  contentType: string
  finalUrl: string
}> {
  assertOfficialImportHost(url)
  const res = await fetch(url, {
    headers: { "user-agent": "RecruitNC-FargoConnector/1.0" },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} for ${url}`)
  const text = await res.text()
  const contentType = res.headers.get("content-type") || ""
  return { text, contentType, finalUrl: res.url || url }
}

/** Detect USA Bracketing login walls / empty tournament shells. */
export function isUsaBracketingLoginWall(html: string): boolean {
  const t = html.toLowerCase()
  return (
    t.includes("all users must login") ||
    (t.includes("please login") && t.includes("password") && !t.includes('"matches"'))
  )
}
