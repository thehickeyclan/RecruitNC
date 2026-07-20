import chromium from "@sparticuz/chromium"
import { chromium as playwrightChromium, type Browser, type BrowserContext, type Page } from "playwright-core"

export type RankWrestlerRenderedBrowserResult =
  | {
      ok: true
      text: string
      htmlLength: number
      title: string
      finalUrl: string
      usedLogin: boolean
      usedCookie: boolean
      matchHistoryFound: boolean
    }
  | {
      ok: false
      status: number
      error: string
      hint?: string
      diagnostics?: {
        title?: string
        finalUrl?: string
        textLength?: number
        htmlLength?: number
        preview?: string
        usedLogin?: boolean
        usedCookie?: boolean
      }
    }

type ManagedBrowser = {
  browser: Browser
  close: () => Promise<void>
}

function rankWrestlerBaseUrl(): string {
  return "https://www.rankwrestlers.com"
}

function normalizedRankWrestlerCookieHeader(): string | null {
  const raw = process.env.RANKWRESTLER_COOKIE?.trim()
  if (!raw) return null
  return raw.includes("=") ? raw : `authToken=${raw}`
}

function cookiesFromHeader(cookieHeader: string, url: string): Array<{ name: string; value: string; domain: string; path: string; secure: boolean; httpOnly: boolean }> {
  const { hostname } = new URL(url)
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=")
      const name = eq >= 0 ? part.slice(0, eq).trim() : "authToken"
      const value = eq >= 0 ? part.slice(eq + 1).trim() : part
      return {
        name,
        value,
        domain: hostname,
        path: "/",
        secure: true,
        httpOnly: false,
      }
    })
    .filter((cookie) => cookie.name && cookie.value)
}

async function launchRankWrestlerBrowser(): Promise<ManagedBrowser> {
  const browserWsUrl = process.env.RANKWRESTLER_BROWSER_WS_URL?.trim() || process.env.BROWSERLESS_WS_URL?.trim()
  if (browserWsUrl) {
    const browser = await playwrightChromium.connectOverCDP(browserWsUrl)
    return { browser, close: () => browser.close() }
  }

  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
    process.env.CHROMIUM_EXECUTABLE_PATH?.trim() ||
    (await chromium.executablePath())

  const browser = await playwrightChromium.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  })
  return { browser, close: () => browser.close() }
}

async function addRankWrestlerCookie(context: BrowserContext, url: string): Promise<boolean> {
  const cookieHeader = normalizedRankWrestlerCookieHeader()
  if (!cookieHeader) return false
  const cookies = cookiesFromHeader(cookieHeader, url)
  if (!cookies.length) return false
  await context.addCookies(cookies)
  return true
}

async function fillFirst(page: Page, selectors: string, value: string): Promise<boolean> {
  const locator = page.locator(selectors).first()
  if ((await locator.count()) === 0) return false
  await locator.fill(value)
  return true
}

async function clickFirst(page: Page, selectors: string): Promise<boolean> {
  const locator = page.locator(selectors).first()
  if ((await locator.count()) === 0) return false
  await locator.click()
  return true
}

async function loginIfNeeded(page: Page): Promise<boolean> {
  const text = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "")
  const isLoginPage = /sign in|log in|password/i.test(text) || page.url().includes("/login")
  if (!isLoginPage) return false

  const email = process.env.RANKWRESTLER_EMAIL?.trim()
  const password = process.env.RANKWRESTLER_PASSWORD?.trim()
  if (!email || !password) {
    throw new Error(
      "RankWrestler browser automation reached the login page. Add RANKWRESTLER_EMAIL and RANKWRESTLER_PASSWORD, or provide a valid RANKWRESTLER_COOKIE.",
    )
  }

  await fillFirst(
    page,
    'input[type="email"], input[name="email"], input[name="username"], input[autocomplete="email"], input[placeholder*="email" i]',
    email,
  )
  await fillFirst(page, 'input[type="password"], input[name="password"], input[autocomplete="current-password"]', password)
  const clicked = await clickFirst(page, 'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")')
  if (!clicked) {
    throw new Error("RankWrestler login form was found, but no submit button could be clicked.")
  }

  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 }).catch(() => null)
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null)
  return true
}

function rankWrestlerRenderedUserAgent(): string {
  return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 RecruitNC-RankWrestler-Sync/1.0"
}

export async function renderRankWrestlerProfileText(url: string): Promise<RankWrestlerRenderedBrowserResult> {
  let managed: ManagedBrowser | null = null
  let usedLogin = false
  let usedCookie = false
  try {
    managed = await launchRankWrestlerBrowser()
    const context = await managed.browser.newContext({
      userAgent: rankWrestlerRenderedUserAgent(),
      viewport: { width: 1440, height: 1600 },
    })
    usedCookie = await addRankWrestlerCookie(context, rankWrestlerBaseUrl())
    const page = await context.newPage()

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 })
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null)

    usedLogin = await loginIfNeeded(page)
    if (usedLogin) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 })
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null)
    }

    await page.waitForFunction(
      () => {
        const body = document.body?.innerText ?? ""
        return body.includes("Match History") && /\b(?:Win|Loss)\b/.test(body)
      },
      { timeout: 45_000 },
    )

    const text = await page.locator("body").innerText({ timeout: 10_000 })
    const htmlLength = await page.locator("html").evaluate((html) => html.outerHTML.length)
    const title = await page.title()
    const finalUrl = page.url()
    await context.close()
    return {
      ok: true,
      text,
      htmlLength,
      title,
      finalUrl,
      usedLogin,
      usedCookie,
      matchHistoryFound: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "RankWrestler rendered-browser sync failed."
    return {
      ok: false,
      status: /not configured|add RANKWRESTLER|login page/i.test(message) ? 412 : 500,
      error: message,
      hint:
        "Rendered browser sync needs either a valid RANKWRESTLER_COOKIE or RANKWRESTLER_EMAIL/RANKWRESTLER_PASSWORD. If Vercel cannot launch Chromium, configure RANKWRESTLER_BROWSER_WS_URL with a Browserless/remote Chrome endpoint.",
    }
  } finally {
    await managed?.close().catch(() => undefined)
  }
}
