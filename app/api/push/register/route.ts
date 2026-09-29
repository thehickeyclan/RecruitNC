import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Expo issues tokens in these two shapes; anything else is not a deliverable target. */
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/

type RegisterBody = {
  expoPushToken?: string
  platform?: string
  prefs?: {
    commits?: boolean
    rankings?: boolean
    events?: boolean
    toc?: boolean
    news?: boolean
    college?: boolean
    programViews?: boolean
  }
  /** The app signed out: this phone should stop receiving alerts meant for that account. */
  signedOut?: boolean
}

/**
 * The account this phone is signed in to, from the app's bearer token.
 *
 * Devices were anonymous - one row per Expo token and nothing else - which is fine for "every new
 * commit" and useless for "a college viewed your son's profile". A phone that registers while
 * signed in is now tied to that account; one that signs out is untied. A bad or expired token is
 * treated as no account rather than an error, so alerts that need no account keep working.
 */
async function accountFrom(request: Request, admin: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data.user?.id ?? null
}

/**
 * Device registration for app push. Devices are anonymous — the app has no accounts yet, so a
 * device row is keyed on its Expo token and alerts work without anyone signing up.
 *
 * This runs service-role rather than letting the app insert with the anon key, so push_devices
 * needs no publicly writable RLS policy and junk tokens are rejected before they reach the table.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as RegisterBody | null
    const token = body?.expoPushToken?.trim()

    if (!token || !EXPO_TOKEN.test(token)) {
      return NextResponse.json({ error: "A valid Expo push token is required." }, { status: 400 })
    }

    const platform = body?.platform === "android" ? "android" : "ios"
    const prefs = body?.prefs ?? {}

    const admin = createAdminClient()
    const userId = await accountFrom(request, admin)
    const base = {
      expo_push_token: token,
      platform,
      alert_commits: prefs.commits !== false,
      alert_rankings: prefs.rankings !== false,
      alert_events: prefs.events === true,
      last_seen_at: new Date().toISOString(),
    }
    // Defaults on, like commits — a TOC reveal is the reason many of these installs happened,
    // so only an explicit false turns it off.
    const withNew = {
      ...base,
      alert_toc: prefs.toc !== false,
      alert_news: prefs.news !== false,
      // Defaults on: a college reminder only ever concerns a team this device chose to follow.
      alert_college: prefs.college !== false,
    }
    // Linked to an account only when signed in; cleared on sign-out; otherwise left as it was.
    const withAccount: Record<string, unknown> = {
      ...withNew,
      alert_program_views: prefs.programViews !== false,
      ...(userId ? { user_id: userId } : body?.signedOut ? { user_id: null } : {}),
    }

    let { error } = await admin
      .from("push_devices")
      .upsert(withAccount, { onConflict: "expo_push_token" })

    // The account columns ship with program-view alerts and exist only once that SQL has run.
    if (error && (error.code === "42703" || /user_id|alert_program_views/.test(error.message ?? ""))) {
      console.warn("[push/register] push_devices account columns missing - run the program-view alert SQL")
      ;({ error } = await admin.from("push_devices").upsert(withNew, { onConflict: "expo_push_token" }))
    }

    // The alert_toc migration may not have run yet. A device that cannot register is a device
    // that gets no alerts at all, which is far worse than one missing TOC opt-in — so fall back
    // rather than making deploy order load-bearing.
    if (error && (error.code === "42703" || /alert_(toc|news|college)/.test(error.message ?? ""))) {
      console.warn("[push/register] an alert column is missing — run the push_devices alert migrations")
      ;({ error } = await admin.from("push_devices").upsert(base, { onConflict: "expo_push_token" }))
    }

    if (error) {
      console.error("[push/register]", error)
      return NextResponse.json({ error: "Could not save this device." }, { status: 500 })
    }

    return NextResponse.json({ success: true, linked: Boolean(userId) })
  } catch (error) {
    console.error("[push/register] unexpected", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
