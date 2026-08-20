import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Expo issues tokens in these two shapes; anything else is not a deliverable target. */
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/

type RegisterBody = {
  expoPushToken?: string
  platform?: string
  prefs?: { commits?: boolean; rankings?: boolean; events?: boolean; toc?: boolean; news?: boolean }
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
    const withNew = { ...base, alert_toc: prefs.toc !== false, alert_news: prefs.news !== false }

    let { error } = await admin
      .from("push_devices")
      .upsert(withNew, { onConflict: "expo_push_token" })

    // The alert_toc migration may not have run yet. A device that cannot register is a device
    // that gets no alerts at all, which is far worse than one missing TOC opt-in — so fall back
    // rather than making deploy order load-bearing.
    if (error && (error.code === "42703" || /alert_(toc|news)/.test(error.message ?? ""))) {
      console.warn("[push/register] an alert column is missing — run the push_devices alert migrations")
      ;({ error } = await admin.from("push_devices").upsert(base, { onConflict: "expo_push_token" }))
    }

    if (error) {
      console.error("[push/register]", error)
      return NextResponse.json({ error: "Could not save this device." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push/register] unexpected", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
