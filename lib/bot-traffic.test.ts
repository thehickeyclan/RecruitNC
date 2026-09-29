import { describe, expect, it } from "vitest"
import { isBotUserAgent } from "./bot-traffic"

describe("isBotUserAgent", () => {
  it("catches the crawlers seen in analytics", () => {
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Baiduspider-render/2.0; +http://www.baidu.com/search/spider.html)")).toBe(true)
    expect(isBotUserAgent("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)")).toBe(true)
    expect(isBotUserAgent("Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true)
    expect(isBotUserAgent("DuckAssistBot/1.2; (+http://duckduckgo.com/duckassistbot.html)")).toBe(true)
    expect(isBotUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/145.0.0.0 Safari/537.36")).toBe(true)
    expect(isBotUserAgent("")).toBe(true)
  })
  it("lets real browsers through", () => {
    expect(isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.2 Mobile/15E148 Safari/604.1")).toBe(false)
    expect(isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0")).toBe(false)
    expect(isBotUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15")).toBe(false)
  })
})
