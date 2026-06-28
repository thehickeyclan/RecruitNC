/**
 * Contract for wide tables on public athlete profiles (match data, etc.).
 * Do not bypass ProfileScrollTable in match-data-section-improved — see profile-table-scroll.test.ts.
 */
export const PROFILE_SCROLL_TABLE_ATTR = "data-profile-scroll-table"

/** Width constraint for flex parents so nested horizontal scroll works on iOS. */
export const PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS = "min-w-0 max-w-full w-full"

/** Card shell for match data — never overflow-hidden (clips touch scroll). */
export function profileMatchDataCardClass(isDark: boolean): string {
  return isDark
    ? `profile-card ${PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS} border-t-4 border-t-[#D3B574] border-white/10 bg-[#0f1c2e] shadow-none`
    : `${PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS} border-t-4 border-t-[#D3B574] shadow-md`
}

export type ProfileTableScrollSourceCheck = {
  label: string
  source: string
}

/** Static analysis guard used by regression tests. */
export function assertProfileMatchDataScrollContract(checks: ProfileTableScrollSourceCheck[]): void {
  for (const { label, source } of checks) {
    if (!source.includes("ProfileScrollTable")) {
      throw new Error(`${label}: must render wide tables via ProfileScrollTable`)
    }
    if (/<Table[\s>]/.test(source)) {
      throw new Error(`${label}: must not use shadcn Table (double scroll wrapper)`)
    }
    if (/cardClass[^\n]*overflow-hidden/.test(source)) {
      throw new Error(`${label}: match card must not use overflow-hidden`)
    }
  }
}

export function assertGlobalsProfileScrollCss(css: string): void {
  if (!css.includes(".scroll-table-x")) {
    throw new Error("globals.css must define .scroll-table-x")
  }
  if (!css.includes("touch-action: pan-x pan-y")) {
    throw new Error("globals.css must set touch-action: pan-x pan-y on scroll regions")
  }
  if (/table\s*\{[^}]*display:\s*block/.test(css)) {
    throw new Error("globals.css must not set table { display: block } (breaks mobile scroll)")
  }
  if (!css.includes(".profile-match-data")) {
    throw new Error("globals.css must include .profile-match-data scroll hardening")
  }
}
