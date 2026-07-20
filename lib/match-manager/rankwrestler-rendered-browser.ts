import chromium from "@sparticuz/chromium"
import { chromium as playwrightChromium, type Browser, type BrowserContext, type Page } from "playwright-core"

export type RankWrestlerRenderedBrowserResult =
  | {
      ok: true
      seasonLabel?: string
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

export type RankWrestlerRenderedSeason = Extract<RankWrestlerRenderedBrowserResult, { ok: true }>
type RankWrestlerRenderedFailure = Extract<RankWrestlerRenderedBrowserResult, { ok: false }>

export type RankWrestlerRenderedAllSeasonsResult =
  | {
      ok: true
      seasons: RankWrestlerRenderedSeason[]
      usedLogin: boolean
      usedCookie: boolean
      discoveredSeasonLabels: string[]
      discoveredSeasonTargets: Array<{ label: string; href?: string }>
      failedSeasonTargets: Array<{ label: string; href?: string; error: string; preview?: string }>
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
        discoveredSeasonLabels?: string[]
        discoveredSeasonTargets?: Array<{ label: string; href?: string }>
      }
    }

type ManagedBrowser = {
  browser: Browser
  close: () => Promise<void>
}

type RankWrestlerAllSeasonOptions = {
  athleteName?: string | null
  highSchool?: string | null
}
type RankWrestlerSeasonNavigationResult = { ok: true } | { ok: false; error: string; preview?: string }

function isRankWrestlerRenderedFailure(result: RankWrestlerRenderedBrowserResult): result is RankWrestlerRenderedFailure {
  return result.ok === false
}

function isRankWrestlerSeasonNavigationFailure(
  result: RankWrestlerSeasonNavigationResult,
): result is Extract<RankWrestlerSeasonNavigationResult, { ok: false }> {
  return result.ok === false
}

function normalizedRankWrestlerCookieHeader(): string | null {
  const raw = process.env.RANKWRESTLER_COOKIE?.trim()
  if (!raw) return null
  return raw.includes("=") ? raw : `authToken=${raw}`
}

function cookieDomainsForUrl(url: string): string[] {
  const { hostname } = new URL(url)
  if (/(^|\.)rankwrestlers\.com$/i.test(hostname)) {
    return [hostname, ".rankwrestlers.com"]
  }
  if (/(^|\.)rankwrestler\.com$/i.test(hostname)) {
    return [hostname, ".rankwrestler.com"]
  }
  return [hostname]
}

function cookiesFromHeader(cookieHeader: string, url: string): Array<{ name: string; value: string; domain: string; path: string; secure: boolean; httpOnly: boolean }> {
  const domains = cookieDomainsForUrl(url)
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const eq = part.indexOf("=")
      const name = eq >= 0 ? part.slice(0, eq).trim() : "authToken"
      const value = eq >= 0 ? part.slice(eq + 1).trim() : part
      if (!name || !value) return []
      return domains.map((domain) => ({
        name,
        value,
        domain,
        path: "/",
        secure: true,
        httpOnly: false,
      }))
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

async function renderedPageDiagnostics(page: Page, usedLogin: boolean, usedCookie: boolean) {
  const text = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "")
  const htmlLength = await page.locator("html").evaluate((html) => html.outerHTML.length).catch(() => 0)
  const title = await page.title().catch(() => "")
  const finalUrl = page.url()
  return {
    title,
    finalUrl,
    textLength: text.length,
    htmlLength,
    preview: text.replace(/\s+/g, " ").trim().slice(0, 1200),
    usedLogin,
    usedCookie,
  }
}

async function waitForRankWrestlerMatchHistory(page: Page): Promise<boolean> {
  const deadline = Date.now() + 55_000
  let lastText = ""
  while (Date.now() < deadline) {
    const text = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")
    lastText = text
    if (looksLikeRankWrestlerMatchRows(text)) return true

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => undefined)
    await page.waitForTimeout(1_250)
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined)
    await page.waitForTimeout(1_250)
  }
  return looksLikeRankWrestlerMatchRows(lastText)
}

function looksLikeRankWrestlerMatchRows(text: string): boolean {
  return (
    (text.includes("Match History") && /\b(?:Win|Loss)\b/.test(text)) ||
    /\b(?:Win|Loss)\s+\d{1,2}\/\d{1,2}\/\d{2,4}\b/i.test(text)
  )
}

function seasonLabelsFromText(text: string): string[] {
  const seen = new Set<string>()
  for (const match of text.matchAll(/\b20\d{2}-\d{2}\b(?:\s+(?:Early Preseason|Last Season|Current Season))?/gi)) {
    const label = (match[0] ?? "").replace(/\s+/g, " ").trim()
    if (label) seen.add(label)
  }
  return [...seen]
}

function normalizeSeasonKey(value: string): string {
  return value.match(/\b20\d{2}-\d{2}\b/)?.[0] ?? value.replace(/\s+/g, " ").trim()
}

function normalizedSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function seasonStartYearFromLabel(label: string): string | null {
  return normalizeSeasonKey(label).match(/^20\d{2}/)?.[0] ?? null
}

export function rankWrestlerSeasonUrl(currentUrl: string, seasonLabel: string): string | null {
  if (/early preseason/i.test(seasonLabel)) return null
  const seasonStartYear = seasonStartYearFromLabel(seasonLabel)
  if (!seasonStartYear) return null

  try {
    const targetUrl = new URL(currentUrl)
    targetUrl.searchParams.set("season", seasonStartYear)
    return targetUrl.toString()
  } catch {
    return null
  }
}

function rankWrestlerArchiveSearchUrl(currentUrl: string, seasonLabel: string): string | null {
  const seasonStartYear = seasonStartYearFromLabel(seasonLabel)
  if (!seasonStartYear) return null

  try {
    const targetUrl = new URL("/search", currentUrl)
    targetUrl.searchParams.set("season", seasonStartYear)
    return targetUrl.toString()
  } catch {
    return null
  }
}

function currentSeasonLabelFromText(text: string): string | undefined {
  const recordSeason = text.match(/\b(20\d{2}-\d{2})\s+Record\b/i)?.[1]
  if (recordSeason) return recordSeason
  const labels = seasonLabelsFromText(text)
  return labels.find((label) => /last season/i.test(label)) ?? labels.find((label) => !/early preseason/i.test(label)) ?? labels[0]
}

async function seasonTargetsFromPage(page: Page): Promise<Array<{ label: string; href?: string }>> {
  return page
    .evaluate(() => {
      const seasonPattern = /\b20\d{2}-\d{2}\b/
      const elements = [...document.querySelectorAll("button, a, [role='button'], [tabindex='0']")]
      return elements
        .map((element) => {
          const text = (element.textContent ?? "").replace(/\s+/g, " ").trim()
          const aria = element.getAttribute("aria-label")?.replace(/\s+/g, " ").trim() ?? ""
          const labelSource = text || aria
          const season = labelSource.match(seasonPattern)?.[0]
          const href = element instanceof HTMLAnchorElement ? element.href : undefined
          const previousSeasonLink =
            href && /\/wrestler\/\d+/i.test(href) && /\b(previous|last)\s+season\b/i.test(labelSource)
          if (!season && !previousSeasonLink) return null
          return {
            label: season ? labelSource : labelSource || "Previous season",
            href,
          }
        })
        .filter(Boolean)
    })
    .catch(() => []) as Promise<Array<{ label: string; href?: string }>>
}

async function pageCurrentSeasonKey(page: Page): Promise<string | null> {
  const text = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "")
  const seasonLabel = currentSeasonLabelFromText(text)
  return seasonLabel ? normalizeSeasonKey(seasonLabel) : null
}

function mergedSeasonTargets(
  currentUrl: string,
  discoveredSeasonLabels: string[],
  discoveredSeasonTargets: Array<{ label: string; href?: string }>,
  initialSeasonLabel: string,
): Array<{ label: string; href?: string; seasonUrl?: string }> {
  const targets = new Map<string, { label: string; href?: string; seasonUrl?: string }>()

  const addTarget = (target: { label: string; href?: string }) => {
    if (/early preseason/i.test(target.label)) return
    const seasonUrl = rankWrestlerSeasonUrl(currentUrl, target.label) ?? undefined
    const key = seasonUrl || target.href || normalizeSeasonKey(target.label)
    if (!key) return

    const existing = targets.get(key)
    targets.set(key, {
      label: existing?.label || target.label,
      href: target.href || existing?.href,
      seasonUrl: seasonUrl || existing?.seasonUrl,
    })
  }

  addTarget({ label: initialSeasonLabel })
  for (const label of historicalSeasonLabelsFromCurrent(initialSeasonLabel)) addTarget({ label })
  for (const label of discoveredSeasonLabels) addTarget({ label })
  for (const target of discoveredSeasonTargets) addTarget(target)

  return [...targets.values()]
}

export function historicalSeasonLabelsFromCurrent(currentSeasonLabel: string, seasonCount = 4): string[] {
  const currentStart = seasonStartYearFromLabel(currentSeasonLabel)
  if (!currentStart) return []

  const start = Number(currentStart)
  return Array.from({ length: seasonCount }, (_, index) => {
    const year = start - index
    return `${year}-${String(year + 1).slice(-2)}`
  })
}

function rankWrestlerSearchTerms(athleteName: string): string[] {
  const normalized = normalizedSearchText(athleteName)
  const parts = normalized.split(" ").filter(Boolean)
  const terms = new Set<string>()
  if (normalized) terms.add(normalized)
  if (parts.length >= 2) terms.add(`${parts[0]} ${parts[parts.length - 1]}`)
  if (parts.length) terms.add(parts[parts.length - 1])
  return [...terms]
}

async function findArchiveProfileViaSearch(
  page: Page,
  currentUrl: string,
  target: { label: string; href?: string; seasonUrl?: string },
  options: RankWrestlerAllSeasonOptions,
): Promise<RankWrestlerSeasonNavigationResult> {
  const athleteName = options.athleteName?.trim()
  if (!athleteName) return { ok: false, error: "No athlete name available for RankWrestler archive search." }

  const searchUrl = rankWrestlerArchiveSearchUrl(currentUrl, target.label)
  if (!searchUrl) return { ok: false, error: "Could not build RankWrestler archive search URL for this season." }

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45_000 })
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => null)

  const searchInput = page.locator('input[placeholder*="Search wrestlers" i], input[type="search"], input[type="text"]').first()
  if ((await searchInput.count().catch(() => 0)) === 0) {
    const preview = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "")
    return {
      ok: false,
      error: "RankWrestler archive search opened, but no wrestler search box was found.",
      preview: preview.replace(/\s+/g, " ").trim().slice(0, 500),
    }
  }

  const expectedName = normalizedSearchText(athleteName)
  const expectedSchool = normalizedSearchText(options.highSchool)
  let latestPreview = ""

  for (const term of rankWrestlerSearchTerms(athleteName)) {
    await searchInput.fill(term, { timeout: 5_000 })
    await page.waitForTimeout(2_000)

    const resultIndex = await page
      .evaluate(
        ({ expectedName, expectedSchool }) => {
          const normalize = (value: string) =>
            value
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .replace(/\s+/g, " ")
              .trim()
          const results = [...document.querySelectorAll('[data-search-result="true"]')]
          return results.findIndex((element) => {
            const text = normalize(element.textContent ?? "")
            if (!text.includes(expectedName)) return false
            if (expectedSchool && !text.includes(expectedSchool)) return false
            return true
          })
        },
        { expectedName, expectedSchool },
      )
      .catch(() => -1)

    latestPreview = await page
      .locator("body")
      .innerText({ timeout: 10_000 })
      .then((text) => text.replace(/\s+/g, " ").trim().slice(0, 500))
      .catch(() => "")

    if (resultIndex >= 0) {
      const result = page.locator('[data-search-result="true"]').nth(resultIndex)
      await result.click({ timeout: 5_000 })
      await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => null)
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => null)
      await page.waitForTimeout(1_000)
      if (/\/wrestler\/\d+/i.test(page.url())) return { ok: true }
      return {
        ok: false,
        error: "RankWrestler archive search result was clicked, but it did not open a wrestler profile.",
        preview: latestPreview,
      }
    }
  }

  return {
    ok: false,
    error: `RankWrestler archive search did not find ${athleteName} for ${normalizeSeasonKey(target.label)}.`,
    preview: latestPreview,
  }
}

async function clickSeasonLabel(page: Page, label: string): Promise<boolean> {
  const exact = page
    .locator("button, a, [role='button'], [tabindex='0']")
    .filter({ hasText: label })
    .first()
  if ((await exact.count().catch(() => 0)) > 0) {
    return exact
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
  }

  const seasonKey = normalizeSeasonKey(label)
  const control = page
    .locator("button, a, [role='button'], [tabindex='0']")
    .filter({ hasText: seasonKey })
    .first()
  if ((await control.count().catch(() => 0)) > 0) {
    return control
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
  }

  return false
}

async function navigateOrClickSeasonTarget(
  page: Page,
  target: { label: string; href?: string; seasonUrl?: string },
  currentUrl: string,
  options: RankWrestlerAllSeasonOptions,
): Promise<RankWrestlerSeasonNavigationResult> {
  const targetSeasonKey = normalizeSeasonKey(target.label)
  const seasonUrl = target.seasonUrl || rankWrestlerSeasonUrl(currentUrl, target.label)
  if (seasonUrl && seasonUrl !== page.url()) {
    await page.goto(seasonUrl, { waitUntil: "domcontentloaded", timeout: 45_000 })
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => null)
    await page.waitForTimeout(1_000)
    if ((await pageCurrentSeasonKey(page)) === targetSeasonKey) return { ok: true }

    const archiveResult = await findArchiveProfileViaSearch(page, currentUrl, target, options)
    if (archiveResult.ok) return archiveResult
    if (!isRankWrestlerSeasonNavigationFailure(archiveResult)) return archiveResult

    return {
      ok: false,
      error: `RankWrestler opened ${seasonUrl}, but rendered ${await pageCurrentSeasonKey(page)} instead of ${targetSeasonKey}. ${archiveResult.error}`,
      preview: archiveResult.preview,
    }
  }

  if (target.href && target.href !== currentUrl) {
    await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 45_000 })
    return { ok: true }
  }

  const beforeText = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "")
  const beforeUrl = page.url()
  const clicked = await clickSeasonLabel(page, target.label)
  if (clicked) {
    const changed = await page
      .waitForFunction(
        ({ previousText, previousUrl }) =>
          window.location.href !== previousUrl || (document.body.innerText || "") !== previousText,
        { previousText: beforeText, previousUrl: beforeUrl },
        { timeout: 8_000 },
    )
      .then(() => true)
      .catch(() => false)
    if (changed && (await pageCurrentSeasonKey(page)) === targetSeasonKey) return { ok: true }
  }

  const archiveResult = await findArchiveProfileViaSearch(page, currentUrl, target, options)
  if (archiveResult.ok) return archiveResult
  if (!isRankWrestlerSeasonNavigationFailure(archiveResult)) return archiveResult

  return {
    ok: false,
    error: `Could not activate the RankWrestler season control for ${targetSeasonKey}. ${archiveResult.error}`,
    preview: archiveResult.preview,
  }
}

async function renderedSuccessFromPage(
  page: Page,
  usedLogin: boolean,
  usedCookie: boolean,
  seasonLabel?: string,
): Promise<RankWrestlerRenderedBrowserResult> {
  const matchHistoryFound = await waitForRankWrestlerMatchHistory(page)
  const text = await page.locator("body").innerText({ timeout: 10_000 })
  const htmlLength = await page.locator("html").evaluate((html) => html.outerHTML.length)
  const title = await page.title()
  const finalUrl = page.url()
  if (!matchHistoryFound) {
    return {
      ok: false,
      status: 422,
      error: "RankWrestler rendered, but the Match History rows did not appear.",
      hint:
        "The browser reached RankWrestler, but the visible page did not include Match History rows. Check whether the RankWrestler cookie/account can view this wrestler, or try opening the exact URL in a private browser while logged in.",
      diagnostics: {
        title,
        finalUrl,
        textLength: text.length,
        htmlLength,
        preview: text.replace(/\s+/g, " ").trim().slice(0, 1200),
        usedLogin,
        usedCookie,
      },
    }
  }
  return {
    ok: true,
    seasonLabel,
    text,
    htmlLength,
    title,
    finalUrl,
    usedLogin,
    usedCookie,
    matchHistoryFound: true,
  }
}

function rankWrestlerRenderedUserAgent(): string {
  return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 RecruitNC-RankWrestler-Sync/1.0"
}

export async function renderRankWrestlerProfileText(url: string): Promise<RankWrestlerRenderedBrowserResult> {
  let managed: ManagedBrowser | null = null
  let page: Page | null = null
  let usedLogin = false
  let usedCookie = false
  try {
    managed = await launchRankWrestlerBrowser()
    const context = await managed.browser.newContext({
      userAgent: rankWrestlerRenderedUserAgent(),
      viewport: { width: 1440, height: 1600 },
    })
    usedCookie = await addRankWrestlerCookie(context, url)
    page = await context.newPage()

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 })
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null)

    usedLogin = await loginIfNeeded(page)
    if (usedLogin) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 })
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null)
    }

    const result = await renderedSuccessFromPage(page, usedLogin, usedCookie)
    await context.close()
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "RankWrestler rendered-browser sync failed."
    const diagnostics = page ? await renderedPageDiagnostics(page, usedLogin, usedCookie).catch(() => undefined) : undefined
    return {
      ok: false,
      status: /not configured|add RANKWRESTLER|login page/i.test(message) ? 412 : 500,
      error: message,
      hint:
        diagnostics?.textLength
          ? "RankWrestler loaded in the browser, but the expected match list did not become available. Review the diagnostics preview to see whether it rendered login, member home, an access screen, or an unexpected layout."
          : "Rendered browser sync needs either a valid RANKWRESTLER_COOKIE or RANKWRESTLER_EMAIL/RANKWRESTLER_PASSWORD. If Vercel cannot launch Chromium, configure RANKWRESTLER_BROWSER_WS_URL with a Browserless/remote Chrome endpoint.",
      diagnostics,
    }
  } finally {
    await managed?.close().catch(() => undefined)
  }
}

export async function renderRankWrestlerAllSeasonTexts(
  url: string,
  options: RankWrestlerAllSeasonOptions = {},
): Promise<RankWrestlerRenderedAllSeasonsResult> {
  let managed: ManagedBrowser | null = null
  let page: Page | null = null
  let usedLogin = false
  let usedCookie = false
  const discoveredSeasonLabels: string[] = []
  const discoveredSeasonTargets: Array<{ label: string; href?: string }> = []
  const failedSeasonTargets: Array<{ label: string; href?: string; error: string; preview?: string }> = []
  try {
    managed = await launchRankWrestlerBrowser()
    const context = await managed.browser.newContext({
      userAgent: rankWrestlerRenderedUserAgent(),
      viewport: { width: 1440, height: 1600 },
    })
    usedCookie = await addRankWrestlerCookie(context, url)
    page = await context.newPage()

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 })
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null)

    usedLogin = await loginIfNeeded(page)
    if (usedLogin) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 })
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null)
    }

    await waitForRankWrestlerMatchHistory(page)
    const initialText = await page.locator("body").innerText({ timeout: 10_000 })
    discoveredSeasonLabels.push(...seasonLabelsFromText(initialText))
    discoveredSeasonTargets.push(...(await seasonTargetsFromPage(page)))

    const initialSeasonLabel = currentSeasonLabelFromText(initialText) ?? "Current season"
    const seasonTargets = mergedSeasonTargets(url, discoveredSeasonLabels, discoveredSeasonTargets, initialSeasonLabel)
    const seasons: RankWrestlerRenderedSeason[] = []
    const seenTargetKeys = new Set<string>()

    for (const target of seasonTargets) {
      const key = target.seasonUrl || target.href || normalizeSeasonKey(target.label)
      if (seenTargetKeys.has(key)) continue
      seenTargetKeys.add(key)

      if (key !== page.url()) {
        const changedSeason = await navigateOrClickSeasonTarget(page, target, url, options)
        if (isRankWrestlerSeasonNavigationFailure(changedSeason)) {
          failedSeasonTargets.push({
            label: target.label,
            href: target.href,
            error: changedSeason.error,
            preview: changedSeason.preview,
          })
          continue
        }
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => null)
        await page.waitForTimeout(1_000)
      }

      const rendered = await renderedSuccessFromPage(page, usedLogin, usedCookie, target.label)
      if (isRankWrestlerRenderedFailure(rendered)) {
        failedSeasonTargets.push({
          label: target.label,
          href: target.href,
          error: rendered.error,
          preview: rendered.diagnostics?.preview,
        })
      } else {
        seasons.push(rendered)
      }
    }

    await context.close()
    if (!seasons.length) {
      const diagnostics = page ? await renderedPageDiagnostics(page, usedLogin, usedCookie).catch(() => undefined) : undefined
      return {
        ok: false,
        status: 422,
        error: "RankWrestler rendered, but no season match rows could be parsed.",
        hint: "The profile loaded, but RecruitNC could not capture any visible season match lists.",
        diagnostics: { ...diagnostics, discoveredSeasonLabels, discoveredSeasonTargets },
      }
    }

    return {
      ok: true,
      seasons,
      usedLogin,
      usedCookie,
      discoveredSeasonLabels,
      discoveredSeasonTargets,
      failedSeasonTargets,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "RankWrestler all-season browser sync failed."
    const diagnostics = page ? await renderedPageDiagnostics(page, usedLogin, usedCookie).catch(() => undefined) : undefined
    return {
      ok: false,
      status: /not configured|add RANKWRESTLER|login page/i.test(message) ? 412 : 500,
      error: message,
      hint:
        diagnostics?.textLength
          ? "RankWrestler loaded in the browser, but RecruitNC could not walk the visible season controls. Review the diagnostics preview."
          : "All-season browser sync needs either a valid RANKWRESTLER_COOKIE or RANKWRESTLER_EMAIL/RANKWRESTLER_PASSWORD.",
      diagnostics: { ...diagnostics, discoveredSeasonLabels, discoveredSeasonTargets },
    }
  } finally {
    await managed?.close().catch(() => undefined)
  }
}
