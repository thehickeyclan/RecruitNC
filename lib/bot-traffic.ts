/**
 * Whether a request comes from a crawler, preview fetcher or script rather than a person.
 *
 * Analytics recorded them as anonymous visitors: in the fortnight to 29 September 2026, 562 events
 * came from Googlebot, Baiduspider, Bingbot, headless browsers and the like - 430 of them profile
 * views, inflating "Total views" and "Most viewed by everyone". None were signed in. Every endpoint
 * that writes `user_analytics` asks this first and records nothing for a bot.
 */
const BOT_UA =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|phantom|lighthouse|pingdom|uptime|monitor|python|curl\/|wget|axios|node-fetch|go-http|java\/|okhttp|scrapy|httpclient|semrush|ahrefs|mj12|petalbot|bytespider|gptbot|claudebot|ccbot|amazonbot|applebot|yandex|baidu|duckassist|vercel-screenshot/i

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  const ua = String(userAgent ?? "").trim()
  // Every real browser sends one; an empty user agent is a script.
  if (!ua) return true
  return BOT_UA.test(ua)
}

export function isBotRequest(request: Request): boolean {
  return isBotUserAgent(request.headers.get("user-agent"))
}
