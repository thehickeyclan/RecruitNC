import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Expo issues tokens in these two shapes; anything else is not a deliverable target. */
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/

type RegisterBody = {
  expoPushToken?: string
  platform?: string
  prefs?: { commits?: boolean; rankings?: boolean; events?: boolean }
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

    const { error } = await createAdminClient()
      .from("push_devices")
      .upsert(
        {
          expo_push_token: token,
          platform,
          alert_commits: prefs.commits !== false,
          alert_rankings: prefs.rankings === true,
          alert_events: prefs.events === true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "expo_push_token" },
      )

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
